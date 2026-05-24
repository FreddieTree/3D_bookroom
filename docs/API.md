# API 接口约定

本文档定义成员 2（AI 工程）与前端阅读器之间的接口边界。当前目标是先支持《小王子》Demo，接口设计需要可迁移到其他书。

## 环境变量

服务端变量只允许在 Route Handler 和离线脚本中读取，不要暴露到客户端。

```env
# server-only。用 MINIMAX_ 前缀避免被系统级 ANTHROPIC_* env 覆盖。
MINIMAX_AUTH_TOKEN=
MINIMAX_BASE_URL=
MINIMAX_MODEL=

# 客户端可见。切换 AI provider。
NEXT_PUBLIC_AI_PROVIDER=local
NEXT_PUBLIC_DEMO_MODE=true
```

## 数据坐标

全项目统一使用段落级坐标：

```ts
type ReadingAnchor = {
  bookId: string;
  chapterIndex: number;
  paragraphId: string | null;
};
```

`chapterIndex` 从 `0` 开始。`paragraphId` 必须对应预处理产物或 `sample-content.ts` 中的段落 id。

## POST /api/chat

**当前实现**：薄代理。客户端 POST `{ system, messages, maxTokens? }`，server 转发到 `${MINIMAX_BASE_URL}/v1/messages` (stream)，上游 SSE 解析为 NDJSON 单流回客户端。凭据 server-only。

剧透判定 / citations / 概念路由都在客户端 `MinimaxAiProvider` 完成（复用 `LocalAiProvider` 的本地引擎），server route 只负责"调模型 + 流式中转"，**不**承担决策。下面 `ChatDecision` / 复杂 SSE 事件等结构是更长期目标（未实现），保留作演进参考。

### Request（实际）

```ts
type ChatRequest = {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;  // 默认 4096
};
```

### Response（实际）

`content-type: application/x-ndjson`。每行一条 JSON：

```txt
{"type":"delta","text":"…部分文字…"}
{"type":"delta","text":"…后续文字…"}
{"type":"done"}
```

错误：

```txt
{"type":"error","message":"…原因…"}
```

### Request（长期目标，未实现）

```ts
type ChatRequest = {
  bookId: string;
  chapterIndex: number;
  paragraphId: string | null;
  question: string;
  history: Array<{
    role: "user" | "ai";
    content: string;
    type?: "normal" | "spoiler-blocked" | "pending-release";
    createdAt?: number;
  }>;
  pendingQuestions?: PendingQuestion[];
};
```

### SSE Events

返回 `text/event-stream`。每个事件一行 JSON：

```txt
event: decision
data: {"canAnswerNow":false,"action":"defer","revealAfter":{"chapterIndex":2,"paragraphId":"p-c3-8"},"deferReason":"答案依赖狐狸讲述驯养之后的信息"}

event: token
data: {"delta":"这个问题后面会变得更清楚，"}

event: pending
data: {"id":"pq_xxx","status":"pending","userQuestion":"玫瑰为什么重要？","askedAt":{"bookId":"little-prince","chapterIndex":0,"paragraphId":"p-c1-7"},"revealAfter":{"chapterIndex":2,"paragraphId":"p-c3-8"},"safeTeaser":"先把它理解成一种被惦记的存在，我暂时不说破。"}

event: done
data: {"messageId":"ai_xxx","type":"spoiler-blocked"}
```

### Decision Schema

```ts
type ChatDecision = {
  canAnswerNow: boolean;
  action: "answer" | "partial" | "defer" | "release";
  revealAfter?: {
    chapterIndex: number;
    paragraphId: string;
  };
  deferReason?: string;
  allowedContextRange: {
    maxChapterIndex: number;
    maxParagraphId: string | null;
  };
};
```

规则：

- `answer`：答案完全来自已读范围，可以直接回答。
- `partial`：只回答已读部分，同时提示后文会继续展开。
- `defer`：答案依赖未读内容，必须加入悬念队列。
- `release`：用户已经越过释放点，可以揭晓之前的问题。

## POST /api/preprocess

离线/管理接口。Demo 阶段可以先不用 UI 调用，优先由脚本生成落盘 JSON。

### Request

```ts
type PreprocessRequest = {
  bookId: string;
  sourcePath?: string;
  force?: boolean;
};
```

### Response

```ts
type PreprocessResponse = {
  bookId: string;
  status: "queued" | "running" | "done" | "failed";
  outputPath?: string;
  error?: string;
};
```

## 预处理产物

落盘目录：

```txt
app/lib/data/preprocessed/<book-id>.json
```

### BookPreprocessFile

```ts
type BookPreprocessFile = {
  bookId: string;
  title: string;
  language: "zh" | "en" | "mixed";
  generatedAt: string;
  chapters: PreprocessedChapter[];
  spoilerRules: SpoilerRule[];
  ragChunks: RagChunk[];
  mapSeeds: MapSeedNode[];
};
```

### Chapter / Paragraph

```ts
type PreprocessedChapter = {
  id: string;
  index: number;
  title: string;
  summary: string;
  paragraphs: PreprocessedParagraph[];
};

type PreprocessedParagraph = {
  id: string;
  chapterIndex: number;
  paragraphIndex: number;
  text: string;
  summary: string;
  entities: string[];
  spoilerLevel: 0 | 1 | 2 | 3;
};
```

### SpoilerRule

```ts
type SpoilerRule = {
  id: string;
  bookId: string;
  questionPatterns: string[];
  topic: string;
  safeBefore: {
    chapterIndex: number;
    paragraphId: string;
  };
  revealAfter: {
    chapterIndex: number;
    paragraphId: string;
  };
  safeTeaser: string;
  revealSummary: string;
  evidenceParagraphIds: string[];
};
```

### RagChunk

```ts
type RagChunk = {
  id: string;
  bookId: string;
  chapterIndex: number;
  paragraphIds: string[];
  text: string;
  summary: string;
  keywords: string[];
  spoilerLevel: 0 | 1 | 2 | 3;
};
```

### MapSeedNode

```ts
type MapSeedNode = {
  id: string;
  paragraphId: string;
  chapterIndex: number;
  type: "character" | "bookmark" | "pending" | "bgm" | "image";
  title: string;
  preview: string;
};
```

## PendingQuestion

前端 store 中的悬念队列建议升级为：

```ts
type PendingQuestionStatus = "pending" | "ready" | "released" | "done";

type PendingQuestion = {
  id: string;
  bookId: string;
  userQuestion: string;
  askedAt: ReadingAnchor;
  revealAfter: {
    chapterIndex: number;
    paragraphId: string;
  };
  status: PendingQuestionStatus;
  safeTeaser: string;
  deferReason?: string;
  createdAt: number;
  releasedAt?: number;
};
```

状态流转：

```txt
pending -> ready -> released -> done
```

- `pending`：用户还没读到释放点。
- `ready`：`setReadingAnchor` 已越过 `revealAfter`，可以提示红点。
- `released`：用户点击红点或打开 AI，正在生成揭晓回答。
- `done`：揭晓回答已经进入聊天记录。

## 错误格式

非 SSE 接口使用：

```ts
type ApiError = {
  error: {
    code: string;
    message: string;
    detail?: unknown;
  };
};
```

SSE 中途失败：

```txt
event: error
data: {"code":"MINIMAX_UNAVAILABLE","message":"AI 暂时不可用，请稍后重试"}
```
