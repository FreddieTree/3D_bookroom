# 修复总结 · 上线前大修

对应 `diagnostic-report.md` 的阶段 0～4 实现与阶段 5 验证说明。

## 已处理的关键问题

1. **响应式 / 横向溢出**  
   - `html` / `body` 增加 `overflow-x: hidden`、`max-width`、`text-size-adjust`。  
   - `.reader-mixed-prose`：断词 + `hyphens`。  
   - `ReaderShell`：横向章节链与面板增加 `min-w-0`，章节列改用 `w-full` 避免与 `min-w-0` 冲突。  
   - `MobileContainer` 外层 `overflow-x-hidden`。

2. **PWA 误判离线全屏**  
   - 移除 `workboxOptions.navigateFallback`，避免导航失败时全局注入 `/~offline`。  
   - 在 `navigateFallbackDenylist` 中加入 `/~offline`、`/offline`。  
   - 保留 `fallbacks.document` 给 Workbox 仍需的文档兜底（插件构建日志仍可能提示 precache 文档页）。**已安装旧 SW 的用户需在真机清站数据或刷新注册**。

3. **真实数据库书目**  
   - `GET /api/books` 仅返回 `status: public` 且 `isReady: true`，并映射 `bookId` → 前端 `BookMeta.id`（`mapDbBookToBookMeta`）。  
   - `HomeShelf` / `LibraryGrid` 通过 `useBooksCatalog`：`NEXT_PUBLIC_USE_REAL_DB=true` 时拉 `/api/books`，失败则保留原 mock 列表。  
   - 「继续阅读」合并 `BOOKS` 与当前书架，避免仅 mock 书有进度。

4. **主页与信息架构**  
   - 首页移除 `DesignSystemShowcase`。  
   - `HomeShelf`：继续阅读区标题 +「查看全部」、书架三列栅格、字数级副标（本数 + 总章数近似）、上传改为虚线卡片、背景渐变更偏品牌暖色。

5. **运维统计**  
   - `GET /api/admin/db-stats`：需 `.env` 中 **`ENABLE_DB_STATS_ADMIN=true`**，否则 404。

---

## 修改的文件清单

| 文件 | 说明 |
|------|------|
| `diagnostic-report.md` | 阶段 0 诊断（本任务新增） |
| `app/globals.css` | 全局 overflow、正文断词、reader `pre`/`code` |
| `app/components/layout/MobileContainer.tsx` | 横向 overflow 克制 |
| `app/components/reader/ReaderShell.tsx` | `reader-chapter-pane`、`min-w-0` |
| `next.config.ts` | PWA navigateFallback 移除 + denylist |
| `app/lib/catalog/map-book-meta.ts` | DB → `BookMeta` 映射 |
| `app/lib/db/repositories/bookRepository.ts` | `listPublicReadyBooks` |
| `app/api/books/route.ts` | 使用公开上架过滤 + 映射 |
| `app/api/admin/db-stats/route.ts` | 可选统计 |
| `app/lib/hooks/useBooksCatalog.ts` | 客户端书架拉取钩子 |
| `app/components/home/HomeShelf.tsx` | 接 API、版式与文案 |
| `app/components/library/LibraryGrid.tsx` | 接同一钩子 |
| `app/page.tsx` | 移除设计 QA 组件 |
| `.env.example` | `ENABLE_DB_STATS_ADMIN` 说明 |

---

## 需你手动处理的事项

1. **环境变量（本地 + Vercel）**  
   - `NEXT_PUBLIC_USE_REAL_DB=true` — 启用 API 书目。  
   - `MONGODB_URI` / `MONGODB_DB` — 服务端已在使用。  
   - 若要查库：`ENABLE_DB_STATS_ADMIN=true`，访问 `/api/admin/db-stats`。**查完建议在生产关掉。**

2. **PWA 旧缓存**  
   - iPhone：**设置 → Safari → 高级 → 网站数据**，删除本站；或卸载主屏幕图标后重装。  

3. **阅读仍只有三章时**  
   - 确认 Mongo 该书 `bookId` 与 URL 一致、章节 collection 非空、`GET /api/books/{id}/chapters` 返回非空；否则仍会回落 `sample-content`（约三章）。

---

## 阶段 5 · 验证清单（需人工）

| 项 | 结果 |
|----|------|
| 5.1 iPhone SE / 14 / Pro Max 无横向滚动、正文换行 | **待真机 / CDT** |
| 5.2 清缓存后首屏非全屏离线 | **待真机**（依赖 SW 更新） |
| 5.3 主页与图书馆本数 = 库中 public+ready | **待接库后验证** |
| 5.4 设计 token / 暗色可读 | **待目视** |
| 5.5 Performance 首页 &lt;2s、阅读 60fps | **待 Profiles** |
| 5.6 完整演示路径（读完页等） | **待回归** |

**说明**：本轮已在本机通过 `npm run lint` 与 `npm run build`。

---

## Chat 简报

- **阶段 1～4**：已按诊断落地代码（阶段 5 仅能文档化占位）。  
- **是否可演示 / 推送**：构建通过；**上线前请务必**配置 `NEXT_PUBLIC_USE_REAL_DB`、清 SW、跑完阶段 5 真机清单。  
