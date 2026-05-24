# Demo 演示路径

> 按以下顺序点，5 分钟跑完所有亮点功能。**先确保 server 在 `http://localhost:3000` 跑起来**。

---

## 0. 准备

```bash
cd docs/fhytoru/project
cp .env.example .env.local   # 填入 MiniMax key
npm install
npm run build && npm run start
```

打开 **`http://localhost:3000`**。

> 桌面浏览器建议开 DevTools 移动模式（iPhone 14, 390×844），整套 UI 是按 ≤430px 移动端设计的。

---

## 1. 首页（10 秒）

**看什么**：
- 顶部「三维书屋 · 沉浸式阅读伴侣」品牌区
- 时段问候（早上好 / 下午好 / 晚上好）
- **继续阅读**卡片（带封面 + 进度条）
- 我的书架 grid，4 本书的 3D 卡片悬浮效果

**亮点**：3D 卡片用 `app/components/ui/Card3D.tsx` 实现，鼠标 hover 有 perspective transform。

---

## 2. 书架页 `/library`（10 秒）

**点**：右上角 ⚙️ 图标旁的「查看全部」或顶栏书架图标

**看什么**：4 本书卡片列表，只有「小王子」`isReady: true`，可以点进去读。

---

## 3. 小王子书籍详情 `/book/little-prince`（15 秒）

**点**：小王子封面卡

**看什么**：
- 上方：封面 emoji + 标题 + 作者 + 简介
- 中间：章节目录（3 章可读 + 后续灰色标识）
- 下方：「开始阅读」按钮

---

## 4. 章节封面 `/book/little-prince/chapter/0/cover`（15 秒）

**点**：第 1 章「开始阅读」

**看什么**：
- 整屏 AI 插图（Member 3 用 Image-01 生成的章节插图）
- 开场文案（`app/lib/mock/chapter-cover.ts` 里的 tagline）
- 点击进入正文

> BGM 已跳过（账户额度不足），界面无音频控件。

---

## 5. 阅读器 `/book/little-prince/read`（核心，3 分钟）

### 5.1 基础阅读
- 滚动正文（Lenis 平滑滚动）
- 顶栏自动隐藏 / 显示（向下滚隐藏，向上滚显示）
- 底栏：阅读进度条 + AI 对话入口

### 5.2 阅读设置抽屉（10 秒）
**点**：右上角 ⚙️ 图标
- 字号（14 / 16 / 18 / 20 / 22）
- 亮度滑块
- 主题切换（light / dark / system）
- 朗读速度（0.8x ~ 1.5x）
- 阅读模式（标准 / 沉浸大字）

### 5.3 长按段落菜单（**核心亮点**，2 分钟）

**点**：任意段落按住 500ms（移动端长按）/ 桌面右键单击段落

弹出 4 个选项菜单：

#### 5.3.1 🎨 生成画面（15 秒）
- 点 → 等 10-15 秒（调用 MiniMax Image-01）
- 段落下方插入新生成的插图
- 图片可点开看大图

#### 5.3.2 🤖 问 AI（30 秒）
- 点 → 底部弹出 ChatDrawer
- 输入「这一段为什么用蟒蛇？」
- 看 AI 流式回答（`/api/chat` → MiniMax LLM）

> 注：当 `NEXT_PUBLIC_AI_PROVIDER=local` 时，走的是 `LocalAiProvider`（本地规则引擎，0 网络调用）；切到 `minimax` 走真实 LLM。

#### 5.3.3 📌 标记（10 秒）
- 点 → 段落左侧出现主色竖线（书签视觉标记）
- **刷新页面** → 书签仍在（localStorage 持久化）
- 再次长按该段落 → 菜单变成「📌 取消标记」，点击移除书签

#### 5.3.4 🎭 广播剧朗读（30 秒）
- **必须是含引号的段落**（如 p-c1-5：「他们回答我说："一顶帽子有什么可怕的？"」）
- 点 → 弹出广播剧模式，多角色配音播放
- 角色用 `speech-2.8-hd` 多 voice 区分（叙述者 vs 大人 vs 小王子）

---

## 6. 阅读地图 `/book/little-prince/map`（30 秒）

**点**：阅读器顶栏 🗺️ 图标

**看什么**：
- 章节时间线（28 节点）
- 已读节点高亮
- 段落锚点：点击跳转回阅读器对应段落
- 顶部 tab 筛选（全部 / 已读 / 书签 / 配图）

---

## 7. 阅读完成页 `/book/little-prince/finished`（仅最终章，30 秒）

读完最后一段会自动进入，或直接访问 URL。

**看什么**：
- 情感曲线图（mock data）
- 这本书带给你的 3 个好问题（精选）
- 「再读一次」/「回首页」按钮

---

## 8. 设置 `/settings`（20 秒）

**点**：首页右上角 ⚙️ 图标

**看什么**：
- 头像 + 昵称（mock）
- 订阅 tier 卡片（演示用，**不要点升级**，会弹 alert）
- 字号 / 亮度 / 主题 等核心设置（与阅读设置抽屉同步）
- Token 用量环形图（mock）

---

## 9. PWA 安装 `/install`（15 秒）

**看什么**：
- 移动 Safari：「分享 → 添加到主屏幕」引导
- 桌面 Chrome：「⊕ 安装」按钮

---

## 关键验证清单（演示后自测）

- [ ] 首页 3D 书架卡片可见、动画流畅
- [ ] 进入小王子阅读器无报错
- [ ] 长按段落弹出菜单（4 项齐全）
- [ ] 「📌 标记」点击后视觉变化 + reload 后仍在
- [ ] 「🎨 生成画面」能拿到真实 AI 图（耗时 10-15s）
- [ ] 「🤖 问 AI」能流式吐字
- [ ] 「🎭 广播剧朗读」能在含引号段落播放音频
- [ ] 阅读地图能跳转
- [ ] 设置抽屉所有控件响应

---

## 故障排查

| 症状 | 原因 | 解决 |
|------|------|------|
| `npm run dev` 报 `Jest worker encountered ... exceptions` | Next.js 16 webpack dev 在 Windows 上有 jest-worker crash bug | 改用 `npm run build && npm run start` |
| 长按菜单不弹出 | 桌面 select-text 干扰 / 阈值过严 | 已修：用 `select-none` + `onContextMenu` 兼容（右键也触发） |
| 「生成画面」转圈失败 | `.env.local` 没填 `MINIMAX_PAYGO_KEY`，或 key 额度耗尽 | 检查 env，账户充值 |
| 「问 AI」无响应 | `MINIMAX_BASE_URL` / `MINIMAX_AUTH_TOKEN` 缺失 / `NEXT_PUBLIC_AI_PROVIDER` 设错 | 检查 env，确认 provider 选择 |
| 章节封面无图 | `public/books/little-prince/chapters/ch00X/` 目录缺失 | 重跑 multimodel pipeline 生成 |
| 章节封面无 BGM | 已知限制（MiniMax 音乐额度不足） | 不修，UI 已 graceful fallback |
