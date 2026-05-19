# 三维书屋 项目交付前审计报告

生成时间：**2026-05-19**（Asia/Shanghai，审查执行环境：本地 Cursor / Node）

---

## 总体评分（主观）

| Layer | 就绪度 | 说明 |
| --- | :---: | --- |
| L1 静态代码 | ✅ | `tsc` / `eslint` 通过；`strict: true`。 |
| L2 配置与环境 | ⚠️ | 依赖漏洞（上游）；`.env.example` 已补强。 |
| L3 功能 Phase A–F | ⚠️ | UI/阅读链 mostly 齐；后端成员 2/3 仍为 mock-first。 |
| L4 数据流 | ⚠️ | Reader → store 闭环好；SSE/多媒体 API 未到齐。 |
| L5 UX | ⚠️ | 动效/手势覆盖面好；加载/出错策略不均。 |
| L6 iOS | ⚠️ | `dvh` / `safe-area` 多处可用；未见系统级 QA。 |
| L7 集成接口 | ⚠️ | **`POST /pending/release`、 spoiler-map、多模态 POST 缺失**。 |
| L8 Demo | ⚠️ | `DEMO_MODE` + 导演坞可用；端到端依赖 mock。 |
| L9 文档 | ✅ | audit / integration / demo / SAMPLE_DATA 补足。 |

- **就绪**：约 **2/9**
- **部分就绪**：**7/9**
- **不可用**：**0/9**

---

## 关键问题 P0（致命 · 阻断「生产就绪」但未阻断「离线 mock Demo」）

1. **`npm audit` 报告 7 个已知漏洞（2 moderate, 5 high）** — `postcss`（随 Next）、`serialize-javascript`（Workbox/next-pwa 链）。Fix 往往需要 **升级 Next / next-pwa 主版本**；在未升级前：**公共演示勿暴露管理接口、勿处理不可信任意 CSS 字符串**。  
2. ~~**运行时依赖遗漏**~~ — `app/lib/db/loadMergedChaptersForBook.ts` 引用 `server-only` 但未声明 → **已通过 `npm install server-only` 修复**。

> 若路演 **仅** 依赖 mock + `NEXT_PUBLIC_USE_REAL_DB=false`，则无 **代码级 P0** 阻塞；若上生产 + 外部流量，则需把 **audit 链路**提上日程。

---

## 重要问题 P1

1. **成员 2 契约缺口**：`POST /api/pending/release`、`GET .../spoiler-map` **未实现**（仅存 repository 能力的可能）。→ 见 **`integration-guide.md`**。  
2. **成员 3 契约缺口**：无 **`POST /api/generations/image`**（等）REST；现为 **GET `/api/generations`** 列举 + UI mock。  
3. **`npm audit` / 上游依赖**：需跟踪 Next.js / `@ducanh2912/next-pwa` 安全发布。  
4. **路由 UX**：原先无定制化 **`app/not-found.tsx`** → **已补**。  
5. **调试输出**：`ReaderShell` 长按菜单占位使用 `console.log` → **已改为空 stub 注释**。  
6. **`depcheck` 误报**：将 `tailwindcss`、`@tailwindcss/postcss`、`mongodb` **标为 unused** —— **`mongodb` 顶层包无任何 import，已卸载**；Tailwind PostCSS **由 Next 流水线消费**，忽略 depcheck。  
7. **`/api/chat` 无流式**：成员 2 若需 SSE，需改版式契约。  
8. **无障碍 / loading**：绝大多数路由 **无** `loading.tsx`（Next 仍可渲染，但无骨架递进）。  
9. **全局 `console.info`/`console.error`**：种子脚本、`mongodb.ts` 连接日志 —— **CLI/服务端可保留**；不要求删除 `console.error`。  
10. **README 与技术栈漂移**：写明 shadcn 但 **package 无 radix** → **已在 README 纠正**。

---

## 改进建议 P2（可选）

1. Lighthouse / Web Vitals 每页跑一次，记录 FCP/LCP/CLS/TBT。  
2. 统一 **`docs/INTEGRATION_GUIDE`** 文件名（当前为根目录 `integration-guide.md`，避免双重来源）。  
3. 移除或注解 **legacy/README.md** —— 若为历史则说明保留意图。  
4. 补齐 **per-route `error.tsx` / `loading.tsx`**（非必须但利于 UX）。  
5. `mongodb` driver 已通过 mongoose 捆绑；若日后需原生 `MongoClient` 再加回依赖。

---

## Layer-by-Layer 详细报告

### Layer 1: 静态代码审计

**1.1 TypeScript**

- ✅ `npx tsc --noEmit`：**通过**
- ✅ `tsconfig.json`：**`strict: true`**
- 全局检索 **`: any` / `@ts-ignore` / `@ts-expect-error`**（`app/**/*.ts(x)`）：**未命中滥用**

**1.2 ESLint**

- ✅ `npm run lint`：**0 error**
- 配置：**`eslint.config.mjs`** + `eslint-config-next`

**1.3 依赖**

- `npm audit`：**7 vulns（2 moderate, 5 high）** — 见上。
- `npx depcheck`：**tailwind / postcss 误判 unused**；**`mongodb` 已移除**。
- `npm outdated`（摘录）：`@types/node`/`eslint`/`recharts`/… 有新版；**按要求未擅自升级 major**。
- ✅ 增补 **`server-only`** 正式依赖。

**1.4 死代码**

- TODO/FIXME（业务向）：见 `app/lib/mock/chat.ts`、`GenerationWaiter.tsx` 等多处 **`TODO(成员2|3)`** —— **合理保留**。
- `console.log`：~~阅读器占位~~ → **已删**；`console.info` 仍在 **db seed / verify / mongodb 连接日志**。
- **未在本次自动扫描 ESLint unused exports 全仓库图**。
- **_archive/_old**：检索未见；**存在 `legacy/README.md`**（仅说明 legacy）。

**1.5 命名**

- **「活字」「Living Letters」**：**未发现**
- 文件命名：整体 **kebab**（routes）与 **PascalCase**（组件）混用，符合 Next/React 惯例。

---

### Layer 2: 配置与环境

**2.1 环境变量**

- ✅ `.env.example`：**已扩展到** Mongo / MiniMax / `NEXT_PUBLIC_*` / Demo / 进度同步。
- ⚠️ 项目名称要求 `.env.local.example`：仓库使用 **`.env.example`**（可被 git track）— **等价满足团队参考**。
- ✅ `.gitignore`：`.env*` 排除 `!.env.example`

**2.2 构建**

- ✅ `next.config.ts`：PWA + **`experimental.viewTransition: true`**；Webpack 产物用于 PWA。
- ✅ `npm run build`：**成功**（Webpack）。
- ⚠️ 构建输出 **未** 附带每条路由 First Load JS 体积（需在 CI 或用 `@next/bundle-analyzer` 手动抓）。

**2.3 PWA**

- ✅ `public/manifest.json`：`三维书屋`、`standalone`、`portrait`、`icons` **192/512**。
- ✅ `layout.tsx`：`appleWebApp`、`viewport.viewportFit`、`themeColor`。
- ✅ `apple-touch-icon.png`、`icon-192/512.png` **存在**。

**2.4 Vercel**

- **无根级 `vercel.json`**。
- ⚠️ **无 `.vercelignore` 专项检查**。

---

### Layer 3: 功能完整性（Phase A–E + F-1～F-5）

| Phase | 结论 | 备注 |
| --- | :---: | --- |
| **A** 命名 + token + 3D 工具类 | ✅ | globals + `perspective*` + `Card3D` |
| **B** MongoDB + API | ⚠️ | CRUD/route 脚手架齐；悬念释放/剧透/export 未满 |
| **C** 导航 | ✅ | `useNavigation`、`parseBookPath` |
| **D** 阅读器 | ⚠️ | 功能齐；麦克风 `getUserMedia` 深度未审计 |
| **E** 主页 + 社区 | ⚠️ | `/community/*` **占位页**仍存在 |
| **F** 视觉 | ✅ | ViewTransition、Lenis、地图塔、读完页等已落地 |

---

### Layer 4: 数据流

**链路摘要**

| 场景 | 评估 |
| --- | --- |
| **进阅读器** | `fetchMergedBookChapters` + Mongo merge；失败回落 `sample-content` |
| **发 AI** | **`mockChatResponse`** 客户端为主；`POST /api/chat` mock + `after()` 异步写会话 |
| **主题/字号** | `persist` middleware；注意 **SSR 默认值一致** |
| **进度** | `readerStore` + `ReadingProgressBackgroundSync` throttle |
| **地图节点→读** | `setReadingPosition` + `paragraph` query |

**Zustand**

- **`useAppStore`**：阅读设置、chat、悬念、配图、地图 session、帐户 mock…
- **`useReaderStore`**：进度、scroll、activeBook。

**边界**

- ✅ `app/error.tsx` 全局
- ⚠️ **无**下级 `loading.tsx`、`error.tsx` 分拆

---

### Layer 5: 用户体验（摘要）

| 类别 | 评估 |
| --- | --- |
| 手势 | LONG_PRESS：`ReaderShell` **500ms**；地图塔 **≤500ms**。 |
| 触感 | **`safeVibrate`** 广泛使用；需在真机复核「开关」语义。 |
| 加载 | 书架/正文部分有占位；并非全面骨架。 |
| 错误网络 | Toast 级别 **未统一**。 |

---

### Layer 6: iOS（理论审查）

| 项目 | 评估 |
| --- | --- |
| `safe-area` | Bottom bar / footer 大量使用 `pb-[max(...,env()` |
| `100vh`/`100dvh` | **`min-h-dvh`/`100dvh` 常见 Good** |
| `viewport maximumScale` | **固定 1**：防 zoom 或可访问性权衡需产品拍板 |

**触摸 44×44**：未自动像素级测量全体控件 —— **遗留人工走查**。

---

### Layer 7: 成员 2 / 3 接入

**已实现**

- `POST /api/chat`（mock）
- `GET /api/pending`、`GET /api/pending/check`
- `GET /api/generations`
- Repo：`spoilerMaps`、`pendingQuestions`、`conversations`……

**未就绪（见 integration-guide.md）**

- `POST /api/pending/release`
- Spoiler-map **REST shell**
- 多模态 **POST family**

---

### Layer 8: Demo

**DEMO_MODE + `?demo=director`**：✅ `DirectorDock`。  
**API fail → mock**：阅读器/chat **大多可继续**。  
**演示路径**：见 **`demo-guide.md`**；薄弱环节 — **云端 LLM/TTS「卖关子」仍为 mock**。  
**Lighthouse**：**未跑**。

---

### Layer 9: 文档与可维护性

| 文档 | 状态 |
| --- | --- |
| README | ✅ 已更新索引 + 纠正技术栈陈述 |
| `docs/ARCHITECTURE.md` | ✅ 存量 |
| `docs/API.md` | ✅ 增补 **缺口路由表** |
| `docs/CONVENTIONS.md` | ✅ 存量 |
| `audit-report.md` | ✅ **本文件** |
| `integration-guide.md` | ✅ **新增** |
| `demo-guide.md` | ✅ **新增** |
| `docs/SAMPLE_DATA.md` | ✅ **新增** |

---

## 修复行动列表

### 已自动修复（6 项）

1. **`server-only`** 声明依赖 — 对齐 `loadMergedChaptersForBook.ts`。
2. **卸载未使用的顶层 `mongodb` 包** — 减负 + 对齐 depcheck。
3. **`ReaderShell` 三处占位 `console.log`** → inline stub。
4. **新增 `app/not-found.tsx`** — 品牌化 404。
5. **`.env.example`** — 增补 `NEXT_PUBLIC_*` / Demo / 文案分区。
6. **`docs/API.md`** — 「尚未落地的 REST」表；**README** 文档索引 + shadcn 勘误。

### 需要手动处理（高优先级节选）

| # | 动作 |
| --- | --- |
| M1 | **`npm audit` Remediation plan** — 选定 Next/next-pwa 升级窗口或豁免说明。 |
| M2 | 实现 **`POST /api/pending/release` + spoiler-map/read + 多媒体 POST**。 |
| M3 | **真机 + Lighthouse** — 记录在 wiki 或本报告附录。 |
| M4 | 评估是否增加 **Skeleton `loading.tsx`**（长列表/阅读器首开）。 |

---

## Demo 就绪度（勾选由你们现场验证）

- [ ] 完整 demo 路径（`demo-guide.md`）每人走通一遍
- [ ] iPhone 真机 Safari + PWA
- [ ] Vercel Preview 冒烟
- [ ] PWA 安装图标 OK
- [ ] 成员 2/3 接入点：**文档齐，路由未齐**

---

## 结语

项目在 **离线 mock Demo** 维度 **可演示**；在 **对外开放 API / 上架安全基线** 维度 **仍有明确工程债**（`npm audit`、REST 补齐）。推荐 merge 本文档到 **`main`** 后与团队开 30min **Remediation triage**。
