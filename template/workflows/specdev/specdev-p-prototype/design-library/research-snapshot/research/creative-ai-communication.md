# 创作、AI 与通信类热门开源产品 UI 研究

> 研究对象：Penpot、Excalidraw、Open WebUI、Chatwoot、Mattermost、Hoppscotch
>
> 截止日期：2026-08-30（Asia/Shanghai）
>
> 证据范围：项目 GitHub 仓库与源码、项目官方设计/开发文档、官方用户文档。热度为当日 GitHub REST API 快照的约数级表达，不用于长期排名。

## 方法与证据口径

- **精确值**：只抄录仓库源码、官方 token、官方配置或官方文档中明确给出的值，并在项目末尾列出文件路径。
- **观察**：从官方界面说明、组件层级、CSS 类名和交互源码归纳；并不等同于项目正式设计规范。
- **推断**：架构关系或设计意图由多处源码综合得出，显式标为“推断”。
- **热度**：Stars/Forks 会持续变化，下表四舍五入到约数级；许可证以仓库当前 `LICENSE` 为准，不能替代法律意见。

## 横向速览

| 项目 | 产品类型 | GitHub 热度（约） | 当前仓库许可要点 | 前端主栈 | 最鲜明的 UI 模式 |
|---|---|---:|---|---|---|
| [Penpot](https://github.com/penpot/penpot) | 设计与原型协作 | 5.9 万 Stars / 4.0 千 Forks | MPL-2.0 | ClojureScript、React、SCSS、WebAssembly 渲染 | 无限画布 + 左右属性面板 + 设计/原型/检查工作流 |
| [Excalidraw](https://github.com/excalidraw/excalidraw) | 手绘白板 | 13.1 万 / 1.5 万 | MIT | React、TypeScript、SCSS、Canvas、Jotai | 画布优先、漂浮工具岛、低学习成本 |
| [Open WebUI](https://github.com/open-webui/open-webui) | 自托管 AI 工作台 | 15.0 万 / 2.2 万 | 自定义 Open WebUI License，含品牌限制 | Svelte 5、SvelteKit、TypeScript、Tailwind CSS 4 | 会话侧栏 + 单列对话 + 模型/工具/RAG 工作区 |
| [Chatwoot](https://github.com/chatwoot/chatwoot) | 全渠道客服/共享收件箱 | 3.6 万 / 8.8 千 | 社区代码 MIT；`enterprise/` 另有许可 | Vue 3、Vite、Tailwind CSS 3、Pinia/Vuex | 导航栏 + 队列列表 + 会话 + 客户上下文的高密度工作台 |
| [Mattermost](https://github.com/mattermost/mattermost) | 团队通信与协作 | 3.9 万 / 9.0 千 | 源码 AGPLv3/商业；`webapp/` 等为 Apache-2.0；官方编译物 MIT | React 18、TypeScript、Redux、SCSS | 团队栏 + 频道栏 + 消息流 + 可调整线程侧栏 |
| [Hoppscotch](https://github.com/hoppscotch/hoppscotch) | API 开发工作台 | 8.0 万 / 6.1 千 | MIT | Vue 3、TypeScript、Vite、Tailwind CSS 3、RxJS | 协议导航 + 请求/响应可分割窗格 + 集合/环境侧栏 |

---

# Penpot

## 基本信息

- GitHub：https://github.com/penpot/penpot
- 产品类型：开源设计、原型、设计系统与开发交付平台。
- 采集分支：`develop`；采集日期：2026-08-30。
- 开源许可：仓库根许可为 **Mozilla Public License 2.0**，属于文件级弱 copyleft；修改受 MPL 覆盖的文件需按其条款提供源码。
- 热度：约 **5.9 万 Stars、4.0 千 Forks**。

## 技术栈与架构

- 官方架构文档将其定义为典型 SPA：前端使用 **ClojureScript + React**，由静态服务器提供；后端使用 **Clojure/JVM**，数据落在 PostgreSQL。前后端共享 Clojure 数据结构与 `common/` 业务代码。
- 前端构建可从 `frontend/package.json` 看到 Shadow CLJS、Vite/Storybook、SCSS、Playwright；渲染层还包含 `render-wasm/`。新的 `@penpot/ui` 包使用 React、Vite 与 `react-aria-components`。
- 后端负责 RPC、持久化、媒体、任务队列；WebSocket 通知用于多人同时打开文件时传播变更。导出器是独立子系统。
- **推断**：其边界不是“React 页面 + REST”这么简单，而是 ClojureScript 应用状态/事件、共享几何与数据模型、WASM 渲染、RPC 与实时通知共同组成的编辑器架构。移植 UI 时不能把画布交互当作普通 CRUD 页面。

## 信息架构与布局

- 官方界面说明分成 **Dashboard、Workspace、View mode** 三个主区域。
- Dashboard：团队、项目、草稿、共享库、自定义字体、搜索、文件卡片与模板入口；属于文件管理层。
- Workspace：中心无限画布；左侧是页面/图层/资产/设计 token，右侧是设计属性、原型和 Inspect；顶部/浮动区域承载创建工具、文件菜单、协作者、分享、历史、评论和视图操作；底部可出现颜色与字体快捷调色板。
- View mode：播放原型、评论、Inspect、页面/画板导航、全屏与分享链接；通过只读模式把“评审/交付”与“编辑”隔离。
- 导航逻辑值得注意：模式切换围绕当前文件上下文发生，而不是离开编辑器去独立页面；面板内容随选中图层类型变化。

## 视觉系统

### 色彩

- 设计 token 使用语义层，例如 `--color-background-*`、`--color-foreground-*`、`--color-accent-*`，再映射到按钮、标签页、图层行、输入框等组件状态。
- 精确的基础色示例：暗色强调色 `#00d1b8`，亮色强调色 `#8c33eb`；成功 `#2d9f8f`、警告 `#f5a91b`、错误 `#ff3277`、信息 `#0e9be9`。这些值来自 `color-defs.scss`，不是对所有页面主色占比的描述。
- 组件 token 同时覆盖 rest/hover/active/focus/disabled，且亮暗主题通过同一语义名切换。相比直接写色阶，组件状态语义更适合复杂编辑器。

### 字体与字号

- 精确字号阶梯：`10、11、12、14、16、18、20、24、36px`（源码以 rem 换算，其中 11px 写为 `0.688rem`）。
- 精确字重：`400 / 500 / 700`；通用行高 token 为 `1.5`。
- **观察**：工作区以紧凑小字号为主，画布对象的字体则由用户文档内容决定；不能把应用 UI 字体 token 与设计稿内容字体混为一谈。

### 间距、尺寸、圆角与阴影

- 精确间距：`$s-1 = 1px`、`$s-2 = 0.125rem`、`$s-3 = 1px + 0.125rem`、`$s-4 = 0.25rem`，之后主体以 **0.25rem（4px）递增**，并提供大量编辑器所需的大尺寸值。
- 精确菜单阴影：`0 0 0.75rem 0 var(--menu-shadow-color)`。
- 在本次检查的核心 refactor token 文件中未找到统一圆角阶梯；因此不把界面中观察到的圆角反推成全局规范。组件级圆角需继续追到对应 SCSS。
- **观察**：面板更多依靠背景层级、细边界和选择态区分，阴影使用克制，符合长时间创作工具的低干扰目标。

## 关键组件与交互

- 图层树：嵌套、拖拽排序、展开折叠、搜索/按类型过滤、键盘跨层级导航。
- 画布：选择、框选、缩放、平移、对齐/吸附、标尺/参考线、直接编辑；工具栏将高频创建动作常驻。
- 属性侧栏：根据图层类型渐进呈现尺寸、位置、填充、描边、阴影、模糊、布局等设置，避免一次暴露全部参数。
- 设计系统：组件、变体、颜色/字体样式、共享库和 Design Tokens 与画布使用点相连；Inspect 输出 CSS、HTML、SVG。
- 协作：多人光标、评论、分享、版本历史/自动保存状态，使“是否已保存”和“谁在编辑”持续可见。

## 响应式与可访问性

- Penpot 是桌面优先的高密度编辑器；官方快捷键覆盖面板显隐、图层导航、缩放与模式跳转。小屏策略更接近收起/切换面板，而不是把所有编辑能力等比例缩小。
- 图层树支持 `Tab` / `Shift+Tab`、`Enter` / `Shift+Enter`、`Ctrl/⌘ + ↑/↓` 等结构化键盘操作。
- 新 UI 包依赖 `react-aria-components`，并配置 `eslint-plugin-jsx-a11y`，说明新组件层有明确可访问性基础设施。
- 风险：Canvas/WASM 编辑区域、拖拽、几何操作天然难以完整映射给屏幕阅读器；“有 ARIA 组件库”不代表整个编辑器达到某一 WCAG 等级，本次未发现官方合规声明。

## 值得复用与应避免的做法

**可借鉴**

- 用“基础 token → 语义 token → 组件状态 token”三层映射承载亮暗主题和复杂状态。
- 把创作、原型、检查、评论做成同一文件上下文的模式，而非割裂页面。
- 对高频命令同时提供图标、快捷键、菜单入口和上下文入口。
- 让保存状态、协作者、版本和评论成为工作区的一等信息。

**风险/不宜照搬**

- 三侧/多面板布局对低分辨率、触屏与新手认知负担很大。
- ClojureScript、React、WASM、共享模型并存，前端贡献门槛与局部重构成本高。
- token 文件非常庞大；若缺少文档、弃用策略和自动检查，语义别名会不断重复。
- MPL 文件级义务、字体/模板/第三方资产许可应分别审查。

## 证据与来源

- 仓库、许可与热度：[仓库](https://github.com/penpot/penpot)、[`LICENSE`](https://github.com/penpot/penpot/blob/develop/LICENSE)、[GitHub API](https://api.github.com/repos/penpot/penpot)
- 官方架构：[Architecture](https://help.penpot.app/technical-guide/developer/architecture/)、[Backend app](https://help.penpot.app/technical-guide/developer/architecture/backend/)、[Common code](https://help.penpot.app/technical-guide/developer/architecture/common/)
- 官方界面：[Interface tour](https://help.penpot.app/user-guide/first-steps/the-interface/)、[Workspace basics](https://help.penpot.app/user-guide/designing/workspace-basics/)、[Shortcuts](https://help.penpot.app/user-guide/first-steps/shortcuts/)
- 关键源码：[`frontend/package.json`](https://github.com/penpot/penpot/blob/develop/frontend/package.json)、[`frontend/packages/ui/package.json`](https://github.com/penpot/penpot/blob/develop/frontend/packages/ui/package.json)、[`color-defs.scss`](https://github.com/penpot/penpot/blob/develop/frontend/resources/styles/common/refactor/color-defs.scss)、[`design-tokens.scss`](https://github.com/penpot/penpot/blob/develop/frontend/resources/styles/common/refactor/design-tokens.scss)、[`fonts.scss`](https://github.com/penpot/penpot/blob/develop/frontend/resources/styles/common/refactor/fonts.scss)、[`spacing.scss`](https://github.com/penpot/penpot/blob/develop/frontend/resources/styles/common/refactor/spacing.scss)、[`shadows.scss`](https://github.com/penpot/penpot/blob/develop/frontend/resources/styles/common/refactor/shadows.scss)

---

# Excalidraw

## 基本信息

- GitHub：https://github.com/excalidraw/excalidraw
- 产品类型：手绘风格无限白板与可嵌入 React 编辑器。
- 采集分支：`master`；采集日期：2026-08-30。
- 开源许可：**MIT**。
- 热度：约 **13.1 万 Stars、1.5 万 Forks**。

## 技术栈与架构

- Monorepo 以 **React + TypeScript** 为核心，Vite 构建；`@excalidraw/excalidraw` 是可嵌入组件，宿主应用位于 `excalidraw-app/`。
- 样式使用 SCSS 与作用域 CSS 变量；状态依赖 Jotai；绘制/几何依赖 RoughJS、Perfect Freehand、Canvas，文本/代码编辑包含 CodeMirror。
- 包公开 imperative API、事件回调、`initialData`、主题、语言和可插槽 UI；宿主负责持久化、分享、协作等产品层能力。
- **推断**：最重要的架构决策是把“通用画布引擎/编辑器 UI”和“excalidraw.com 产品外壳”分开。这让第三方可嵌入，同时也要求 API、CSS 变量和资源路径保持兼容。

## 信息架构与布局

- 第一屏就是全屏画布，没有传统页面导航。左上为主菜单，顶部中间为工具岛，右上为协作/库等操作，左侧或浮动属性面板随选择出现，底部放缩放、撤销/重做、帮助等状态操作。
- 工具顺序围绕任务频率：选择、矩形、菱形、椭圆、箭头、线条、自由绘制、文本、图片、橡皮等；数字/字母快捷键直接映射。
- Library、Main Menu、Welcome Screen、Footer 等以可组合组件形式开放给宿主；Zen mode 可隐藏非必要 UI。
- **观察**：布局的核心不是“导航到功能”，而是“在画布附近唤起工具”。面板以 island/popup 悬浮，最大限度保留画布面积。

## 视觉系统

### 色彩

- 浅色主品牌/选择色精确为 `#6965db`，hover `#5753d0`，active `#4440bf`；浅色 surface 包含 `#f1f0ff / #f6f6f9 / #ececf4 / #ffffff`，on-surface 为 `#1b1b1f`。
- 暗色主色为 `#a8a5ff`，最低表面约 `hsl(0, 0%, 7%)`，on-surface 为 `#e3e3e8`。
- 危险色、警告色、成功色有独立语义；基础 SCSS 还保留 Open Color 风格的 red/gray/green/blue 色阶。

### 字体与字号

- 应用 UI 字体精确为 `Assistant, system-ui, BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`。
- UI 根字号源码出现 `0.8333rem`，标签常用 `0.75rem`，部分提示 `0.875rem`；这些是组件源码值，不代表完整排版阶梯。
- 画布字体与 UI 字体分离：官方常量文档列出 Excalifont（手绘）、Nunito（常规）、Comic Shanns（代码），默认画布字体是 Excalifont。

### 间距、尺寸、圆角与阴影

- 精确空间基数：`--space-factor: 0.25rem`。
- 桌面按钮/图标：`2rem / 1rem`；大按钮 `2.25rem`；移动环境会把默认按钮调到 `2.25rem`、大按钮 `2.5rem`、大图标 `1.25rem`。
- 精确圆角：`--border-radius-md: 0.375rem`、`--border-radius-lg: 0.5rem`。
- 精确阴影示例：modal/sidebar 多层阴影的首层为 `0 100px 80px rgba(0,0,0,.07)`；library dropdown 多层阴影的首层为 `0 15px 6px rgba(0,0,0,.01)`；聊天消息完整值为 `0 1px 2px rgba(0,0,0,.1)`。
- **观察**：低阴影 + 细边框 + 淡紫选中面构成“漂浮工具岛”，手绘感主要来自画布内容，不靠 UI 装饰。

## 关键组件与交互

- 工具岛：radio/toggle 工具语义、可见快捷键、保持工具锁定、移动端尺寸变体。
- 选择属性：描边/填充颜色、线宽、线型、粗糙度、透明度、层级、对齐、字体、箭头端点等在选中对象后展开。
- 画布：鼠标、笔、触控，双指缩放/平移；元素绑定、框架、链接、裁图、库拖入、Mermaid 转图形。
- 颜色与字体选择器具有独立键盘导航处理文件；分享/实时协作显示协作者头像与激光指针。
- 嵌入 API 支持禁用部分 UI、view mode、导航能力、主题、语言和自定义 top-left/top-right/footer。

## 响应式与可访问性

- 代码显式区分 `isMobile`，移动端改变按钮尺寸、工具排列和弹层；编辑器宽高始终填满父容器。
- 工具使用原生 input/button、`aria-label`、`aria-keyshortcuts`，颜色/字体选择器有键盘导航；画布快捷键非常完整。
- 但官方 issue 明确显示触屏仍以桌面体验为主，平板手势、触笔、移动端上下文菜单和窄屏控件遮挡仍有缺口。
- 画布本体无法仅凭工具栏 ARIA 获得等价的键盘绘图能力；公开可访问性审计 issue 也记录了焦点顺序、重复 id 和键盘绘图问题。不能宣称完整 WCAG 合规。

## 值得复用与应避免的做法

**可借鉴**

- 让画布占满第一屏，工具使用紧凑、稳定尺寸的“岛”，把属性按选择上下文渐进展示。
- 将 UI 字体和作品字体彻底分离；作品风格不污染操作控件可读性。
- 将编辑器作为组件产品化，明确 CSS、资源、事件和 imperative API 合同。
- 同一动作同时支持图标、快捷键、触控和命令菜单。

**风险/不宜照搬**

- 手绘视觉适合构思，不适合所有精确设计/数据工具；不能仅复制字体与粗糙线条。
- Canvas 对屏幕阅读器、无指针输入和自动化测试不友好。
- 触屏“可用”与触笔专业体验差距大；移动端不能只放大按钮。
- SCSS token 既有新语义色又有历史色阶，主题迁移需防重复和宿主 CSS 冲突。

## 证据与来源

- 仓库、许可与热度：[仓库](https://github.com/excalidraw/excalidraw)、[`LICENSE`](https://github.com/excalidraw/excalidraw/blob/master/LICENSE)、[GitHub API](https://api.github.com/repos/excalidraw/excalidraw)
- 开发文档：[Excalidraw developer docs](https://docs.excalidraw.com/)、[包 README](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/README.md)、[API constants](https://github.com/excalidraw/excalidraw/blob/master/dev-docs/docs/%40excalidraw/excalidraw/api/constants.mdx)
- 关键源码：[`package.json`](https://github.com/excalidraw/excalidraw/blob/master/package.json)、[`packages/excalidraw/package.json`](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/package.json)、[`theme.scss`](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/css/theme.scss)、[`styles.scss`](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/css/styles.scss)、[`variables.module.scss`](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/css/variables.module.scss)、[`types.ts`](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/types.ts)
- 风险证据：[Touch Device Support](https://github.com/excalidraw/excalidraw/issues/9705)、[Accessibility audit issue](https://github.com/excalidraw/excalidraw/issues/7492)

---

# Open WebUI

## 基本信息

- GitHub：https://github.com/open-webui/open-webui
- 产品类型：面向本地/远端模型、工具、知识库与多媒体能力的自托管 AI 工作台。
- 采集分支：`main`；采集日期：2026-08-30。
- 开源许可：当前为 **Open WebUI License**。代码可再分发/修改，但第 4 条限制更改/移除品牌；滚动 30 天内不超过 50 个自然人终端用户、获得书面许可或企业许可时例外。官方文档说明 `v0.6.5` 及以前仍是 BSD-3-Clause。它不是 OSI 标准许可证，仓库的 Python classifier 也标为 `Other/Proprietary License`。
- 热度：约 **15.0 万 Stars、2.2 万 Forks**。

## 技术栈与架构

- 前端：**Svelte 5 + SvelteKit 2 + TypeScript + Vite + Tailwind CSS 4**；路由在 `src/routes/`，复用组件/API/stores 在 `src/lib/`。
- 后端：Python **FastAPI**、Pydantic、SQLAlchemy/Alembic；支持 SQLite/PostgreSQL/MariaDB 等部署组合，Socket.IO/实时流、模型代理、文件解析、RAG 与多种向量库连接。
- 前端依赖体现工作台范围：Tiptap/ProseMirror、CodeMirror、Yjs、Mermaid、KaTeX、PDF/Office 预览、xterm、图表与流程图。
- `routes/(app)/+layout.svelte` 在登录后的布局层加载用户设置、模型、工具、知识、横幅、终端服务并挂载全局侧栏和设置/更新弹窗。
- **风险信号**：核心 `Chat.svelte` 已是数千行级组件。功能集中提升迭代速度，但会放大状态耦合、响应式回归和可测试性成本。

## 信息架构与布局

- 桌面主框架是左侧会话/功能侧栏 + 中央对话列；侧栏承载新对话、搜索、文件夹/历史、置顶模型，以及 Notes、Workspace 等入口。
- 对话顶部承担会话标题、模型选择、分享与控制；正文是消息时间线；底部是可扩展输入区，附件、工具、知识/模型能力围绕输入前后展开。
- Workspace/Admin/Settings 通过独立路由或模态进入，管理模型、知识、工具、函数、连接、用户与系统配置。
- 侧栏聊天与文件夹支持拖拽排序/归类；临时聊天、归档、标签、搜索帮助控制长期历史增长。
- **观察**：它借鉴消费级聊天产品的低门槛单列对话，又把企业 AI 平台能力藏在模型选择器、输入附件、Workspace 与设置中。

## 视觉系统

### 色彩

- 自定义灰阶使用 OKLCH，精确 token 从 `--color-gray-50: oklch(0.98 0 0)` 到 `--color-gray-950: oklch(0.16 0 0)`，并额外有 `gray-850: oklch(0.27 0 0)`。
- 浅/暗主题主要由 `gray-*` 与 `dark:` 工具类成对表达；蓝色集中用于焦点、勾选和操作强调。
- **观察**：近中性无彩色占绝对主导，让模型输出、代码、文件和图表成为视觉主体；代价是层级容易过度依赖浅灰差异。

### 字体与字号

- 精确字体栈以系统字体为先，随后是 `Inter`、`Vazirmatn`、Segoe UI、Roboto、Ubuntu、Noto Sans 等；仓库内嵌 Inter/Vazirmatn variable fonts。
- `--app-text-scale` 默认 `1`，根字号为 `calc(1rem * scale)`，由界面缩放滑杆更新。
- 消息正文多个样式使用精确 `0.9375rem`（15px），辅助文本常见 Tailwind `text-sm` / `text-xs`；不能把这些观察当作独立全局字号 token 表。

### 间距、尺寸、圆角与阴影

- 会话侧栏条目精确最小高 `32px × text scale`，水平 padding `11px × scale`，垂直 padding `6px × scale`，标题行高 `20px × scale`。
- 精确组件示例：选择高亮圆角 `2px`；编辑器列表手柄 `0.25rem`；代码/内容块出现 `0.4rem`、`0.5rem`；工具提示使用 `rounded-lg` 与 `shadow-xl`。
- 样式主要由 Tailwind utility 现场组合，未发现项目级统一间距/圆角/阴影 token 表；因此不把 Tailwind 默认值全部宣称为 Open WebUI 自有设计规范。

## 关键组件与交互

- 模型选择：单/多模型、置顶/排序、模型参数与能力差异；模型是对话开始前的首要上下文。
- MessageInput：自动增高、附件拖放、文件/图片、工具、语音、命令与发送/停止生成；流式状态与重试/继续生成紧邻消息。
- 消息：Markdown、代码、公式、图表、Mermaid、引用、复制、编辑、反馈、朗读与分支操作。
- 侧栏：聊天文件夹、重命名、归档、拖拽排序、搜索和折叠；hover 操作同时通过 `:focus-within` 显示。
- 管理面：模型、连接、RAG/知识、工具/函数、用户和许可状态，普通用户与管理员的能力分层明显。

## 响应式与可访问性

- Svelte store 明确区分 `mobile`；移动端侧栏转为覆盖/抽屉，主内容保持单列，部分排序在移动端禁用。
- 根 viewport 使用 `viewport-fit=cover` 与 `interactive-widget=resizes-content`，考虑安全区和移动键盘；同时设置 `maximum-scale=1`，可能限制浏览器缩放，是可访问性风险。
- `focus-trap`、Bits UI、ARIA 标签、语义 section/heading/list 以及 `hover + focus-within` 并用；变更日志持续记录模态焦点、icon button 标签和高对比度修复。
- 风险：仓库仍有 `svelte-ignore a11y-*`；功能密集且第三方编辑器众多，键盘焦点链容易回归。本次未见官方 WCAG 等级声明。

## 值得复用与应避免的做法

**可借鉴**

- 将“模型、知识、工具、附件”建模为输入上下文，而不是散落在多个设置页面后才影响会话。
- UI 缩放用根级变量驱动，同时同步侧栏命中区和行高，而非只放大文字。
- Hover-only 操作补 `focus-within`；流式生成明确提供停止、重试与状态反馈。
- 保持对话正文宽度克制，把高复杂度放在可收起侧栏与模态。

**风险/不宜照搬**

- 超大聊天组件与大量全局 stores 会形成难以隔离的状态耦合。
- Tailwind utility 分散在组件中，缺少项目级尺寸 token 时容易出现 `0.4rem/0.5rem/rounded-lg` 混用。
- “本地可部署”不等于“无许可约束”；品牌条款对商业白标尤其关键。
- 支持大量解析器、执行环境和外部连接显著扩大供应链、XSS、提示注入与资源消耗面。

## 证据与来源

- 仓库、许可与热度：[仓库](https://github.com/open-webui/open-webui)、[`LICENSE`](https://github.com/open-webui/open-webui/blob/main/LICENSE)、[官方许可说明](https://docs.openwebui.com/license/)、[GitHub API](https://api.github.com/repos/open-webui/open-webui)
- 关键源码：[`package.json`](https://github.com/open-webui/open-webui/blob/main/package.json)、[`pyproject.toml`](https://github.com/open-webui/open-webui/blob/main/pyproject.toml)、[`src/tailwind.css`](https://github.com/open-webui/open-webui/blob/main/src/tailwind.css)、[`src/app.css`](https://github.com/open-webui/open-webui/blob/main/src/app.css)、[`src/app.html`](https://github.com/open-webui/open-webui/blob/main/src/app.html)
- 架构/布局路径：[`src/routes/(app)/+layout.svelte`](https://github.com/open-webui/open-webui/blob/main/src/routes/%28app%29/%2Blayout.svelte)、[`Chat.svelte`](https://github.com/open-webui/open-webui/blob/main/src/lib/components/chat/Chat.svelte)、[`layout/Sidebar.svelte`](https://github.com/open-webui/open-webui/blob/main/src/lib/components/layout/Sidebar.svelte)、[`src/lib/stores/index.ts`](https://github.com/open-webui/open-webui/blob/main/src/lib/stores/index.ts)
- 可访问性变化证据：[`CHANGELOG.md`](https://github.com/open-webui/open-webui/blob/main/CHANGELOG.md)

---

# Chatwoot

## 基本信息

- GitHub：https://github.com/chatwoot/chatwoot
- 产品类型：全渠道客服、共享收件箱、客户资料、自动化与 AI 辅助。
- 采集分支：`develop`；采集日期：2026-08-30。
- 开源许可：根 `LICENSE` 说明 **`enterprise/` 之外为 MIT Expat**，企业目录遵循 `enterprise/LICENSE`；属于 open-core，不能用根 `package.json` 的 MIT 字段概括全部仓库。
- 热度：约 **3.6 万 Stars、8.8 千 Forks**。

## 技术栈与架构

- 前端：**Vue 3 + Vite + Vue Router**；状态处于迁移期，同时存在 Pinia 与 Vuex；样式为 Tailwind CSS 3、SCSS、Radix Colors；组件展示使用 Histoire。
- 后端：Ruby on Rails；实时消息沿用 Action Cable；典型部署还包含 PostgreSQL、Redis 与后台任务。前端通过 API/store 接入 conversations、contacts、inboxes、reports 等领域。
- 仓库同时包含 dashboard、widget、portal、survey、superadmin 与新版 `components-next`，不是单一 SPA 表面。
- **推断**：以 Rails 领域模型和渠道适配为中心，Vue dashboard 是操作层；实时事件更新当前队列和会话。旧/新组件与 Vuex/Pinia 并存是演进中的架构事实。

## 信息架构与布局

- 全局左导航：Conversations、Contacts、Reports、Campaigns、Automation、Help Center、Settings 等模块；顶端全局搜索与工作区/用户入口。
- 会话工作台形成四级密度：主导航 → 会话筛选/收件箱树 → 会话列表 → 消息线程；右侧再加可收起的客户上下文。
- 官方 101 文档明确会话视图包含：队列标签（Mine/Unassigned/All）、状态（Open/Pending/Snoozed/Resolved）、消息线程、回复框和右侧客户详情/历史/分配/标签/状态。
- Inbox 是渠道实例，Conversation 隶属 Inbox；Team、Assignee、Label 与 Folder 作为路由和过滤维度，而非平铺成顶级页面。
- **观察**：导航优先服务“下一条该处理什么”，而不是展示产品功能。未分配、未回复、提及、SLA 等状态直接成为队列。

## 视觉系统

### 色彩

- 新设计系统使用 Radix 风格 12 级 CSS 色阶；精确品牌色为 `#2781F6`，同时有 slate、iris、blue、ruby、amber、teal、gray、violet 的亮暗 token。
- 精确浅色基础：背景 `247 247 247`，surface `254/255 255 255`，强/弱边界 `226 227 231` / `234 234 234`；暗色由 `.dark` 下对应 token 替换。
- 语义色分为 surface、solid、border、text、overlay、call-widget 等，客服状态/提醒不会只依赖单一品牌蓝。

### 字体与字号

- 默认 sans 是系统字体栈；另有 **Inter Variable（100–900）**、InterDisplay。
- 额外字重精确为 `420 / 440 / 460 / 520 / 620`，便于密集界面做细粒度层级。
- 消息 bubble 正文精确 `14px`、行高 `1.6`；H1 `1.25rem`，H2/H3 `1rem`。Tailwind 另扩展 `xxs=0.625rem`、`xxxs=0.5rem`。

### 间距、尺寸、圆角与阴影

- 项目沿用 Tailwind spacing，并在组件中大量使用 utility；没有在配置中覆写统一 spacing/radius/shadow 阶梯。
- 消息富文本中的精确局部值：inline code padding `0.2em 0.4em`、圆角 `4px`；pre padding `1em`、圆角 `6px`；表格单元格 padding `0.75em`。
- 模态遮罩精确为浅色 `rgba(0,0,0,.4)`、暗色 `rgba(0,0,0,.6)`。
- **观察**：新版区域用低对比 surface、细边界和小/中圆角；工作台不依赖大阴影。由于 legacy SCSS 与 next tokens 并存，不能假设所有页面都遵循同一圆角。

## 关键组件与交互

- 会话列表：未读、渠道图标、联系人、摘要、时间、分配/SLA 状态；支持复杂筛选与保存 Folder。
- ReplyBox：Reply/Private Note 模式、富文本、附件、emoji、canned response、mention、宏、语音/渠道限制；发送是高风险高频动作。
- Context panel：联系人属性、历史会话、标签、团队/agent 分配、状态、SLA、外部 dashboard app。
- 实时协作：新消息、typing、assignment、presence 和通知通过实时通道更新；操作后就地更新队列。
- 报表复用统一过滤框架：日期、粒度、业务时间与实体过滤；不同报表保持一致扫描路径。

## 响应式与可访问性

- 精确断点：`xs 480px`、`sm 640px`、`md 768px`、`lg 1024px`、`xl 1280px`、`2xl 1536px`、`3xl 1900px`。
- 小屏通过收起右侧上下文、把列表与线程切成前后页面维持可读性；官方文档也明确右侧上下文面板可收起。
- Vue 组件普遍使用语义按钮、label、tooltip 与 i18n；Iconify/Lucide 等图标需要逐个保证 accessible name。
- 风险：仓库未在本次资料中给出统一 WCAG 等级；超小 `0.5rem/0.625rem` token 若用于关键正文会有可读性问题。多渠道编辑器、弹层与 legacy/new 组件并存也增加焦点一致性风险。

## 值得复用与应避免的做法

**可借鉴**

- 以“责任与状态”组织消息：Mine、Unassigned、Open、Snoozed、SLA 比按模块导航更贴近客服任务。
- 四段式工作台让列表扫描、回复、客户上下文同时可见；右栏必须可收起。
- 12 级颜色原语之上建立 surface/text/border/solid 语义，适合高密度亮暗主题。
- Reply 与 Private Note 明确分段，降低把内部消息发给客户的灾难性错误。

**风险/不宜照搬**

- 四列布局只适合宽屏；小屏必须转成有清晰返回路径的状态机。
- Vuex/Pinia、旧 SCSS/next token、dashboard/components-next 并存会制造重复组件和视觉漂移。
- open-core 的企业目录许可与社区 MIT 边界必须逐文件确认。
- 状态色、图标和文案应三重表达，不能只靠颜色区分 Open/Pending/SLA。

## 证据与来源

- 仓库、许可与热度：[仓库](https://github.com/chatwoot/chatwoot)、[`LICENSE`](https://github.com/chatwoot/chatwoot/blob/develop/LICENSE)、[GitHub API](https://api.github.com/repos/chatwoot/chatwoot)
- 官方产品信息：[Chatwoot 101](https://www.chatwoot.com/hc/user-guide/en/categories/chatwoot-101)、[Adding inboxes](https://www.chatwoot.com/hc/user-guide/articles/1677492191-adding-inboxes)、[First conversation](https://www.chatwoot.com/hc/user-guide/articles/1677229173-lesson-1-your-first-chatwoot-conversation)
- 关键源码：[`package.json`](https://github.com/chatwoot/chatwoot/blob/develop/package.json)、[`tailwind.config.js`](https://github.com/chatwoot/chatwoot/blob/develop/tailwind.config.js)、[`theme/colors.js`](https://github.com/chatwoot/chatwoot/blob/develop/theme/colors.js)、[`_next-colors.scss`](https://github.com/chatwoot/chatwoot/blob/develop/app/javascript/dashboard/assets/scss/_next-colors.scss)、[`inter.scss`](https://github.com/chatwoot/chatwoot/blob/develop/app/javascript/shared/assets/fonts/inter.scss)
- 关键路径：[`app/javascript/dashboard/`](https://github.com/chatwoot/chatwoot/tree/develop/app/javascript/dashboard)、[`components-next/`](https://github.com/chatwoot/chatwoot/tree/develop/app/javascript/dashboard/components-next)、[`ReplyBox.vue`](https://github.com/chatwoot/chatwoot/blob/develop/app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue)

---

# Mattermost

## 基本信息

- GitHub：https://github.com/mattermost/mattermost
- 产品类型：面向组织的频道通信、线程、协作工作流、通话/插件与 AI Agent 平台。
- 采集分支：`master`；采集日期：2026-08-30。
- 开源许可：根许可为复合政策。自行编译的平台源码通常按 **AGPLv3（带官方例外）或商业许可**；`webapp/`、`server/templates/`、`server/i18n/`、`server/public/` 等管理工具/配置源码按 **Apache-2.0**；Mattermost 官方提供的编译版本按 MIT。商标另受官方规范约束。
- 热度：约 **3.9 万 Stars、9.0 千 Forks**。

## 技术栈与架构

- Web 前端：**React 18 + TypeScript + Redux 5 + React Router 5 + SCSS**；Webpack 构建。依赖包括 React Window、Floating UI、Tiptap、Monaco、styled-components 与仍在使用的 Bootstrap/React Bootstrap。
- 新代码偏函数组件、hooks、Redux selectors、异步代码分割；服务端数据放 `state.entities`，视图状态放 `state.views`。HTTP 通过 Client4/Redux actions，实时消息通过 WebSocket。
- 后端主体是 Go，提供 REST/WebSocket、权限、插件与多租户/团队/频道领域。仓库中 webapp、server、API、插件/e2e 集成在一个大 monorepo。
- **推断**：Mattermost 的稳定性来自长期演进的领域与插件合同，但 React Router 5、Bootstrap、Redux 与新共享组件并存，使前端不是纯净的现代重写。

## 信息架构与布局

- 官方用户文档的桌面示意是：最左团队栏（多团队时）→ 频道侧栏 → 中央活动频道消息流 → 右侧线程/信息面板；顶端全局栏提供搜索、产品/应用和用户操作。
- 频道侧栏以类别组织 public/private channels 与 direct/group messages，可自定义类别、排序、拖拽、折叠、静音和单独聚合 Unreads。
- 中央消息流保持时间序；频道头承载标题、成员、搜索/固定消息等上下文；composer 固定在底部。
- Threads 是独立统一收件箱，也可在右侧 pane 打开单条线程；官方文档说明左右侧栏均可调整宽度。
- Agent 能以应用侧栏、DM bot 或频道 `@mention` 进入，回复留在线程中，避免 AI 对话污染主频道。

## 视觉系统

### 色彩

- 默认主题精确值：sidebar `#145dbf`、sidebar header `#1153ab`、team bar `#0b428c`、button `#166de0`、link `#2389d7`、中心背景 `#fff`、中心文字 `#3d3c40`。
- 状态精确值：online `#06d6a0`、away `#ffbc42`、DND `#d24b4e`（官方主题 JSON 中为 `#f74343`，源码同时保留不同变量）、new-message separator `#f80`、mention highlight `#ffe577`。
- 每个主题色还有 `-rgb` 变量供透明度组合；官方 style guide 要求主题区域使用 CSS 变量而非硬编码。

### 字体与字号

- 正文字体为 **Open Sans**，标题/部分品牌层级使用 **Metropolis**；两者在仓库内定义多种字重/样式。
- 精确局部字号包括 `.small = 12px`；共享 mixin 中出现 `11/12/14/16/18px` 等组件尺寸。项目 style guide 承认单位仍不统一且 `px` 最常见，因此不将这些值误称为完整字号 token 阶梯。

### 间距、尺寸、圆角与阴影

- 精确圆角 token：`2 / 4 / 8 / 12 / 16px` 与 `50%`（`xs/s/m/l/xl/full`）。
- 精确 elevation：`0 2px 3px rgba(0,0,0,.08)`、`0 4px 6px rgba(0,0,0,.12)`、`0 6px 14px rgba(0,0,0,.12)`、`0 8px 24px rgba(0,0,0,.12)`、`0 12px 32px rgba(0,0,0,.12)`、`0 20px 32px rgba(0,0,0,.12)`。
- 边界分为默认/浅/深：中心文字色的 `12% / 8% / 16%` 透明度。
- 未在检查的核心 token 中发现统一 spacing scale；官方 style guide 也承认硬编码与单位仍在治理中。

## 关键组件与交互

- 频道侧栏：类别、未读/提及 jewel、presence、拖拽多选、静音、排序与过滤。
- Post：hover action bar、reaction、reply/thread、save/pin、priority、acknowledgement、file preview、编辑/删除。
- Composer：Markdown、mention、emoji/GIF、附件、语音、优先级与定时发送；发送动作紧贴频道上下文。
- Thread pane/Threads view：保留主频道阅读位置，同时处理支线对话；follow/unfollow 与未读状态降低遗漏。
- 搜索、快捷切换、通知与全局 header 为跨频道导航；插件可在 header、post、sidebar 等位置注册组件。

## 响应式与可访问性

- Web 窄屏把并排 pane 转为单 pane 导航；原生移动端是独立 React Native 仓库，不能把 Web 响应式等同于完整移动产品。
- 官方 Web style guide 明确要求语义 HTML、短 accessible name、`aria-describedby`、可见焦点、标准键盘模式和模态焦点返回。
- `A11yController` 支持 F6/Shift+F6 在主要区域间移动，列表用方向键，modal/popup 限制全局导航；测试优先 `getByRole` 并断言 ARIA。
- 风险：同一 style guide 明确记录 300+ `!important`、硬编码 radius/shadow、散落媒体查询、旧选择器和部分未类型化代码。这些是官方自认的技术债，而非推测。

## 值得复用与应避免的做法

**可借鉴**

- 频道类别、Unreads 和 Threads 分别解决“组织空间”“待处理消息”“支线对话”，职责清晰。
- 主题色成对提供 hex 与 RGB token，可安全生成透明 hover/selected 层。
- 区域级 F6 导航非常适合多 pane 企业工作台。
- AI 通过 DM、mention 与右侧 pane 进入，并复用线程上下文，而不是另造孤立聊天产品。

**风险/不宜照搬**

- 多栏常驻会挤压消息正文；默认打开右栏时必须支持 resize、关闭和焦点恢复。
- 可深度自定义主题会产生对比度不可控组合，应运行自动 contrast 校验。
- 历史 Bootstrap、SCSS、styled-components、MUI 与新共享组件并存，不应作为新项目的依赖组合模板。
- 许可层次复杂，必须区分源码、webapp 目录、官方编译物与商标。

## 证据与来源

- 仓库、许可与热度：[仓库](https://github.com/mattermost/mattermost)、[`LICENSE.txt`](https://github.com/mattermost/mattermost/blob/master/LICENSE.txt)、[GitHub API](https://api.github.com/repos/mattermost/mattermost)
- 官方界面：[End User Guide](https://docs.mattermost.com/end-user-guide/end-user-guide-index.html)、[Channel sidebar](https://docs.mattermost.com/end-user-guide/preferences/customize-your-channel-sidebar.html)、[Threads](https://docs.mattermost.com/end-user-guide/collaborate/organize-conversations.html)、[Theme](https://docs.mattermost.com/end-user-guide/preferences/customize-your-theme.html)、[AI Agents](https://docs.mattermost.com/end-user-guide/agents.html)
- 关键源码：[`webapp/channels/package.json`](https://github.com/mattermost/mattermost/blob/master/webapp/channels/package.json)、[`STYLE_GUIDE.md`](https://github.com/mattermost/mattermost/blob/master/webapp/STYLE_GUIDE.md)、[`_css_variables.scss`](https://github.com/mattermost/mattermost/blob/master/webapp/channels/src/sass/base/_css_variables.scss)、[`_typography.scss`](https://github.com/mattermost/mattermost/blob/master/webapp/channels/src/sass/base/_typography.scss)、[`root.tsx`](https://github.com/mattermost/mattermost/blob/master/webapp/channels/src/root.tsx)

---

# Hoppscotch

## 基本信息

- GitHub：https://github.com/hoppscotch/hoppscotch
- 产品类型：REST、GraphQL、WebSocket、SSE、Socket.IO、MQTT 等协议的 API 开发与协作工作台。
- 采集分支：`main`；采集日期：2026-08-30。
- 开源许可：**MIT**。
- 热度：约 **8.0 万 Stars、6.1 千 Forks**。

## 技术栈与架构

- Monorepo 前端核心为 **Vue 3.5 + TypeScript + Vite 7 + Vue Router + Tailwind CSS 3**；共享产品代码在 `packages/hoppscotch-common`，Web 自托管和 Tauri desktop 是平台壳。
- 应用状态同时使用 RxJS/自定义 DispatchingStore、组合式服务注入（`dioc`）与 Vue composables；GraphQL 客户端为 urql。
- 编辑器包含 CodeMirror/Monaco；请求执行由 `@hoppscotch/kernel` 与 browser/proxy/agent/extension/native interceptors 抽象，避免把浏览器 CORS 限制耦合进 UI。
- 自托管后端为 NestJS/GraphQL、Prisma 与数据库；前端个人数据还有本地持久化/迁移和离线/PWA 路径。
- `@hoppscotch/ui` 是独立官方仓库/包；主仓通过 `ui-preset` 把主题 CSS 变量映射成 Tailwind 语义色。

## 信息架构与布局

- 顶部 Header 提供产品/工作区、环境、搜索/Spotlight、账户与全局操作；左侧 Sidenav 在 REST、GraphQL、Realtime、Settings、Profile 等一级模式间切换。
- REST 主工作面一般是：请求标签页与 method/URL/Send 顶栏；下方请求参数 tabs（Params、Authorization、Headers、Body、Scripts、Tests）；另一 pane 展示 Response/Headers/Preview/Tests。
- Collection/History/Environment/Documentation 作为可展开侧栏或面板；用户可把侧栏放左/右，并选择 row/column 布局与 Zen mode。
- `default.vue` 使用嵌套 Splitpanes。桌面侧导航常驻、footer 在底部；小于 `md` 时导航固定到底部，请求布局强制 column，右侧栏关闭。
- Realtime 再分 WebSocket、SSE、Socket.IO、MQTT；GraphQL 提供 query、variables、headers、schema/docs explorer，沿用同一工作台骨架。

## 视觉系统

### 色彩

- 精确基础主题：Light 主背景为 Tailwind white，contrast `#fdfdfd`；Dark 主背景 `#181818`、light `#1c1c1e`、popover `#1b1b1b`；Black 主背景/contrast `#0f0f0f`。
- accent 可选 emerald、teal、blue、indigo、purple、amber、orange、red、pink 的 Tailwind 500，hover/light 用 400、active/dark 用 600。
- HTTP method 与 status 使用独立语义色，如 light theme GET green-500、POST amber-500、DELETE red-500；Dark 中切到 emerald/yellow/rose，保证不同底色上的辨识。
- **观察**：背景几乎无彩，彩色只标识 method、status、accent 和反馈，适合开发工具快速扫描。

### 字体与字号

- 精确字体：`Inter Variable`（sans）、`Roboto Mono Variable`（mono）。
- 精确字号：body `0.75rem`（12px）、tiny `0.625rem`（10px），body 行高 `1rem`（16px）。
- **风险**：12px/10px 虽提高信息密度，但在高 DPI、中文、视力受限或远距离屏幕上可能过小；应提供缩放或密度档位。

### 间距、尺寸、圆角与阴影

- 官方 UI preset 在 Tailwind 默认 spacing 上新增精确 `0.0625rem`、`0.1875rem`、`5rem`、`6.5rem`、`11.5rem`；也定义对应 min/max 尺寸。
- 精确布局高度 token：主 sticky fold `4.125rem`，移动主 fold `6.75rem`，下部主 fold `3rem`，sidebar fold `2rem`；说明其密集窗格尺寸经过显式建模。
- UI preset 没有覆写 Tailwind 圆角或阴影，因此这些主要继承所锁定的 Tailwind 3 默认并由组件 utility 选用；不在此把依赖默认值包装为 Hoppscotch 自有 token。
- **观察**：应用主要靠 1px divider、背景轻微变化和 split pane 分隔，阴影集中在 popover/tooltip，而不是把每个区域卡片化。

## 关键组件与交互

- Method + URL + Send 是最强视觉主轴；请求未完成时 Send 切成停止/加载反馈。
- 参数 smart table 支持键值开关、批量编辑、拖拽排序、secret/环境变量和上下文菜单。
- Splitpanes 支持水平/垂直工作方式；Response 对状态、耗时、大小、body 类型进行多维呈现。
- Collections、Environments、History、Workspace 在个人/团队范围间切换；请求可保存、分享、生成代码、导入 cURL/Postman/OpenAPI。
- Spotlight/命令菜单与全局快捷键覆盖导航、请求、tab、environment、theme 和 workspace 操作。

## 响应式与可访问性

- 精确响应断点：官方 UI preset 增加 `<sm = max 640px`；布局源码使用 Tailwind `md`，并在 `@media (min-width: 768px)` 清除移动 footer spacer。
- 小屏把左侧纵向导航改到底部，关闭右侧栏，强制 column layout；这是工作流重排，不是简单缩放。
- `default.vue` 为主内容使用 `<main role="main">`；组件大量使用原生 button/input、tooltip、i18n 与键盘 action handler。
- 风险：密集表格、拖拽、代码编辑器和 split pane 对键盘/屏幕阅读器挑战大；本次未找到官方 WCAG 合规级别。10px tiny 字号也需要特别审查。

## 值得复用与应避免的做法

**可借鉴**

- 以可切换 row/column 的 split pane 同时支持宽屏并排与窄屏顺序工作流。
- 将网络执行差异抽象为 interceptor；UI 只选择策略并显示状态。
- Method、status、accent 三套颜色语义分离，避免所有重要信息争夺一个品牌色。
- 底部移动导航 + 强制 column + 隐藏次要侧栏形成完整窄屏策略。
- 命令菜单和快捷键覆盖高频动作，非常适合开发者工具。

**风险/不宜照搬**

- 12px 正文与 10px tiny 不适合作为面向大众产品的默认值。
- Vue、RxJS、自定义 store、DI 和多平台壳并存，理解状态来源需要较高成本。
- UI preset 位于独立仓库，版本不同步时可能出现 token/组件漂移。
- 允许脚本、环境变量、代理与导入外部 collection，必须对 secret 泄露、脚本沙箱、SSRF 与不可信文档做边界设计。

## 证据与来源

- 仓库、许可与热度：[仓库](https://github.com/hoppscotch/hoppscotch)、[`LICENSE`](https://github.com/hoppscotch/hoppscotch/blob/main/LICENSE)、[GitHub API](https://api.github.com/repos/hoppscotch/hoppscotch)
- 关键源码：[`package.json`](https://github.com/hoppscotch/hoppscotch/blob/main/package.json)、[`hoppscotch-common/package.json`](https://github.com/hoppscotch/hoppscotch/blob/main/packages/hoppscotch-common/package.json)、[`default.vue`](https://github.com/hoppscotch/hoppscotch/blob/main/packages/hoppscotch-common/src/layouts/default.vue)、[`main.ts`](https://github.com/hoppscotch/hoppscotch/blob/main/packages/hoppscotch-selfhost-web/src/main.ts)
- 主题与 token：[`base-themes.scss`](https://github.com/hoppscotch/hoppscotch/blob/main/packages/hoppscotch-common/assets/themes/base-themes.scss)、[`accent-themes.scss`](https://github.com/hoppscotch/hoppscotch/blob/main/packages/hoppscotch-common/assets/themes/accent-themes.scss)、[官方 `hoppscotch/ui` preset](https://github.com/hoppscotch/ui/blob/main/ui-preset.ts)
- 关键组件路径：[`AppHeader.vue`](https://github.com/hoppscotch/hoppscotch/blob/main/packages/hoppscotch-common/src/components/app/Header.vue)、[`AppSidenav.vue`](https://github.com/hoppscotch/hoppscotch/blob/main/packages/hoppscotch-common/src/components/app/Sidenav.vue)、[`PaneLayout.vue`](https://github.com/hoppscotch/hoppscotch/blob/main/packages/hoppscotch-common/src/components/app/PaneLayout.vue)、[`SpotlightSearch.vue`](https://github.com/hoppscotch/hoppscotch/blob/main/packages/hoppscotch-common/src/components/app/SpotlightSearch.vue)

---

# 跨项目结论

## 可直接转化为产品原则

1. **把主对象留在中心。** 画布、对话、消息流、会话线程、请求/响应都占据最大空间；导航与设置服务主对象，而不是把它切碎成卡片。
2. **高密度依赖可收起面板。** 六个项目都使用侧栏、抽屉、弹层或 split pane；真正重要的是稳定的打开/关闭、resize、焦点恢复与小屏替代路径。
3. **状态要语义化。** 设计器的 selected/focus/disabled、客服的 open/pending/SLA、通信的 unread/mention/presence、API 的 method/status 都需要独立 token、图标与文案。
4. **命令入口要多通道。** 图标、菜单、快捷键、命令面板、上下文菜单与触控不能互相替代；专业工具通过冗余入口换取效率与可发现性。
5. **主题先做语义映射。** Penpot、Mattermost、Hoppscotch 都证明，组件应消费 background/foreground/accent/status，而不是直接消费某个蓝色阶。
6. **移动端需要重排工作流。** Hoppscotch 强制 column、Open WebUI 抽屉化、Chatwoot/Mattermost 单 pane 化；简单缩放桌面多栏会失败。

## 共同风险

- 大型成熟项目普遍处于新旧设计系统并存阶段：直接复制源码会把技术债一起带走。
- Canvas、代码编辑器、拖拽树、虚拟列表与复杂弹层是可访问性高风险区；必须用真实键盘、屏幕阅读器和缩放场景验证。
- “开源仓库”不等于所有目录、品牌、编译物和企业功能同一许可。Open WebUI、Chatwoot、Mattermost 尤其需要逐层核对。
- 小字号和低对比灰在专业工具里常见，但密度不应凌驾于可读性；建议提供 UI scale/comfortable density，并自动检查对比度。
- 插件、脚本、工具、代理、AI/RAG 与第三方内容会把 UI 问题升级为安全问题：所有 HTML/Markdown、文件、URL、secret 和执行入口都需明确可信边界。

## 选型式借鉴建议

| 目标 | 优先参考 | 原因 |
|---|---|---|
| 无限画布与设计交付 | Penpot | 模式、图层树、属性侧栏、设计 token/Inspect 全链路 |
| 极简创作与嵌入式画布 | Excalidraw | 画布优先、工具岛、可嵌入 API、低视觉噪声 |
| AI 对话与模型/工具上下文 | Open WebUI | 输入上下文、流式消息、多内容渲染、管理分层 |
| 高吞吐客服工作台 | Chatwoot | 队列驱动、四段式会话视图、客户上下文与状态路由 |
| 大规模频道通信与键盘导航 | Mattermost | 类别/未读/线程分工、主题系统、区域级 a11y 导航 |
| API/开发者分窗工具 | Hoppscotch | split pane、协议模式、interceptor、命令菜单与窄屏重排 |
