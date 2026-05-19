# 三维书屋 · 成员 2 / 成员 3 接入指南

适用于：长上下文 RAG + 悬念队列（成员 2）与多模态生成（成员 3）。**本仓库仍为 mock-first**；接上真实模型前请逐项对照 `audit-report.md` 里的 API gap。

---

## 1. 拉代码与环境

```bash
git checkout main && git pull
cp .env.example .env.local
```

在 `.env.local` 填入：

| 变量 | 谁需要 | 说明 |
| --- | --- | --- |
| `MONGODB_URI` | 全员 | Atlas 连接串 |
| `MONGODB_DB` | 全员 | 默认 `bookroom` |
| `MINIMAX_API_KEY`（及组织相关） | 2 / 3 | 网关凭证 |
| `NEXT_PUBLIC_APP_NAME` | 可选 | 默认「三维书屋」 |
| `NEXT_PUBLIC_USE_REAL_DB` | 前端联调 | `"true"` 时走 `/api/*` 适配器 |
| `NEXT_PUBLIC_DEMO_MODE` | Demo | `"true"` 启用导演托盘等 |

**不要将 `.env.local` 推送 git**（已由 `.gitignore` 屏蔽）。

---

## 2. 本地跑通 Mongo + Seed

```bash
npm install
npm run db:seed
npm run db:verify   # 可选：结构巡检
npm run dev
```

示例文档字段见：**`docs/SAMPLE_DATA.md`**。

---

## 3. 成员 2 · 接入点一览

### 已实现（可先联调数据结构）

| 能力 | 位置 / 路由 |
| --- | --- |
| 占位对话 POST | **`/api/chat`** → `app/api/chat/route.ts` |
| 悬念列表 GET | **`/api/pending`** |
| 到段是否释放 GET | **`/api/pending/check`** （`bookId` + `paragraphId`） |
| 剧透图谱读 | **`getLatestSpoilerMap`** · `spoilerMaps` model · 见 `docs/API.md` 文末 |
| 会话持久化 | `conversationRepository`，`after()` 延后写 Mongo |

### 当前仍为 Mock / 空缺（需你补）

| 项 | 期望 | 备注 |
| --- | --- | --- |
| `POST /api/chat` 回复 | SSE 或 `ReadableStream` 可选 | 现为单次 JSON Mock |
| **`POST /api/pending/release`** | 标记悬念已揭晓 | **路由缺失**，需在 `app/api/pending/...` 增加 |
| **`GET /api/books/[bookId]/spoiler-map`**（或等价） | 返回最新 `spoilerMaps` JSON | **路由缺失**，可把 repository 封装成 REST |

建议在 `route.ts` 内保持：`VALIDATION_ERROR` / `DATABASE_UNAVAILABLE` 等与 `docs/API.md` 一致。

---

## 4. 成员 3 · 接入点一览

### 已实现

| 能力 | 位置 |
| --- | --- |
| 列出用户生成草稿 | **`GET /api/generations`** |
| Schema | `generatedcontents`、`visualstyles`、`chapterassets` |

### Mock / 占位（UI 仍为本地状态）

阅读器长按菜单「生成画面 / 朗读」：**无独立 REST**，见 `GenerationWaiter` / `ImageGeneration` 顶部 `TODO(成员3)`。

建议新增路由（示例契约，文件名自定）：

- `POST /api/generations/image` — body: `{ bookId, paragraphId, prompt? }`，返回 `{ urls[], generationId }`
- （可选）`POST /api/generations/music`、`…/voice`、`…/video`

视觉圣经：`visualStyles` repository；章节资源位：`chapterAssets`。

---

## 5. `NEXT_PUBLIC_USE_REAL_DB`

1. `.env.local` 设 `NEXT_PUBLIC_USE_REAL_DB=true`，重启 dev server。
2. 在前端仅用 **`app/lib/data-source.ts`** 暴露的 adapters 拉书架/章节（勿在组件里手写 fetch 散落）。
3. 仍为 **404 / 错误** 时检查：Atlas IP 白名单、URI、集合是否已 seed。

---

## 6. 自测 checklist

- [ ] `curl` `POST /api/chat` 带 `bookId` + `message` 返回 JSON
- [ ] `GET /api/pending/check?...paragraphId=` 在无数据时为 `readyCount:0`
- [ ] `GET /api/generations` 返回 `{ data: [] }` 或已有草稿
- [ ] 阅读器中发消息：打开 Network 是否有（未来）到你的流式接口

完成后在 PR 描述里列出：**改的 route 文件、`Conversation`/`pendingquestions` schema 增量**。

---

## 7. 相关文档

- `docs/API.md` — 已实现路由与错误体
- `docs/ARCHITECTURE.md` — 数据流摘要
- `docs/SAMPLE_DATA.md` — 示例 BSON/JSON
