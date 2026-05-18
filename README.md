# 三维书屋

AI-powered reading companion · OYSS × MiniMax Hackathon 2026

## 项目简介

AI 陪你读完每一本你想读但读不完的书。你的进度、画面、旋律，每一次阅读都不一样。

## 团队分工

- 成员 1：阅读器 UI + APP 框架 + token 系统 + 集成
- 成员 2：长上下文 RAG + 全书剧透标注 + 悬念队列状态机 + 进度感知逻辑
- 成员 3：图 / 视频 / 音乐 / 语音的生成 pipeline + 视觉风格设定
- 成员 4：交互设计 + 现场演示脚本 + 提交视频 + 故事打磨


## 技术栈

- Next.js 16 + TypeScript + Tailwind CSS
- shadcn/ui + Framer Motion
- Zustand 状态管理
- Vercel 部署 + PWA
- MiniMax API（M2.5, Speech 2.6, Image-01, Music 2.6, Hailuo 02）

## 本地开发

\`\`\`bash
git clone https://github.com/FHY163valey/3D_bookroom.git
cd 3D_bookroom
npm install
npm run dev
\`\`\`

打开 http://localhost:3000

## 部署

push 到 main 分支，Vercel 自动部署。

## 文档

- docs/ARCHITECTURE.md - 架构说明
- docs/API.md - 接口约定
- docs/CONVENTIONS.md - 代码规范
