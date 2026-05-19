# Demo 脚本 · Plan B/C

**前置**：部署或本地 `npm run dev`；iPhone Safari 竖屏。**导演模式**：`.env.local` 设 `NEXT_PUBLIC_DEMO_MODE=true`，首次带参进入任意页 `?demo=director`，之后同会话内右下角 **导演坞**（`DirectorDock`）常驻。

---

## Plan A · 路演主路径（≈90s）

| 步骤 | 操作 | 预期 |
| --- | --- | --- |
| 1 | 「添加到主屏幕」启动 PWA | `standalone`，无 Safari 底栏 |
| 2 | 首页 | 书架、继续读横滑 |
| 3 | 《小王子》书卡 | 视图过渡 / 扉页封面 |
| 4 | 「开始阅读」→ 正文 | 顶栏书名、分页、沉浸式切换（如有） |
| 5 | 长按麦克风 · 松开 | 语音识别 mock → AI 气泡流式 |
| 6 | 左滑气泡 | 气泡收起 |
| 7 | 右滑边缘（竖屏右侧热区） | `ChatDrawer` 打开 |
| 8 | 长按段落 | 半透明菜单 →「问 AI」等 |
| 9 | 顶栏 **地图** | 3D 时间塔旋转 + 点上节点→回段落 |
| 10 | 末章读完 CTA → **读完页** | URL 含 `?celebrate=1`（从阅读器进入时）入场幕 |

若某步失败：**导演坞**一键跳地图 / 悬念 / Chat / 读完页。

---

## Plan B · 网络抖 / API 不可用

- `NEXT_PUBLIC_USE_REAL_DB=false`（默认）：UI 主要靠 **zustand + mock**，离线演示阅读器仍可翻页。
- `/api/chat`：失败时已 **先返回 Mock JSON**；会话写库在 `after()`，失败仅存 `console.error`。
- 地图 / 读完页：**不强制**网络。

---

## Plan C · 设备问题

| 场景 | 处理 |
| --- | --- |
| 麦克风无权限 | 改为 **ChatDrawer 键盘输入** 演示同款对话 |
| 触感无反馈 | Safari 静默 `vibrate`，略过不提 |
| 动画卡顿 | 系统设置「减少动态效果」；应用尊重 `prefers-reduced-motion` |

---

## 交付前自检

- `npm run build` 绿灯
- 真机：安全区、`100dvh`、地图横滑不误触纵向滚动过多
- `README` · `audit-report.md` · `integration-guide.md` 已读
