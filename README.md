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


## 数据库自检（MongoDB Atlas）

```bash
npm run db:seed   # 写入 `BOOKS[]` + 占位章节（EPUB stubs）+ demo persona
npm run db:ingest [--include-little-prince] [--orphans] [--publish-orphans]  # 解析 sample_book/*.epub → Mongo（默认跳过小王子）
npm run db:verify # catalogue / chapter / paragraph 对齐性 + 幽灵章节检测
npm run db:test   # seed + verify + prod build — 路演前跑一次
```
