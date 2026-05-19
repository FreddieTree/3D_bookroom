# 诊断报告 · 三维书屋上线前大修（阶段 0）

调查范围：`MobileContainer`、`app/layout.tsx`、globals、PWA/next-pwa、网络检测、数据源与书城 API、主页 `app/page.tsx` + `HomeShelf`、阅读器 `ReaderShell`、`ReaderParagraphBlock`。

---

## 问题 1：响应式布局崩坏

### 确诊原因

1. **`html` / `body` 未钳制横向溢出**  
   `app/globals.css` 的 `@layer base` 中 `body` 未设置 `overflow-x: hidden`，`html` 未设 `max-width: 100%`。子元素负 margin、`min-width: auto` 的 flex 子项、超长不可断字符串可把文档宽度撑出 viewport。

2. **阅读器章节 carousel 缺少 `min-w-0`**  
   `ReaderShell.tsx` 横向 `snap` 的章节列用了 `flex` + `min-w-[100%]`，默认 `min-width: auto` 可能按内容拓宽列，叠加长串不换行易出现横向溢出。

3. **`.reader-mixed-prose` 未声明断词**  
   `app/globals.css` 中为混排配置了字距与 `tabular-nums`，但没有 `overflow-wrap` / `word-break`，英文词与 URL 在窄屏上易撑宽度。

4. **`MobileContainer` 本身合理**  
   `w-full` + `max-w-[430px]`，未误用 `min-width: 430px`。

### 影响范围

- 使用 `MobileContainer` 的整页横向滚动风险。
- 阅读器 `/book/*/read` 正文区域。

### 修复方案（阶段 1）

- `html`、`body`：`width/max-width`、`overflow-x: hidden`、`-webkit-text-size-adjust`.
- `.reader-mixed-prose`：补足 `overflow-wrap`、`word-break`。
- `ReaderShell`：章节面板与文案 flex 容器加 `min-w-0`。
- gutter 可加 `overflow-x-hidden`。
- CDT 375 / 393 / 430 复测。

---

## 问题 2：离线状态 bug

### 判断

- **`NetworkStatusBanner`**：`useState` 服务端默认 `true`（`navigator` 仅在客户端读 `onLine`），不是假离线主因。
- **全页「当前处于离线状态」**：来自 `app/offline/page.tsx` / `/~offline`。`next.config.ts` 配置了 `fallbacks.document: "/~offline"` 与 `workbox.navigateFallback: "/~offline"`。

### 结论

首屏误判更可能来自 **Workbox navigation fallback**（导航失败或非预期拦截即返回离线 HTML），与用户「每次要点按钮返回首页」一致。`manifest.json` 中 `start_url` 仍为 `/`，未发现指向错误的 start_url。

### 修复方案（阶段 2）

- 移除或减弱 `navigateFallback`，减少对在线冷启动的假阳性离线页。
- 保留可读 `/offline` 说明与用户清理 SW 文档说明。
- **不修改** Banner 默认值。

---

## 问题 3：数据库真实数据未显示（像「小王子前三章」）

### 确诊原因

1. **首页未接 API**：`HomeShelf` 使用 `BOOKS` 与 `getHomepageShelfBooks()`；`HOMEPAGE_SHELF_BOOK_IDS` 固定三本，`USE_REAL_DB` 未被首页消费。

2. **元数据强化「三章」**：《小王子》`totalChapters: 3` 与简介文案写「前三章试读」，与演示一致。

3. **阅读器**：`fetchMergedBookChapters` 优先请求 `/api/books/:id/chapters`，空或失败时回落 `sample-content`（小王子约三章体量）。服务端 `typeof window === "undefined"` 直接走 sample。**API 章节路由本身无 `.limit(3)`**（`chapterRepository.listChaptersByBook` 为全书）。

### Atlas 实况

仅凭代码不能替代数据库统计；阶段 3 可提供可选 guarded 的 `/api/admin/db-stats`（需手动环境变量）。

### 修复方案（阶段 3）

- 启用 `NEXT_PUBLIC_USE_REAL_DB=true`（本地 + Vercel）。
- `/api/books` 筛选 `public` + `isReady`；映射 `bookId` 到前端 `BookMeta.id`。
- `HomeShelf` 在开关为 true 时用 API；失败降级静态书单。
- 保留 mock 为开发或失败兜底。

---

## 问题 4：主页设计清单（不少于 10 条）

1. `app/page.tsx` 挂载 `DesignSystemShowcase`，用户首页露出 QA 令牌区，不匹配上线观感。
2. `HomeShelf` 固定背景渐变含蓝紫色相，与「暖色纸张书房、主色克制」冲突。
3. 字号与间距混杂非 8pt 梯度值（例如 `text-[1.925rem]`、`pt-[1.375rem]`）。
4. 书架栅格：`grid-cols-2 sm:grid-cols-3`，与用户期望的移动三列书架不一致。
5. 「我的书屋」缺少基于真实数据的副标题统计（书本数量等）。
6. 继续阅读区信息架构与用户 wireframe 的「标题 + 查看全部」仍有差距。
7. 上传入口为整块实体按钮样式，与用户描述的虚线轻引导卡片不符。
8. 社区仍为 mock slice 预览，偏演示。
9. fixed 视差叠加 sticky header，低端机上滚动节奏风险。
10. 圆角多套并存（`rounded-2xl`、`rounded-[1rem]`、大屏容器 `rounded-[1.65rem]`），需统一到 token。
11. 与用户「标题字重慎用 900」：`HomeShelf`/全局仍混用偏大字号与高字重时需收敛。

---

## 阶段 5（验证）

实机与同网 dev、Performance 面板需人工完成；写入 `fix-summary.md` 时逐项标注。
