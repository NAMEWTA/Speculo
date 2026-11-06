# UI 风格 HTML 样板库

直接打开 [index.html](index.html) 即可浏览。所有页面是静态 HTML，不需要安装依赖或启动服务器；Lucide 图标和示例图片已经保存在本目录。

## 页面清单

| 页面 | 适合的产品 | 主要参考 |
|---|---|---|
| [01-dense-ide.html](01-dense-ide.html) | IDE、数据库、API、日志工具 | cdesktop、DBeaver、DBX |
| [02-monochrome-console.html](02-monochrome-console.html) | Agent 管理台、本地开发控制台 | Opcode |
| [03-soft-personal-ai.html](03-soft-personal-ai.html) | 个人 AI 助手、消费级桌面工具 | CodePilot、TOKENICODE |
| [04-responsive-web.html](04-responsive-web.html) | 自托管 Web UI、PWA、多设备访问 | CloudCLI |
| [05-mobile-supervisor.html](05-mobile-supervisor.html) | 移动审批、通知、远程监督 | Happy |
| [06-cross-platform-workspace.html](06-cross-platform-workspace.html) | 真正多端的 Agent 工作区 | Paseo |
| [07-local-first-content.html](07-local-first-content.html) | 笔记、知识库、local-first 编辑器 | Notesnook、Joplin、Outline |
| [08-media-first.html](08-media-first.html) | 相册、资产库、视觉内容应用 | Immich |

## 仿造方式

1. 先复制最接近目标任务的 HTML，不要仅按颜色选择。
2. 保留 `styles/base.css`，再从 `styles/pages.css` 复制对应 `.theme-*` 和页面组件块。
3. 先修改页面顶部 `.theme-*` 的语义变量：表面、文字、边框、accent、圆角、字号和面板宽度。
4. 保留 keyboard focus、reduced motion、safe area 和移动任务重排规则。
5. 替换演示数据、名称与状态；不要把 demo 中的权限、Git 或同步状态直接当作真实逻辑。

## 文件结构

```text
ui-gallery/
├─ index.html                 # 风格总览
├─ 01...08-*.html            # 独立可运行样板
├─ styles/base.css           # 通用 primitive、token 抽屉和响应式基线
├─ styles/pages.css          # 八种风格的布局与视觉实现
├─ scripts/gallery.js        # 主题、密度、drawer、tab 和 demo 交互
├─ tests/gallery.spec.js     # Playwright 视口、资源与交互检查
├─ assets/lucide.js          # 本地 icon library
├─ assets/*.jpg              # 内容/媒体示例图
└─ screenshots/              # Playwright 验证截图
```

这些页面用于设计参考和原型起点，不是生产组件库。进入正式开发后，应将 button、menu、dialog、sheet、tabs、tooltip 等替换为项目所用框架的可访问组件原语。

页面本身无需安装依赖。仅在需要重复运行自动化校验时执行：

```powershell
cd ui-gallery
npm install
npm test
```
