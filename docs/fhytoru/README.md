# fhytoru · Team Lead 完整交付

> 本目录是我（**fhytoru**）在 3D Bookroom 项目的完整工作快照（2026-05-24）。
> 包含融合后的可运行项目源码 + 运行指南 + Demo 路径。其他成员可直接 clone 这个分支跑起来验收。

---

## 目录结构

```
docs/fhytoru/
├── README.md          # 本文件
├── DEMO_GUIDE.md      # 演示路径 + 关键功能验证步骤
├── screenshots/       # Demo 关键截图（运行后可补充）
└── project/           # 完整可跑的 Next.js + Python pipeline 项目副本
```

---

## 一句话现状

把 Member 1（UI 设计层）、Member 2（AI 工程，**fhytoru**）、Member 3（多模态资源）三个分支的工作**全部融合并跑通**，构建零错误、长按段落 4 大菜单（生成画面 / 问 AI / 标记 / 广播剧）全部可用。

---

## 谁做了什么

| 成员 | 模块 | 关键产出 |
|------|------|----------|
| Member 1 | UI 设计层 | `app/globals.css` 802 行 OKLCH 设计系统、3D 书架（`ShelfBook3D`）、阅读器顶栏（`ReaderTopChrome`）、字体栈、平滑滚动 |
| Member 2 (fhytoru) | AI 工程 | MiniMax 网关 `/api/chat` 流式代理、`LocalAiProvider`（剧透判定 / retrieval / 模板）、`/api/generate-image`、`/api/generate-tts` |
| Member 3 | 多模态资源 | Python pipeline (`multimodel/`)：epub → 章节插图 + TTS 音频；`public/books/little-prince/` 31 章插图资源 |
| **fhytoru** (本人) | Team Lead 融合 | 解决 Turbopack panic / Jest worker crash / `"use client"` 误用 / 长按 select-text 冲突 / 书签持久化等问题；输出本快照 |

---

## 怎么跑（5 步）

> 系统：Windows 11 / macOS / Linux 都行。Node ≥ 20，Python ≥ 3.11（仅 multimodel/ pipeline 用）。

```bash
# 1. 进项目目录
cd docs/fhytoru/project

# 2. 配 env
cp .env.example .env.local
# 编辑 .env.local，填入你自己的 MiniMax key（详见 .env.example 注释）

# 3. 装依赖
npm install

# 4. 构建 + 跑生产服务器
npm run build
npm run start

# 5. 浏览器打开 http://localhost:3000
```

### ⚠️ 关键提示

- **不要用 `npm run dev`**。Next.js 16.2.6 在 Windows 上有 jest-worker child process crash 的 bug，dev 模式跑动态路由时会崩。**用 `npm run build && npm run start`**，生产模式完全稳定。
- `.env.local` 里 `MINIMAX_AUTH_TOKEN` 和 `MINIMAX_PAYGO_KEY` 是**同一个 key**，分两个变量是为了语义区分（聊天 vs 图像/TTS）。
- 章节 BGM 功能：MiniMax 音乐生成账户额度不足，已**跳过**。前端默认静音，无报错。

---

## 已实现功能（截至 2026-05-24）

### 阅读核心
- ✅ 首页 3D 书架、问候语、继续阅读卡片
- ✅ 书架页（library）、书籍详情、章节列表
- ✅ 阅读器（标准 / 沉浸双模式、字号 / 亮度 / 朗读速度调节）
- ✅ 阅读进度持久化（Zustand + localStorage）
- ✅ 章节封面页（每章一张插图 + 开场文案）
- ✅ 阅读地图（章节时间线 + 段落锚点）
- ✅ 完成页（情感曲线 + 好问题精选）

### AI 与多模态
- ✅ 长按段落弹出菜单（500ms / 右键也可触发）
- ✅ 🎨 **生成画面** — 调用 MiniMax Image-01，10-15s 出图
- ✅ 🤖 **问 AI** — `ChatDrawer` 流式对话，走 `/api/chat` → MiniMax
- ✅ 📌 **标记** — 段落书签 toggle（左侧主色竖线 + localStorage 持久化）
- ✅ 🎭 **广播剧朗读** — 引号段落多角色 TTS（`speech-2.8-hd`）
- ✅ AI 提供商可切换：`NEXT_PUBLIC_AI_PROVIDER=local | minimax`

### 系统
- ✅ PWA（安装、离线兜底页）
- ✅ 设置页（字号 / 亮度 / 主题 / 朗读速度等）
- ✅ 阅读进度按书隔离

---

## 已知限制

| 项 | 状况 | 影响 |
|----|------|------|
| 仅小王子有完整章节文本 | 其他 3 本（阿 Q 正传、乡村教师、伊凡·伊里奇之死）只有元数据 | 进入这 3 本会显示「本书暂无内嵌试读文本」，graceful fallback |
| 章节 BGM 资源缺失 | MiniMax 音乐生成账户余额不足，已跳过 | 章节封面无背景音，UI 正常 |
| 升级 / 支付按钮 | UI 完整，后端待对接 | 演示时**不要点**，会弹 mock alert |
| 阅读地图 / 完成页数据 | Demo mock data | 视觉完整，但情感曲线等不是从真实阅读行为计算的 |

---

## 项目结构速览

```
project/
├── app/                # Next.js 16 App Router
│   ├── api/            # /api/chat, /api/generate-image, /api/generate-tts
│   ├── book/           # 书籍 / 阅读 / 章节封面 / 地图 / 完成 路由
│   ├── components/     # UI 组件分层（layout / reader / chat / multimodal / ...）
│   ├── lib/            # data / stores / ai / hooks / utils
│   └── globals.css     # 802 行 OKLCH 设计系统
├── multimodel/         # Python pipeline（epub → 插图 + TTS）
├── public/             # PWA 图标、章节插图、TTS mp3
├── sample_book/        # epub 源文件（pipeline 输入）
├── next.config.ts      # PWA + viewTransition 配置
└── package.json
```

---

## 上传策略说明

为什么放在 `docs/fhytoru/project/` 而不是直接覆盖根目录：

- **不破坏 main 现有结构**。仓库根的 `app/`, `package.json` 等是团队约定，main 上正在进行其他 PR 流程
- **本目录是「team lead 快照」**，明确归属、不污染 main 主线
- 其他成员可在不影响自己工作分支的前提下，对照本快照验收 / 复制需要的部分
- 当团队决定正式合并时，可以从这里挑文件做 PR 到根目录

---

## 联系

有问题直接在仓库 issues 区开 issue，标题前缀 `[fhytoru-snapshot]`。
