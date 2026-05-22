# 阶段 0 · 诊断报告（确诊问题根因定位）

> 范围：针对线上下列 6 类现象，只做代码与数据路径追溯，**不写修复**。  
> 仓库路径：`/Users/nd23942/Documents/3D_bookroom`

---

## 问题 1：`「网络不可用」` 横幅常驻（在线也显示）

### 证据链

- 组件：`app/components/network/NetworkStatusBanner.tsx`（`'use client'`）  
- 挂载点：`app/components/providers/AppChrome.tsx` 内全局渲染 `<NetworkStatusBanner />`

### 当前显示条件

- `useState` 初值：`typeof navigator !== "undefined" ? navigator.onLine : true`  
  - **服务端**：无 `navigator` → 初值 **`true`** → 不渲染横幅（符合预期）。  
  - **客户端首帧**：有 `navigator` → 初值直接取 **`navigator.onLine`**。若在部分环境（Safari / iOS WebView / PWA 恢复态）首帧为 **`false`**，则 **`online === false`** → **立刻渲染离线横幅**。
- `useEffect` **只监听了** `online` / `offline` 事件，**没有在挂载时**再次 `setOnline(navigator.onLine)`，也**没有**在「假设在线直到证明离线」的策略下二次确认。

### 与 SSR 的关系

- 横幅本身不在 RSC 输出为「离线」（服务端初值 `true`）。  
- 常见问题在 **hydration 后首帧或长期错误 `navigator.onLine === false`**：若此后没有触发 `online` 事件，横幅会一直存在。

### next-pwa（侧证）

- `next.config.ts`：`fallbacks.document: "/~offline"`，Workbox `navigateFallbackDenylist` 已排除部分路径。  
- 与「横幅文案」无直接耦合；**横幅逻辑问题主要在 `NetworkStatusBanner` 的初值与挂载同步策略**。

### 根因结论（P0 方向）

1. **过于信任 `navigator.onLine` 的客户端首帧值**；应在挂载后缺省 **乐观在线** 或由 `online`/`offline` 再收敛。  
2. **缺少挂载时与事件 listener 一致的显式同步**（用户建议的 `useEffect` 内 `setIsOnline(navigator.onLine)` + 默认 `true` 可避免大量误报）。

---

## 问题 2：首页 / 详情头 / 目录三处章节数矛盾（如 3、7、32）

### 首页「3 本书 · 共 7 章」

- `app/components/home/HomeShelf.tsx`  
  - `shelfBooks = useBooksCatalog(getHomepageShelfBooks())`  
  - 副标：`bookshelfChapterHint(shelfBooks)` → 对 **`book.totalChapters` 求和**（`BOOKS`/`BookMeta`）。
- `app/lib/hooks/useBooksCatalog.ts`  
  - **初值**为 `initial`（这里是 **固定三本** `HOMEPAGE_SHELF_BOOK_IDS` 对应 `BOOKS` 子集）。  
  - `NEXT_PUBLIC_USE_REAL_DB=true` 且 `/api/books` **成功**后，**整块替换**为 API 返回数组（当前实现**未再按首页三本书过滤**）。
- **「7」**：与 **三本静态 `totalChapters` 之和**强烈一致（历史上常见 **3+3+1**）；说明线上一度或仍处在：  
  - **API 未打上 / 请求失败**沿用初值，或  
  - **Mongo `totalChapters` 与 EPUB 章节行数仍偏小/未回填正文数**，或  
  - **部署版本与本地 `books.ts` 不一致**。

### 书详情头部「3 章 · 约 2 小时」「前三章」等

- `app/book/[bookId]/page.tsx` 为 **服务端页面**，但元数据来自 **`getBookById(bookId)` → `app/lib/data/books.ts` 静态 `BOOKS[]`**。  
- **未**在详情页拉 Mongo `Book` 文档，因此 **`totalChapters`、`shortDesc`、`estimatedHours` 与数据库可长期不一致**。
- **「3」与「前三章」**：直接对应 **旧版静态文案**或未随 ingest 更新的 `books.ts`；与库内 **32 条 `chapters` 行**无关。

### 书详情目录「32 章」

- `app/components/book/BookChapterList.tsx` → **`loadMergedChaptersForBook(bookId)`**  
- `app/lib/db/loadMergedChaptersForBook.ts`：**Mongo 优先**（`listChaptersByBook`），有数据则 **`normalizeDbChapterDocs`** 后渲染；无库才回落 `sample-content`。  
- **「32」**：即 Mongo 中该书 **`chapters` 集合文档条数**（与 EPUB spine 解析策略一致；与静态 `BOOKS.totalChapters` 无自动同步）。

### 根因结论

| 数字 | 典型来源 |
|------|----------|
| **7** | 首页三本 **`totalChapters` 之和**（`useBooksCatalog` 初值或 API 列表上每本字段未与「正文章」对齐时仍可能离谱） |
| **3**（头图） | **`books.ts` → `getBookById`**，非 DB |
| **32**（列表） | **`chapters` collection 行数**，经 `loadMergedChaptersForBook` |

**本质是「详情元数据走静态文件、目录与阅读器走 Mongo」，且首页合计未与「正文章节定义」统一。**

### 临时查库（建议在阶段 1 用脚本/现有 repository 执行）

- **Book 行**：`books` 集合该 `bookId` 的 **`totalChapters` / `totalParagraphs`**  
- **Chapter 行**：`chapters` 集合 **`countDocuments({ bookId })`** 与按 `index` 排序后的 **title 抽样**  
（阶段 0 未连用户 Atlas，仅指明查询对象。）

---

## 问题 3：章标题「脏」与非正文混入；「1050 段」类视觉粘连

### 目录里「版权 / Contents / 导读…」

- 当前 EPUB 流水线 **`app/lib/db/seed/epub-ingest.ts` + `parseEpubFromPath`**：**spine 顺序全进 `Chapter`**，**无** `chapterType` / frontmatter 过滤。  
- 章节标题来自 **`app/lib/epub/epub-html.ts` → `deriveChapterHeading`**：取 **第一个 `h1` / `h2` / `<title>`**，否则 **「第 N 章」**。

### 「10」+「50 段」被读成「1050 段」

- `BookChapterList` 渲染为 **同一行 flex**：左侧 `{ch.title}`，右侧 `{paragraphs.length} 段`，中间 **`gap-3`**。  
- 当 **`ch.title` 为极短纯数字**（如 **`"10"`、`"11"`**）时，来自排版或阅读器伪标题的 **二位数字**与右侧 **`50 段`** 在窄屏上易被 **感知为连续数字串**（认知 + 弱分隔，并非一定缺少 DOM 分隔）。  
- **根因更可归在 `deriveChapterHeading`**：**`h.length >= 2 && h.length < 220` 即接受标题** → **`"10"`、`"11"` 等页码式 garbage 仍作为 title 入库**，未做「仅数字则丢弃」或「合并为第 N 章」。

### 数据库侧

- **`chapters.title`** 即为上述逻辑写入的字符串；**无单独字段**标明 frontmatter / body。  
- **规范化与编号**需在 **清洗脚本 + 导入改进**（阶段 1）完成。

---

## 问题 4：阅读器首屏长时间「正在加载正文与章节目录…」

### 数据路径

- `app/book/[bookId]/read/page.tsx`：仅渲染 `<ReaderShell />`，**无 `loadMergedChaptersForBook` / 无 RSC 传递初始章节**。  
- `app/components/reader/ReaderShell.tsx`：  
  - `chapterPack` 初始 **`null`** → `chapters === null` → 走 **`ReaderSpineLoading` +「正在加载正文与章节目录…」**  
  - **`useEffect` + `fetchMergedBookChapters(bookId)`**（客户端请求）拉全量章节。

### 根因结论

- **首屏 HTML 含加载 UI**；正文 **100% 依赖客户端 fetch**，冷启动 + 网络抖动会拉长白屏/文案停留。  
- 与问题 1 叠加：若误判离线 + 请求慢，体验更差（阶段 2/4 再处理交互策略）。

---

## 问题 5：「开始阅读」进入第 1 章版权页

### 行为

- `app/components/book/BookCoverActions.tsx`：`toRead(bookId)` → **`/book/${bookId}/read`**，**无 `chapter` query**。  
- `app/lib/hooks/useNavigation.ts`：`toRead` 同上。  
- `app/book/[bookId]/read/page.tsx`：`chapter` 仅在 query 存在时解析 **`openChapterIndex`**。  
- `ReaderShell`：默认 **`chapterIndex` 从 store/hydration 或 0**；**spine 第一条**即 EPUB 入库的 **版权/元信息章**。

### 根因结论

- **产品上没有「跳过 frontmatter、进入第一正文章」** 的规则；**chapter 0** 即数据库顺序上的第一章。  
- 与问题 3 **同一数据模型缺口**（缺少 `chapterType` 或等价物 + 入口默认索引策略）。

---

## 问题 6：阅读器正文「一段一行」、需横向滚动（实机）

### 已存在的布局与样式

- **`MobileContainer`**：`max-w-[430px]`、`overflow-x-hidden` 外层 `study-room-gutter`（`app/components/layout/MobileContainer.tsx`）。  
- **`globals.css` `@layer base`**：`html`/`body` **`overflow-x: hidden`**、`max-width: 100%`。  
- **`ReaderParagraphBlock`**：**`<p>` + 内联 `<span>`** 包全文；`reader-mixed-prose`：**`word-break: break-word`、`overflow-wrap: anywhere`**（`app/globals.css`）。  
- **阅读器分页条**：`flex-row` + **`overflow-x-auto`** 的横向 **snap**；**每「页」一章内按段横向滑**（`ReaderShell`）。

### 可能根因（需在阶段 3 用 DevTools 逐项验证）

1. **横向滑动区被当成「整段要横滑读完」**：若单段 **在布局上被算成超宽**（某层 **缺 `min-w-0`** 或 **width 约束断裂**），会出现 **横向滚动阅读** 的观感，像「一行拉很长」。  
2. **最外层虽 `overflow-x-hidden`，子树内 `overflow-x-auto` 的 pager 仍可出现条内横滚**（设计为翻页则合理；若 **单页内容不应横滚** 则属 bug）。  
3. **3D `motion` transform / `scale` reader**（chat 打开时）可能 **加宽可滚动边界**；与 `min-w-0` 链路组合需检查。  
4. **未发现**项目内对正文使用 **`white-space: nowrap`** 类名；更多怀疑 **flex/宽度收缩** 与 **横向滚动容器** 的交互，而非纯 CSS `nowrap`。

### 章节目录「1050」与阶段 3 建议

- DOM 上 **`title` 与 `X 段` 已是两元素**；阶段 3 仍可 **加强语义分隔**（间距、不可换行策略、`min-w-0` 等）避免窄屏误读。

---

## 阶段 0 小结（供阶段 1～6 认领）

| ID | 根因一句话 |
|----|------------|
| 1 | `NetworkStatusBanner` 客户端首帧盲从 `navigator.onLine` 且 effect 未挂载同步；Safari/PWA 易假离线。 |
| 2 | 详情头用静态 `BOOKS`；目录/阅读用 Mongo；首页合计用 `totalChapters` 与库内「spine 章」未统一。 |
| 3 | EPUB 全 spine 入库 + `deriveChapterHeading` .accepts 短数字标题；无 front/body 分型。 |
| 4 | `/read` RSC 未预取章节；`ReaderShell` 纯客户端 `fetchMergedBookChapters`。 |
| 5 | `toRead` 固定从 **索引 0** 起，与 spine 中 frontmatter 重合。 |
| 6 | 全局已有 `overflow-x`/断词；实机问题更可能来自 **reader 内部 flex/min-width/横向 pager** 链路，需实测。 |

---

**阶段 1 前置**：已满足「先诊断后改」；下一拍按任务书实现 `scripts/clean-books.ts`、schema/ingest 扩展与 UI 统一数据源。
