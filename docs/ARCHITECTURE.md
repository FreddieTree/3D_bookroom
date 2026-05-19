# 架构说明

## 运行时数据流（Atlas 就绪后）

客户端（PWA / Safari）在未开启 `NEXT_PUBLIC_USE_REAL_DB` 时继续使用 `app/lib/mock` + `sample-content`。当开关设为 `"true"` 时，可由 `app/lib/data-source.ts` 中的 adapters 切换到以下链路：

```
Client (fetch)
    → Route Handler (/app/api/*/route.ts)
        → await connectDB()  （单例 Mongoose，适配 Fast Refresh）
            → repositories（/app/lib/db/repositories/*.ts）
                → Models（/app/lib/db/models/*.ts）
                    → MongoDB Atlas（database = MONGODB_DB）
```

- **Seed**：`npm run db:seed` → 直接调用 `connectDB()` 与 mongoose models。
- **错误策略**：任一环节抛错将由 `databaseErrorResponse` 转成 `500 DATABASE_UNAVAILABLE`。

## Collection 拓扑

### 共享区（内容 / 策展）

| Mongoose Model | Collection（默认） | 说明 |
| --- | --- | --- |
| `Book` | `books` | 书目卡片、语言、字数统计 |
| `Chapter` | `chapters` | 章节正文、`paragraphs[]` |
| `SpoilerMap` | `spoilermaps` | paragraph 级 spoiler graph |
| `VisualStyle` | `visualstyles` | 画师 prompt / 调色板 |
| `ChapterAsset` | `chapterassets` | 章节衍生素材 stems |

### 用户区（行为 / 会话 / 计费）

| Model | Collection | 说明 |
| --- | --- | --- |
| `User` | `users` | 账户偏好、订阅、设备 |
| `ReadingProgress` | `readingprogresses` | `(userId+bookId)` 唯一光标 |
| `Conversation` | `conversations` | AI 会话 transcript |
| `PendingQuestion` | `pendingquestions` | 悬疑释放队列 |
| `GeneratedContent` | `generatedcontents` | MiniMax / 音视频产物 |
| `Bookmark` | `bookmarks` | 段落书签 |
| `UsageLog` | `usagelogs` | Prompt / Token 占位计量 |
| `CommunityShare` | `communityshares` | Demo 级别的分享瀑布流 |

### 脚手架提示

1. Atlas 必须把运行 IP（或 `0.0.0.0/0` 临时）写入 Network Allowlist；
2. 凭据仅存 `.env.local`，若泄露需在 Atlas Rotate password；
3. UI 暂不读 API —— Phase B 可把 `fetchBooksFromApi()` 并入 Zustand / SWR；

## Repo 目录快照

```
app/lib/db/
├── mongodb.ts              # connectDB()
├── seed.ts                 # Atlas demo import
├── http.ts                 # 统一 500 payload
├── models/                 # 13 份 schema
├── repositories/           # 数据访问门面
```

## 相关文档

- `docs/API.md` — 所有 REST endpoints 与 teammate 接入指南；
- MiniMax pipeline（成员 2/3）：先读 `conversation`/`pending`，再挂载生成服务。
