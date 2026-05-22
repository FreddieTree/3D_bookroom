# 成员 2 · AI 工程 · 交接总入口

> **本文件是成员 2（AI 工程）在 3D Bookroom 项目的对外唯一入口。**
> 其他成员（成员 1/3/4）或接入新 LLM 供应商的人，**只读这一份就够**。
>
> 最近更新：2026-05-19 · Phase 1（本地引擎）+ Phase 2（MiniMax 远端真实接入）均已交付。
> lint / typecheck 三绿；浏览器端 curl 端到端验证流式回答通过。

---

## 1. 一句话现状

`app/lib/mock/chat.ts` 的"关键词 + 4 模板"已被 `app/lib/ai/LocalAiProvider` 替换为
**段落级精确剧透判定 + 12 主题概念 retrieval + 进度感知裁切 + 悬念队列状态机**；
`app/lib/ai/remote/MinimaxAiProvider` 通过 `app/api/chat/route.ts` 调用 Anthropic-compatible 网关
真实拉取 MiniMax 文本模型的流式回答（**剧透判定永远走本地**，远端失败自动 fallback 到本地引擎）。
所有 UI 组件零改动，env 切换 `NEXT_PUBLIC_AI_PROVIDER=local|minimax` 即可换实现。

---

## 2. 已交付清单

### 2.1 新建文件（13）

| 路径 | 一句话职责 |
|------|-----------|
| `app/lib/ai/types.ts` | `IAiProvider` / `AiContext` / `AiAnswer` / `Citation` / `SpoilerVerdict` 接口定义 |
| `app/lib/ai/provider.ts` | `getAiProvider()` 单例工厂 + `NEXT_PUBLIC_AI_PROVIDER` env 切换 |
| `app/lib/ai/mapNodes.ts` | `getAiMapNodes()` 静态种子 + 动态合并 |
| `app/lib/ai/local/index.ts` | `LocalAiProvider`（实现 `IAiProvider`） |
| `app/lib/ai/local/spoiler.ts` | `judgeSpoilerForBook()` 双层 entity→concept 判定 |
| `app/lib/ai/local/retrieval.ts` | `scanQuery()` / `scoreParagraphs()` / `topKParagraphs()` 无 embedding 检索 |
| `app/lib/ai/local/concepts.ts` | `pickPrimaryConcept()` / `pickTemplate()` / `pickTeaser()` 选材策略 |
| `app/lib/ai/local/compose.ts` | `composeAnswer()` 进度感知裁切 + 模板填充 + teaser |
| `app/lib/ai/local/stream.ts` | `streamChars()` 流式辅助 |
| `app/lib/ai/local/legacyAdapter.ts` | **临时**桥接老 mock 函数（MiniMax 接入后可删） |
| `app/lib/ai/data/schema.ts` | `PreprocessedBook` 类型 + `assertValidPreprocessedBook()` 校验 |
| `app/lib/ai/data/littlePrince.ts` | `littlePrince` 索引 + `hasReadThrough()` / `chapterNumberFromParagraphId()` 等工具 |
| `app/lib/ai/remote/minimaxProvider.ts` | `MinimaxAiProvider` 真实现：`judgeSpoiler` 走本地，`streamAsk` 调 `/api/chat` 拿网关流式回答 + 本地 citations，失败兜底本地 |
| `app/lib/data/preprocessed/little-prince.json` | 手工标注语料（详见 §6） |
| `app/api/chat/route.ts` | server route：把上游 Anthropic-compatible SSE 解析为 NDJSON，凭据 server-only |

### 2.2 修改文件（4）

| 文件 | 改动 |
|------|------|
| `app/lib/mock/chat.ts` | 整体重写为 thin facade：保留 `ChatMessage` / `PendingQuestion` 类型导出 + 旧函数名转发到 `legacyAdapter`；**逻辑 0 行** |
| `app/lib/stores/appStore.ts` | `sendChatMessage` / `releasePending` 改走 provider；`setReadingAnchor` 加悬念 sweep；persist `version: 2 + migrate` |
| `app/lib/mock/map-data.ts` | `getMapNodesForBook` 委派到 `getAiMapNodes`；签名加可选 `opts` 参数（向下兼容） |
| `.env.example` | 末尾追加 `NEXT_PUBLIC_AI_PROVIDER=local` 注释 |

### 2.3 一行接线（不属"改"）

`app/components/map/ReadingMapView.tsx`：`useMemo(() => getMapNodesForBook(...))` 处多消费 `chatMessages / pendingQuestions` 两个 store 字段（**数据接线，视觉零变化**）。

---

## 3. 稳定对外接口

> 这是其他成员**真正会调用**的部分。签名以 `app/lib/ai/types.ts` 为权威。

### 3.1 `getAiProvider()` 与 `IAiProvider`

```ts
// from app/lib/ai/provider.ts
function getAiProvider(): IAiProvider;            // 单例
function __resetAiProviderForTesting(): void;     // 测试用

// from app/lib/ai/types.ts
interface IAiProvider {
  readonly name: string;                          // "local" | "minimax"
  judgeSpoiler(text, ctx): SpoilerVerdict;        // 同步
  streamAsk(text, ctx, onToken): Promise<AiAnswer>; // 流式
  composeReleaseAnswer(pending, ctx): AiAnswer;   // 同步（揭晓不流式）
}

interface AiContext {
  bookId: string;
  chapterIndex: number;    // 0-based
  paragraphId: string | null;  // 用户当前 anchor，null = 未定位
}

interface SpoilerVerdict {
  kind: "ok" | "defer" | "soft-defer";
  revealAfterParagraphId?: string;   // v2 权威字段
  revealAfterChapter?: number;       // derived，给旧 UI
  matchedEntity?: string;            // 命中的 entity/concept id
  reason?: string;                   // 调试日志
  spoilerCopy?: string;              // 用户可见的入队提示
}

interface AiAnswer {
  text: string;
  citations: Citation[];             // 永远是数组（可能为空）
  conceptId?: string;
  teaser?: string;                   // 部分未读时的"卖关子"线索
}

interface Citation {
  paragraphId: string;
  snippet: string;                   // ≤ 60 字摘录
}
```

**契约**：`streamAsk` 仅在 `judgeSpoiler` 返回 `kind === "ok"` 时调用；store 已经实现这条约束，UI 不需要自己判定。

### 3.2 Store 字段（v2 新增）

#### `ChatMessage`（`app/lib/mock/chat.ts`）

```ts
interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  type: "normal" | "spoiler-blocked" | "pending-release";
  pendingId?: string;
  createdAt: number;
  isStreaming?: boolean;
  // —— v2 新增（可选） ——
  citations?: { paragraphId: string; snippet: string }[];  // 引用源
  conceptId?: string;                                       // 主概念 id
}
```

#### `PendingQuestion`（`app/lib/mock/chat.ts`）

```ts
interface PendingQuestion {
  id: string;
  userQuestion: string;
  paragraphId: string | null;
  revealAfterChapter: number;                  // v1 字段，保留供旧 UI 显示
  // —— v2 新增（可选） ——
  revealAfterParagraphId?: string;             // 权威释放点
  status?: "pending" | "ready";                // 状态机
  matchedEntity?: string;                      // 命中的 entity/concept id
}
```

**兼容承诺**：`revealAfterChapter` 字段永远存在且类型不变。`BookFinishedExperience.tsx:432` 仍读它，无需改。

#### Persist

`zustand persist` 已升级到 `version: 2`。v1 老数据加载时 `migrate` 自动补 `status = "pending"`；`revealAfterParagraphId` 缺省保持 undefined（sweep 会自然跳过，不误升级为 ready）。

### 3.3 `getMapNodesForBook(bookId, opts?)`（`app/lib/mock/map-data.ts`）

```ts
interface GetMapNodesOptions {
  chatMessages?: ChatMessage[];
  pendingQuestions?: PendingQuestion[];
  demoNow?: Date;        // 默认 MAP_DEMO_NOW
}

function getMapNodesForBook(bookId: string, opts?: GetMapNodesOptions): MapNode[];
```

旧调用 `getMapNodesForBook(bookId)` 仍可用（opts 全可选）。新调用传入 store 数据即可获得"用户痕迹 + 静态种子 + 多模态透传"合并后的节点列表，已按 `timestamp` 倒序。

---

## 4. 悬念队列状态机（精确行为）

### 4.1 三态语义（`SpoilerVerdict.kind`）

| kind | 含义 | 当前来源 |
|------|------|---------|
| `ok` | 可立即回答 | 《小王子》：无 entity/concept 命中，或命中的 reveal 点已读过；其它书：未命中关键词 |
| `defer` | 严格剧透，必须入队 | 《小王子》：命中实体/概念 + 未读到对应 `revealAfterParagraphId` |
| `soft-defer` | 弱剧透，仍入队但语气较软 | 非《小王子》fallback：命中 6 个老关键词 |

### 4.2 判定算法（`app/lib/ai/local/spoiler.ts`）

```
if bookId !== "little-prince":
    回退老关键词判定（命中 → soft-defer，否则 ok）

# 《小王子》分支：贪心匹配（长 alias / 长 label 优先）
for entity hit in question:
    if entity.revealAfterParagraphId 未读过 → return defer(matchedEntity=entity.id)
for concept hit in question:
    if concept.revealAfterParagraphId 未读过 → return defer(matchedEntity=concept.id)
return ok
```

`hasReadThrough(anchor, revealAfter)` 用 `paragraphOrderIndex` 做 O(1) 比较；anchor 为 `null` 时永远 false（用户未开始阅读 = 一切都是剧透）。

### 4.3 状态流转

```
            judgeSpoiler==defer
用户提问 ─────────────────────▶  PENDING ─┐
                                          │ setReadingAnchor sweep
                                          │ （anchor 跨过 revealAfter）
                                          ▼
                                        READY ─┐
                                                │ releasePending
                                                │ （点红点 / DirectorDock）
                                                ▼
                                              落入 chatMessages, 出队
```

**入队时初始 status**（`appStore.ts: sendChatMessage`）：

```ts
revealParagraph && hasReadThrough(ctx.paragraphId, revealParagraph)
  ? "ready"      // 已读过 → 立刻 ready（罕见，但需要兜底）
  : "pending"
```

**sweep 升级条件**（`appStore.ts: setReadingAnchor`，~ L190-207）：每次 anchor 推进时遍历队列，对每条 `status !== "ready" && hasReadThrough(新anchor, q.revealAfterParagraphId) === true` 的 pending，把 `status` 改为 `"ready"`。无变化时**保持引用稳定**避免无谓重渲染。

> **READY 状态当前不改 UI**：红点视觉与之前完全一致。成员 1 后续可独立基于 `q.status === "ready"` 升级红点/加提示条。

---

## 5. env 开关

```dotenv
# .env.example / .env.local
# AI provider 切换（成员 2）。默认 local：本地确定性引擎，零网络依赖。
# 切到 minimax 会启用 MinimaxAiProvider，走 /api/chat → 网关。
NEXT_PUBLIC_AI_PROVIDER=local

# server-only 凭据（严禁加 NEXT_PUBLIC_ 前缀）
# 注意：用 MINIMAX_ 前缀而不是 ANTHROPIC_，
# 以免被系统级 ANTHROPIC_* env（Claude Code 等 LLM CLI 常写）覆盖 .env.local。
MINIMAX_AUTH_TOKEN=
MINIMAX_BASE_URL=
MINIMAX_MODEL=
```

| 取值 | 行为 |
|------|------|
| 未设置 / `local` | `LocalAiProvider`，零网络 |
| `minimax` | `MinimaxAiProvider`，通过 `/api/chat` 调网关；网络/网关任一失败 → 自动退回 `LocalAiProvider`，demo 不挂 |

凭据的来源/可用模型/上游协议要点详见 §11。

---

## 6. 数据范围

### 6.1 《小王子》预处理产物 `app/lib/data/preprocessed/little-prince.json`

| 项 | 数量 |
|----|------|
| `paragraphOrder` | **32**（`p-c1-1` ~ `p-c3-11`，3 章） |
| `concepts` | **12** |
| `entities` | **13** |
| `spoilerCircles` | **3** |
| `mapSeeds` | **16** |

**Concept ids**：`childhood-imagination` · `sheep-in-box` · `rose-uniqueness` · `taming` · `responsibility` · `loneliness` · `star-as-laugh` · `baobab` · `six-planets-vanity` · `lamplighter-duty` · `fox-meeting` · `farewell-snake`

**Entity ids**：`narrator` · `little-prince` · `sheep` · `rose` · `fox` · `snake` · `baobab` · `king` · `vain-man` · `drunkard` · `businessman` · `lamplighter` · `geographer`

### 6.2 其它三本书的 fallback

`books.ts` 中 `isReady: false` 的三本（阿 Q / 乡村教师 / 伊凡之死）目前 UI 也不会进阅读流。即便强行进入，AI 入口走的是 legacy 路径：

- `LocalAiProvider.streamAsk`：`bookId !== "little-prince"` → 调 `legacyMockChatResponse`（旧 4 模板）
- `LocalAiProvider.composeReleaseAnswer`：同上，调 `legacyMockReleaseAnswer`
- `judgeSpoilerForBook`：调 `legacyShouldDeferAsSpoiler`（旧 6 关键词，返回 `soft-defer`）
- `getMapNodesForBook(bookId)`：非《小王子》直接返回 `[]`
- `MinimaxAiProvider`（启用 minimax 时）：`judgeSpoiler` 同样走本地 fallback；`streamAsk` 调网关，网关也能正常回答（不带 citations）

**结论**：demo 不退化；上架新书需要补一份新的预处理 JSON 即可，无需改代码。

---

## 7. 其他成员接入边界

### 7.1 可消费字段（建议升级方向）

| 字段 | 适合谁 | 用途建议 |
|------|--------|---------|
| `PendingQuestion.status === "ready"` | 成员 1 | `ReaderShell.tsx:448-461` 红点 → "脉动加强 + 文案改为'答案已就绪'" |
| `ChatMessage.citations[]` | 成员 1 | 气泡尾部加"出自 第 N 段"chip，点击跳回阅读位置 |
| `ChatMessage.conceptId` | 成员 1 / 4 | 显示"答案关于：驯养"等概念标签 |
| `PendingQuestion.matchedEntity` | 成员 1 / 4 | 红点 tooltip 提示"答案关于：玫瑰" |
| 阅读地图节点的 `pendingStatus === "ready"` | 成员 1 | 地图侧的高亮视觉 |

### 7.2 零改动承诺（这些组件本期一行不动）

- `app/components/reader/ReaderShell.tsx`
- `app/components/chat/ChatDrawer.tsx`
- `app/components/chat/VoiceRecorderOverlay.tsx`
- `app/components/book/BookFinishedExperience.tsx`
- `app/components/demo/DirectorDock.tsx`
- `app/components/multimodal/**`（成员 3 整片领地）
- `app/lib/mock/account-mock.ts` / `chapter-cover.ts` / `finished-celebration.ts`

**唯一例外**：`app/components/map/ReadingMapView.tsx` 在 `useMemo(() => getMapNodesForBook(...))` 处多消费 `chatMessages / pendingQuestions` 两个 store 字段——纯数据接线，**视觉零变化**。

### 7.3 字段所有权 / 不要踩雷

- `paragraphVisualsByBook` 与 `addParagraphVisual` / `removeParagraphVisual` ：归成员 3，我不动
- `mock/map-data.ts` 中 `RAW_NODES` 的 **bgm / image** 类节点：归成员 3，由 `mapNodes.ts` 透传，**不要删 RAW_NODES**
- `appStore` 的 `mockUser / mockTokenUsage / readerSettings / chatDrawerHeightPct / readerBgmBarCollapsed`：业务/UI 侧，我不动

---

## 8. 验证

### 8.1 构建三步

```bash
npm run lint           # ✅ 当前全过
npx tsc --noEmit       # ✅ 当前全过
npm run build          # ✅ Next.js 16 webpack + PWA service worker，~40s
```

### 8.2 端到端手动用例

打开《小王子》试读，按下表操作：

| # | 阅读位置（anchor） | 用户提问 | 期望行为 |
|---|---------------------|---------|----------|
| 1 | `p-c1-3` | "狐狸是谁？" | spoiler-blocked 入队，`status = pending`，文案点出"第 3 章揭晓" |
| 2 | 推进 anchor 到 `p-c3-9` | — | `pendingQuestions[0].status === "ready"`（红点视觉不变） |
| 3 | 点 ReaderShell 右上红点 | — | `pending-release` 卡片弹出，AI 给出引用 c3-8 / c3-9 的揭晓答 |
| 4 | `p-c2-5` | "驯养是什么意思" | spoiler-blocked，teaser 提示第 3 章揭晓 |
| 5 | `p-c3-9` | "驯养是什么意思" | OK，命中 `conceptId === "taming"`，citations 含 c2-4 / c3-8 / c3-9 |
| 6 | 任意 | "玫瑰是什么颜色的" | OK 或 defer 取决于当前 anchor 是否跨过 `p-c3-7`（rose 实体 reveal 点） |

进阅读地图：应能看到静态 character / theme 种子节点 + 动态 dialogue（来自 chatMessages 含 citations 的回答）+ pending 节点（含状态徽标）。

### 8.3 persist 迁移测试

```js
// 在浏览器 devtools console
localStorage.removeItem("sanweishuwu-app");           // ① 清缓存路径
location.reload();

localStorage.setItem("sanweishuwu-app", JSON.stringify({
  state: { pendingQuestions: [{ id:"x", userQuestion:"狐狸?", paragraphId:null, revealAfterChapter:3 }] },
  version: 1,
}));                                                   // ② 灌 v1 数据路径
location.reload();
// 期望：pendingQuestions[0].status 被 migrate 补成 "pending"，旧字段不丢
```

---

## 9. 当前不做事项（明确划清）

- ❌ **不写 epub 解析**（其它三本不上架，保留 fallback 即可）
- ❌ **不动 §7.2 列出的任何 UI 组件**
- ❌ **不动多模态组件 + `paragraphVisualsByBook`**（成员 3 领地）
- ❌ **不引入新 npm 依赖**
- ❌ **不补 `docs/API.md` / `docs/ARCHITECTURE.md` 等附属文档**（本 README 即唯一交接入口）

---

## 10. 已知限制 / 小坑

| 限制 | 影响 | 后续处理 |
|------|------|---------|
| 非《小王子》一切走 legacy（4 模板 + 关键词剧透） | demo 演示其它书时智能感由 LLM 自由发挥（不带 citations） | 上架新书时补一份新预处理 JSON |
| `app/lib/ai/local/legacyAdapter.ts` 是临时桥 | 现在仍承载 fallback 文案 + `streamChars` 实现 | 等所有书上预处理 JSON 后可删 |
| `app/lib/mock/chat.ts` 永久保留为 facade | 多个模块 import 这里的类型（含 `ChatDrawer.tsx` 等 UI 组件 + 我的 `types.ts` / `mapNodes.ts` / `appStore.ts` / `map-data.ts`），路径迁移成本高 | **不要试图删它**；逻辑已为 0，未来只保留类型 + 旧函数名转发即可 |
| `MinimaxAiProvider` 失败时静默 fallback 到本地 | 用户看不到「远端断了」的提示，只会发现风格突然变 | 后续可在 chat 抽屉加一个状态标记位 |
| `composeReleaseAnswer` 始终走本地 | 揭晓卡是同步接口、走不了流式；远端模式下也用本地模板回答 | 不准备改，揭晓卡的语义就是「确定性」 |
| `getMapNodesForBook` 第二参数是可选的 | 不传 opts 时 UI 不会显示用户痕迹/悬念节点 | 调用方（目前仅 `ReadingMapView`）需传 `chatMessages / pendingQuestions` |
| `PendingQuestion.revealAfterParagraphId` 是可选字段 | v1 老数据没有这个字段；sweep 会跳过 | 老用户在新版本里发的悬念问题会正常获得字段；老悬念不会被 sweep（保守不误升级） |
| 检索靠 n-gram + alias 命中 | 用户用同义近义词（如"驯化"vs"驯养"）若不在 `concepts.labels` 里会漏命中 | 补 `little-prince.json` 的 `labels[]` 即可，无需改代码 |

---

**疑问联系**：本人是项目「成员 2」。任何超出本 README 范围的接入需求请直接 ping 我，不要猜测内部行为。

---

## 11. MiniMax 接入实录（Phase 2 已交付）

> 2026-05-19 完成。接入对象：Anthropic Messages API 兼容网关（`v2.aicodee.com`），底层 MiniMax 文本模型。
> 与 Phase 1 的区别：`MinimaxAiProvider` 不再抛 NotImplemented；浏览器端真实拉到模型流式回答。
>
> 本章是"踩坑笔记"——给以后换网关 / 接别的 LLM 供应商 / 出现回归时的复用清单。

### 11.1 数据流（三层）

```
客户端 MinimaxAiProvider.streamAsk
  ↓ 本地 scanQuery / scoreParagraphs 选 citations + 主 concept
  ↓ fetch POST /api/chat（仅 system / messages）
server route /api/chat
  ↓ 转发到 ${MINIMAX_BASE_URL}/v1/messages，加 stream: true
upstream（Anthropic-compatible 网关）
  ↑ SSE：content_block_delta.delta.type === "text_delta" 才提取
client
  ← NDJSON 单流：{"type":"delta","text":…} / {"type":"done"} / {"type":"error",…}
  ← 拼成 AiAnswer.text + 本地 citations + conceptId
```

`judgeSpoiler` / `composeReleaseAnswer` **永远走本地**：剧透判定必须确定性（依赖 `revealAfterParagraphId`），揭晓卡是同步接口、无法走流式。

### 11.2 env 命名为什么用 `MINIMAX_*` 而不是 `ANTHROPIC_*`

**坑**：开发机常常已有系统级 `ANTHROPIC_AUTH_TOKEN / ANTHROPIC_BASE_URL`（Claude Code、其它 LLM CLI 都会写）。Next.js `.env.local` 优先级**低于**已存在的 `process.env`，于是 server route 把请求打到了别人家的网关，统一报 403 `Model not supported by your product plan`——错觉是「模型不可用」，实际是被劫持到了不同上游。

**规则**：本项目所有远端 LLM 凭据**不要**用 `ANTHROPIC_*` 前缀。当前用 `MINIMAX_*`；以后接其它供应商也应使用专属前缀。

排查方式：在 server route 里 `console.log` 出实际拿到的 `base` 字符串，跟 `.env.local` 对照即可立刻看穿。

### 11.3 上游协议要点

- 端点 `POST ${MINIMAX_BASE_URL}/v1/messages`
- 鉴权头：同时发 `x-api-key: <token>` + `Authorization: Bearer <token>`（不同网关认其中一个，全发最稳）
- 必带 `anthropic-version: 2023-06-01`
- 模型会输出 **thinking block**（`delta.type === "thinking_delta"`）+ **text block**（`delta.type === "text_delta"`）
  - server route **只 enqueue `text_delta`**，thinking 直接丢弃 → 客户端只看到最终答案
  - 必须把 `max_tokens` 设大（当前 4096）；否则 thinking 阶段就把额度耗光，text 段被截断到空字符串
- OpenAI 风格 chunk（`choices[0].delta.content`）也兜底支持了一行，应付别的兼容网关

### 11.4 模型可用性

不同 token 绑定的 product plan 支持的模型不同。检测顺序：

```bash
# 第一步：列出可见模型
curl -sS https://v2.aicodee.com/v1/models \
  -H "x-api-key: $MINIMAX_AUTH_TOKEN" \
  -H "anthropic-version: 2023-06-01"

# 第二步：逐个 POST /v1/messages 试一次，看是否 200
```

`/v1/models` 返回的是**可见**列表，不等于**可用**列表。本次实测：

| 模型 | 状态 |
|------|------|
| MiniMax-M2.1 | ✅ 可用 |
| MiniMax-M2.5 | ✅ 可用 |
| MiniMax-M2.5-highspeed | ✅ 可用（当前默认） |
| MiniMax-M2.7-highspeed | ❌ 403 `not supported by your product plan` |

### 11.5 为什么把上游 SSE 转成 NDJSON

server route 本可以原样转发 SSE，选了 NDJSON：

1. 凭据藏在 server，客户端只跟我们自己的 `/api/chat` 通信，bundle 不含 token
2. 单一事件格式（`type: delta|done|error`），客户端不必关心 Anthropic SSE 的 `message_start` / `content_block_start` / `content_block_delta` / `ping` 等十多种事件类型
3. 行分隔 + JSON.parse 比 `EventSource` 更容易处理 ReadableStream，且能 POST（EventSource 只能 GET）
4. 错误统一成 `{"type":"error","message":…}`，前端 `MinimaxAiProvider` catch 后退回 `LocalAiProvider`

### 11.6 实操坑（再次踩到时直接对照）

| # | 现象 | 根因 | 对策 |
|---|------|------|------|
| 1 | `route.ts` 改了，`console.log` 不出现 | Next 16 dev 不对 server route 做热替换 | 改 `route.ts` 或 `.env.local` 必须**完全重启** dev server |
| 2 | dev server "Ready" 但 `/book/.../read` 报 `Jest worker encountered 2 child process exceptions` | `.next/` 缓存损坏（Next 16 dev 会预渲染动态路由，worker 崩了） | `rm -rf .next/`，重启 |
| 3 | TaskStop / Ctrl-C 后新 server 仍报「Port 3000 in use」 | 旧 child 进程没被杀干净 | `Get-NetTCPConnection -LocalPort 3000` 拿 PID → `Stop-Process -Force` |
| 4 | curl 直接打 `/v1/messages` 200，走 `/api/chat` 502 | env 被 shell 全局变量覆盖 | 见 §11.2，统一 `MINIMAX_*` 前缀 |
| 5 | 第一条 curl 拿到 thinking 但无 text，`stop_reason=max_tokens` | `max_tokens` 太小 | 调到 4096 |

### 11.7 端到端验证脚本

```bash
# A. 直接打网关（确认凭据 + 模型 + 协议）
curl -sS https://v2.aicodee.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $MINIMAX_AUTH_TOKEN" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"MiniMax-M2.5-highspeed","max_tokens":2048,"stream":true,
       "messages":[{"role":"user","content":"hi"}]}'

# B. 打本地 server route（确认 .env.local 真生效 + NDJSON 解析正确）
curl -sS http://localhost:3000/api/chat \
  -H "content-type: application/json" \
  -d '{"messages":[{"role":"user","content":"hi"}]}'

# 期望 B 的输出：
#   {"type":"delta","text":"Hello! How can I help you today?"}
#   {"type":"done"}

# C. UI 端：浏览器 /book/little-prince/read，发问"主角的职业是什么"
#    本地引擎会因为词表不命中走 noHit fallback；MiniMax 模式会真正回答
#    （二者文案截然不同，可作快速肉眼判定）
```

### 11.8 切回本地引擎

`.env.local` 把 `NEXT_PUBLIC_AI_PROVIDER=minimax` 改成 `local`（或注释掉），重启 dev server。`MINIMAX_*` 三行可以留着，不会被读取。

### 11.9 文件清单（Phase 2 新增/改动）

| 路径 | 改动 |
|------|------|
| `app/api/chat/route.ts` | **新建**。POST 接 `{system, messages}`，转发 `${MINIMAX_BASE_URL}/v1/messages`（stream），SSE→NDJSON。仅吐 `text_delta`，跳过 thinking |
| `app/lib/ai/remote/minimaxProvider.ts` | **改写**：从 throw-only 占位 → 真实现。`judgeSpoiler` 复用本地；`streamAsk` 走 `/api/chat` + 本地 citations；任一失败 → `LocalAiProvider` |
| `.env.example` / `.env.local` | env 名从 `ANTHROPIC_*` 改为 `MINIMAX_*`，含说明注释 |
| `tsconfig.json` | `exclude` 加 `scripts/**/*`（避免 `.mts` 端到端脚本被 tsc 当源代码报错） |

### 11.10 下次怎么重启测试

> 适用场景：关机重开 / 换了终端 / 下次组会前想跑一遍冒烟测试。

**前置条件**

- `.env.local`（见 §11.2）已在本地，**不进 git**，内容：

  ```
  MINIMAX_AUTH_TOKEN=<你的新 token>
  MINIMAX_BASE_URL=https://v2.aicodee.com
  MINIMAX_MODEL=MiniMax-M2.5-highspeed
  NEXT_PUBLIC_AI_PROVIDER=minimax
  NEXT_PUBLIC_DEMO_MODE=true
  ```

- token 已轮换（首轮接入使用的临时 token 已废弃，不要复用）。

**Step 1 — 清缓存 + 启 dev server**

```powershell
cd 3D_bookroom
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npx next dev --webpack          # 必须加 --webpack，见 §11.6 坑 1
```

等终端出现 `✓ Ready on http://localhost:3000`。

**Step 2 — curl 冒烟（30 秒）**

```powershell
# 确认 /api/chat 读到正确 env + 模型可用
curl -sS http://localhost:3000/api/chat `
  -H "content-type: application/json" `
  -d '{"messages":[{"role":"user","content":"hi"}]}'
# 期望：{"type":"delta","text":"..."} ... {"type":"done"}
```

dev server 终端应同步打出 `[/api/chat] using model = MiniMax-M2.5-highspeed, base = https://v2.aicodee.com`。若没有这一行，说明 env 没生效——回 §11.2 / §11.6 复查。

**Step 3 — 浏览器 demo 路径（演示用）**

1. 打开 `http://localhost:3000/book/little-prince/read`
2. 点 AI 对话按钮，提问"小王子为什么离开他的星球？"
3. 应看到：流式打字 → 中文回答（2-4 句）→ 引用段落卡片
4. 若回答是本地兜底文案（如"这是个好问题…"），说明走了 fallback——检查终端 `[/api/chat]` 日志，无日志说明 env 未生效，重走 Step 1。

**Step 4 — 切回本地引擎**

`.env.local` 把 `NEXT_PUBLIC_AI_PROVIDER=minimax` 改成 `local`（或注释掉），重启 dev server。`MINIMAX_*` 三行可以留着，不会被读取。

## 12. 成员 2 视角：本阶段任务与诉求

> 写给组会用，方便与前端 / 后端同学快速对齐。本节是讨论稿，不是冻结约定。

### 我这边完成了什么

- **本地确定性引擎**：段落级剧透判定 + n-gram 检索 + 模板 composer，已支撑《小王子》完整 demo；无需网络。
- **MiniMax 真实接入**：`/api/chat` 薄代理 + `MinimaxAiProvider`，流式中文回答已跑通；任一环失败自动回退本地引擎，demo 不会现场挂掉。
- **剧透 / 悬念队列**：`judgeSpoiler` + `PendingQuestion` 状态机全部留在本地确定性层，LLM 只负责语言生成。这是为了组会上能可控演示"问到剧透 → 入队 → 越过释放点 → 揭晓"全链路。

### 本阶段的边界

- **只接了文本模型**：语音 / TTS / 图片生成本期不碰。
- **接口暂未冻结**：`/api/chat` 请求体、`PendingQuestion` 字段、SSE 事件格式都仍可在组会上调整，本周不视为稳定合约。
- **demo 优先**：能在组会现场走通"提问 → 流式回答 → citation 卡片"路径就达标，不追求极致性能或完整 edge case 覆盖。

### 组会演示路径

```
/book/little-prince/read
  → 点 AI 按钮
  → 提问"小王子为什么离开他的星球？"
  → 流式中文回答（2-4 句）
  → 引用段落卡片显示
```

操作细节见 §11.10。

### 对其他成员的诉求

- **前端**：`AiContext`（`bookId / paragraphId`）需要在用户滚动时实时更新；目前 demo 里是静态 anchor，组会后确认 anchor 更新频率与字段。
- **接口讨论**：周五组会请同步 `/api/chat` 是否要承接更多字段（如 `bookId` / `history` / `pendingQuestions`）；按讨论结果再改，改动量不大。
- **Token**：`.env.local` 里的 token 由各人本地管理，**不进 git**；要跑 minimax 模式的同学需自己拿一个 token 填进去。仓库里的代码默认 `NEXT_PUBLIC_AI_PROVIDER=local`，新人 clone 下来不配 env 也能跑本地 demo。

