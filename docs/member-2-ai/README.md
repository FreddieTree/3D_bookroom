# 成员 2 · AI 工程 · 交接总入口

> **本文件是成员 2（AI 工程）在 3D Bookroom 项目的对外唯一入口。**
> 其他成员（成员 1/3/4）或未来接入 MiniMax 的人，**只读这一份就够**。
>
> 最近更新：2026-05-19 · Phase 1 全部 Step 已交付（lint / typecheck / `npm run build` 三绿）。

---

## 1. 一句话现状

`app/lib/mock/chat.ts` 的"关键词 + 4 模板"已被 `app/lib/ai/LocalAiProvider` 替换为
**段落级精确剧透判定 + 12 主题概念 retrieval + 进度感知裁切 + 悬念队列状态机**；
所有 UI 组件零改动，MiniMax 接入只需在 `app/lib/ai/remote/minimaxProvider.ts` 单文件落实。

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
| `app/lib/ai/remote/minimaxProvider.ts` | `MinimaxAiProvider` 占位（调用任意方法 throw NotImplemented） |
| `app/lib/data/preprocessed/little-prince.json` | 手工标注语料（详见 §6） |

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
# .env.example
# AI provider 切换（成员 2）。默认 local：使用本地确定性引擎，零网络依赖。
# 切到 minimax 时会启用远端占位类（当前抛 NotImplemented，Phase 2 接入）。
# NEXT_PUBLIC_AI_PROVIDER=local
```

| 取值 | 行为 |
|------|------|
| 未设置 / `local` | `LocalAiProvider`，零网络 |
| `minimax` | `MinimaxAiProvider`，**调用任意方法**才 throw（不在初始化时报错——切错 env 时 app 仍能启动） |

MiniMax 三个 server 端 key（`MINIMAX_API_KEY` / `MINIMAX_GROUP_ID` / `MINIMAX_TEXT_MODEL`）已在 `.env.example` 占位，本期不消费，**严禁加 `NEXT_PUBLIC_` 前缀**（会泄露到客户端 bundle）。

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

- ❌ **不接 MiniMax 远端**（占位文件除外）
- ❌ **不写 epub 解析**（其它三本不上架，保留 fallback 即可）
- ❌ **不动 §7.2 列出的任何 UI 组件**
- ❌ **不动多模态组件 + `paragraphVisualsByBook`**（成员 3 领地）
- ❌ **不引入新 npm 依赖**
- ❌ **不做 server route / `app/api/`**（本期纯客户端）
- ❌ **不补 `docs/API.md` / `docs/ARCHITECTURE.md` 等附属文档**（本 README 即唯一交接入口）

---

## 10. 已知限制 / 小坑

| 限制 | 影响 | 后续处理 |
|------|------|---------|
| 非《小王子》一切走 legacy（4 模板 + 关键词剧透） | demo 演示其它书时无智能感 | Phase 2 接 MiniMax 时一并解决 |
| `app/lib/ai/local/legacyAdapter.ts` 是临时桥 | 现在仍承载 fallback 文案 + `streamChars` 实现 | MiniMax 接入后可删，先留着不会出问题 |
| `app/lib/mock/chat.ts` 永久保留为 facade | 多个模块 import 这里的类型（含 `ChatDrawer.tsx` 等 UI 组件 + 我的 `types.ts` / `mapNodes.ts` / `appStore.ts` / `map-data.ts`），路径迁移成本高 | **不要试图删它**；逻辑已为 0，未来只保留类型 + 旧函数名转发即可 |
| `MinimaxAiProvider` 只在**调用时**才 throw | 切错 env 时 app 仍能启动，错误延迟到第一次点 AI 才暴露 | 这是有意的：避免 dev/build 报错阻塞别人；Phase 2 接入时改为真实现 |
| `getMapNodesForBook` 第二参数是可选的 | 不传 opts 时 UI 不会显示用户痕迹/悬念节点 | 调用方（目前仅 `ReadingMapView`）需传 `chatMessages / pendingQuestions` |
| `PendingQuestion.revealAfterParagraphId` 是可选字段 | v1 老数据没有这个字段；sweep 会跳过 | 老用户在新版本里发的悬念问题会正常获得字段；老悬念不会被 sweep（保守不误升级） |
| 检索靠 n-gram + alias 命中 | 用户用同义近义词（如"驯化"vs"驯养"）若不在 `concepts.labels` 里会漏命中 | 补 `little-prince.json` 的 `labels[]` 即可，无需改代码 |

---

**疑问联系**：本人是项目「成员 2」。任何超出本 README 范围的接入需求请直接 ping 我，不要猜测内部行为。
