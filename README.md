# 三维书屋 · 3D Bookroom

AI 沉浸式阅读伴侣 · OYSS × MiniMax Hackathon 2026

## 项目简介

AI 陪你读完每一本你想读但读不完的书。你的进度、画面、旋律，每一次阅读都不一样。

## 团队分工

- 成员 1：阅读器 UI + APP 框架 + token 系统 + 集成
- 成员 2：长上下文 RAG + 全书剧透标注 + 悬念队列状态机 + 进度感知逻辑
- 成员 3：图 / 视频 / 音乐 / 语音的生成 pipeline + 视觉风格设定
- 成员 4：交互设计 + 现场演示脚本 + 提交视频 + 故事打磨


## 技术栈

- Next.js 16 App Router · TypeScript **strict** · Tailwind CSS 4 · Framer Motion · Zustand · Lenis
- 服务端：Next.js Route Handlers · Mongoose · MongoDB Atlas
- UI：项目内 **`app/components/ui`**（如 `Card3D`）；**未**安装 Radix/shadcn 依赖包——若文档写「shadcn」请以 `package.json` 为准
- MiniMax · Vercel · PWA (`@ducanh2912/next-pwa`)

## 部署与协作权限

push 到 `main`，Vercel 自动构建部署（根目录暂无 `vercel.json`）。

**其他同学无法直接在 Vercel 上触发部署**：这是权限问题而非代码——请在 [Vercel Project → Settings → Team / Git]，或把队友加为 GitHub collaborator 并拥有同一 Team。代码整合完成后，任一能 push 到 `origin/main` 的成员都会触发同一套预览/生产流水线。

### 仓库里各成员的代码落在哪

| 成员 | 位置 / 分支 | 与 Next 前端的耦合 |
| --- | --- | --- |
| 成员 2 | `app/lib/ai/**` · `feature/member-2-ai-engine` 已并入 `main` | 前端通过 `useAppStore` + `ReaderShell` 阅读锚点驱动悬念队列 Local 引擎；（可选）远 MiniMax：`NEXT_PUBLIC_AI_PROVIDER=minimax` |
| 成员 3 | 根目录 `multimodel/`（Python，`update_multi` 已在 `main`） | **独立管线**：预处理/批量生成需在本地或后端跑脚本，再由成员 1 把产出 URL 写入 Mongo `generatedcontents` 或 CDN；`/api/generations` 等可继续对接 |
| 成员 4 | `demo-guide.md`、UI 文案与各页动效（随 `main`） | 无单独分支时需通过 PR 合入 |

详情见 **`docs/member-2-ai/README.md`**、`integration-guide.md`、`multimodel/README.md`。


## 数据库自检（MongoDB Atlas）

```bash
npm run db:seed   # 写入 `BOOKS[]` + 占位章节（EPUB stubs）+ demo persona
npm run db:ingest [--include-little-prince] [--orphans] [--publish-orphans]  # 解析 sample_book/*.epub → Mongo（默认跳过小王子）
npm run db:verify # catalogue / chapter / paragraph 对齐性 + 幽灵章节检测
npm run db:test   # seed + verify + prod build — 路演前跑一次
```

## 文档

- **`audit-report.md`** — 九层交付前审计（自动生成于 2026-05-19）
- **`integration-guide.md`** — 成员 2 / 3 接入清单与缺口路由
- **`demo-guide.md`** — 路演主路径 · Plan B/C
- `docs/ARCHITECTURE.md` — 架构说明
- `docs/API.md` — 接口约定 + 未完成路由表
- `docs/CONVENTIONS.md` — 代码规范
- `docs/SAMPLE_DATA.md` — Mongo 示例文档
