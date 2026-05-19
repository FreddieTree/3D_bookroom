# API 接口约定

所有路由默认返回 JSON。**UI 仍为 mock**：把 `NEXT_PUBLIC_USE_REAL_DB` 设为 `"true"` 后，可由 `app/lib/data-source.ts` 中的示例方法切换到服务端数据。

## 环境与错误约定

| 变量 | 说明 |
| --- | --- |
| `MONGODB_URI` | Atlas 或其他 Mongo 连接字符串（仅存 `.env.local`） |
| `MONGODB_DB` | 数据库名（默认 `bookroom`） |
| `NEXT_PUBLIC_USE_REAL_DB` | `"true"` 时允许前端 adapters 读取 `/api/*` |
| `NEXT_PUBLIC_BACKGROUND_PROGRESS_SYNC` | `"true"` 时阅读器防抖 + sendBeacon（仅 `sample-content` 有正文的书），避免刷屏 |
| `NEXT_PUBLIC_PROGRESS_SYNC_DEBOUNCE_MS` | 防抖毫秒数（默认 9000） |

### UX 优先级说明

| 路由 | 行为 |
| --- | --- |
| `POST /api/chat` | MiniMax stub **先响应**；会话写入延后到 [`after()`](https://nextjs.org/docs/app/api-reference/functions/after)，降低首包耗时。 |
  

```json
{
  "error": "DATABASE_UNAVAILABLE",
  "message": "可读的错误说明（通常为英文异常 message 或兜底中文提示）"
}
```

演示用户（seed 写入）：`userId=demo-user-001`。未传 `userId` 的接口会退回该默认值（仅脚手架阶段）。

---

## `GET /api/books`

返回书架列表（Mongo `books`，按创建时间逆序）。

**响应示例**

```json
{
  "data": [
    {
      "bookId": "little-prince",
      "title": "小王子 · 共读演示",
      "titleEn": "The Little Prince (demo scaffold)",
      "language": "bilingual",
      "tags": ["经典"],
      "totalParagraphs": 32
    }
  ]
}
```

---

## `GET /api/books/{bookId}`

单册元数据。未找到：`404`。

```json
{
  "error": "BOOK_NOT_FOUND",
  "message": "未找到书目 little-prince"
}
```

---

## `GET /api/books/{bookId}/chapters/{index}`

`index` 为零基章节序号（字符串数字）。示例：`GET /api/books/little-prince/chapters/1` 读取第二章。

章节找不到：`404`。非法序号：`400`。

---

## `POST /api/chat`

占位对话入口（仍为 mock 回复）；会把用户气泡写入 Mongo `Conversation`（`topic=default`）以便成员 2 后续接入 MiniMax。

**请求体**

```json
{
  "userId": "demo-user-001",
  "bookId": "little-prince",
  "message": "玫瑰为什么需要玻璃罩？"
}
```

**响应**

```json
{
  "reply": "（Mock）成员 2 尚未接入 MiniMax：…",
  "type": "normal",
  "pendingId": "可选，占位"
}
```

`type` 取值：`normal` | `spoiler-blocked`。

---

## `GET /api/pending`

查询悬念队列条目。

查询参数：`userId`、`bookId?`、`limit?=25`。

```json
{ "data": [ { "_id": "...", "question": "…", "status": "queued" } ] }
```

---

## `GET /api/pending/check`

判断是否到达可释放段落（与 `pending.expectedReleaseParagraphId` **精确匹配**）。

查询参数：`userId`、`bookId`、`paragraphId`（必填）。

```json
{
  "paragraphId": "p-c1-10",
  "readyCount": 1,
  "data": [ { "...": "..." } ]
}
```

---

## `GET /api/progress`

拉取 `(userId, bookId)` 阅读进度快照。尚无记录：`404`。

---

## `POST /api/progress`

写入阅读指针。

**字段**

| 字段 | 说明 |
| --- | --- |
| `chapterIndex` | number，必填 |
| `paragraphId` | string，必填 |
| `deviceId` | optional |
| `percentComplete` | optional 0-100 |
| `mode` | `"update"`（默认，`syncVersion++`）或 `"sync"`（CAS） |
| `syncVersion` | `mode==="sync"` 时用于冲突检测 |

**冲突 (`409`，仅 sync 模式)**

```json
{
  "error": "SYNC_VERSION_CONFLICT",
  "message": "远端 syncVersion 更加新；…",
  "progress": { "...": "..." }
}
```

---

## `GET /api/generations`

分页列举用户生成的多媒体草稿（`generatedcontents`）。

查询参数：`userId`、`limit?=48`。

---

## `GET /api/community`

社区瀑布流占位数据。

查询参数：`featured?=0|1`（`1` 只取 `isFeatured`）、`limit?=40`。

```json
{ "featured": false, "data": [ { "slug": "…", "excerpt": "…" } ] }
```

---

## `GET /api/usage`

过去 N 天内 token-ish 粗略汇总（占位计量，真实计费仍以后端为准）。

查询参数：`userId`、`days?=7`。

```json
{
  "data": {
    "totals": { "prompt": 980, "completion": 180 },
    "horizonDays": 7,
    "samples": [ { "action": "chat.prompt", "tokenIn": 560 } ]
  }
}
```

---

## 成员 2 · 悬疑 / MiniMax / RAG 接入指南

1. **剧透图谱**：repository `getLatestSpoilerMap(bookId)`；按 `paragraphId` join 段落文本即可喂给上下文窗口或 guardrail。
2. **悬念**：`pendingRepository.addPending`、`checkReadyPendings` 已实现；需在 reader 翻到目标段时前端调用 `/api/pending/check`。
3. **会话持久化**：`conversationRepository.addMessage`，随后把 assistant 回填即可；可先扩展 `messages` schema 追加 `attachments`/`tool_calls` Mixed 字段。

## 成员 3 · 视效 / 音色 / stems 接入指南

1. **视觉圣经**：查询 `visualstyles` repository（可按 `bookId + isActive`）获得 prompt 模板。
2. **章节资产**：`chapterassets` 按 `(bookId, chapterIndex)` 对齐 `hero / ambience_loop / sfx_kit / narration_take` 槽位后写回 CDN URLs。
3. **生成草稿**：可先直写 Mongo `generatedcontents`，再由 `/api/generations` 验证 UI 占位。

---

### 一键验证（本地）

```bash
npm run dev
curl -s http://localhost:3000/api/books | jq .
curl -s "http://localhost:3000/api/books/little-prince/chapters/0" | jq .
curl -s -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"bookId":"little-prince","message":"你好"}' | jq .
```
