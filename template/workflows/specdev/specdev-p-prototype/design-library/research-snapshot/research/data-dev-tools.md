# 数据与开发工具类热门开源产品 UI 研究

> 研究对象：Supabase Studio、Grafana、Metabase、DBeaver、Directus、Appsmith，以及“DBX”的产品识别与主候选研究
>
> 截止日期：2026-08-30（Asia/Shanghai）
>
> 研究依据：各项目 GitHub 默认分支在本次研究时的最新提交、仓库许可证文件、前端依赖清单、主题/设计 token、应用壳与导航源码、官方文档。GitHub 热度是当日截面，以下均按约数表述。

## 口径与结论先读

- **源码值**：能在本报告链接的源码或官方 token 中直接找到；保留原单位和颜色格式。
- **观察**：由主布局、导航、组件或官方产品界面综合归纳，不冒充官方设计规范。
- **推断**：由代码组织和交互状态推导，可能随版本、实验开关、部署形态或系统主题变化。
- “开源”采用许可证事实而非营销称呼。**Directus 当前默认分支根许可证是 MSCL-1.0-GPL，含竞争性使用限制和四年后 GPL-3.0 的未来授权，不是 OSI 意义上的无条件开源许可证**。旧页面仍可能显示 BSL 1.1，评估时必须以所用版本的 `license` 文件为准。
- 六个指定产品中，最值得抽取成通用数据工具设计骨架的是：Supabase 的“产品轨 + 场景侧栏 + 工作区”、Grafana 的主题契约与可停靠导航、Metabase 的低门槛分析流程、DBeaver 的高密度多窗格、Directus 的 schema 驱动扩展机制、Appsmith 的“实体树 + 画布 + 属性面板”。DBX 则提供更轻量、现代桌面数据库客户端的参考。

## 横向速览

| 产品 | 官方仓库 / 当日约数级热度 | 许可证（当前仓库） | 前端/桌面技术栈摘要 | 主 UI 范式 |
| --- | --- | --- | --- | --- |
| Supabase Studio | [supabase/supabase](https://github.com/supabase/supabase)，约 **108.6k stars** | Apache-2.0 | TypeScript、React、Next.js 与 TanStack Start 双构建、Vite、Tailwind CSS 4、Radix、TanStack Query/Router/Table/Virtual、Monaco、React Data Grid | 产品级导航轨 + 模块侧栏 + 主工作区 + 可调整右侧面板 |
| Grafana | [grafana/grafana](https://github.com/grafana/grafana)，约 **76.5k** | AGPL-3.0-only | TypeScript、React 19、Emotion、Redux、RxJS、Grafana UI/Data、Rspack/Webpack；Go 后端 | 顶栏 + 可浮动/停靠 Mega Menu + 页面/仪表盘画布 + 可扩展侧栏 |
| Metabase | [metabase/metabase](https://github.com/metabase/metabase)，约 **49.0k** | 核心 AGPL；`enterprise/` 为 Metabase Commercial License | TypeScript、React 18、Mantine 8、CSS Modules、Redux Toolkit/RTK Query、ECharts/Visx、CodeMirror；Clojure 后端 | 应用栏 + 收藏/集合侧栏 + 查询/仪表盘工作区 |
| DBeaver Community | [dbeaver/dbeaver](https://github.com/dbeaver/dbeaver)，约 **51.6k** | Apache-2.0；捆绑组件另有 EPL/LGPL 等 | Java、Eclipse RCP、SWT/JFace、OSGi、GEF、Maven/Tycho | IDE 式 Perspective：对象树 + 多标签编辑器 + 底部/右侧视图 |
| Directus | [directus/directus](https://github.com/directus/directus)，约 **35.9k** | **MSCL-1.0-GPL（source-available，非宽松开源）** | Vue 3、Vite、Pinia、Vue Router、Reka UI、SCSS、CodeMirror、Tiptap、MapLibre、ApexCharts | 模块导航轨 + 集合导航 + 多布局内容区 + 上下文侧栏 |
| Appsmith | [appsmithorg/appsmith](https://github.com/appsmithorg/appsmith)，约 **40k** | Apache-2.0 | React 17、Redux/Redux-Saga、styled-components、ADS/WDS、Blueprint、CodeMirror、ECharts；Java 服务端 | IDE 式低代码构建器：实体/组件侧栏 + 画布 + 属性面板 + 调试器 |
| DBX（主候选） | [t8y2/dbx](https://github.com/t8y2/dbx)，约 **16.3k** | Apache-2.0 | Vue 3、Tauri 2/Rust、Vite 8、Tailwind 4、shadcn-vue/Reka UI、Pinia、CodeMirror 6、虚拟滚动 | 连接树 + 标签栏 + SQL/数据主区 + 多个可调右侧工具面板 |

热度仅表示社区可见度，不能替代维护质量、许可证适配、代码成熟度或目标用户匹配度。

## “DBX”核查

### 最可能对应：t8y2/dbx

在“数据与开发工具类 GUI 产品”语境下，最强匹配是 [t8y2/dbx](https://github.com/t8y2/dbx)：仓库描述与官方站点均定位为轻量跨平台数据库客户端，覆盖 90+ 数据库，具有 SQL 编辑、数据网格、schema 浏览、ER 图、迁移/导入导出、AI、MCP、CLI、桌面与 Docker/Web 形态。仓库约 16.3k stars，远高于其他同名 GUI 项目，且产品名就是大写 **DBX**。

### 容易混淆的其他含义

| 候选 | 是什么 | 为什么不是本报告主对象 |
| --- | --- | --- |
| [Dbxstudio/dbx-studio](https://github.com/Dbxstudio/dbx-studio) | 约 73 stars 的 AI SQL 客户端；React 18 + Vite，桌面端 Electron，Bun/Hono API，Apache-2.0 | 名称相近且同属数据库 GUI，但热度、成熟度和品牌一致性明显弱于 `t8y2/dbx`；应在用户明确说“dbx Studio”时再切换 |
| [pocketbase/dbx](https://github.com/pocketbase/dbx) | Go 的数据库查询构建/访问库 | 无 GUI，不适合作为 UI 竞品 |
| [spacemonkeygo/dbx](https://github.com/spacemonkeygo/dbx) / [xiuno/dbx](https://github.com/xiuno/dbx) | Go 代码生成器或数据库库 | 无产品级前端 |
| Unix `dbx` | 源码级调试器名称 | 是历史工具/缩写，不是现代数据管理 UI |
| Databricks Labs `dbx` | Databricks 工作流/部署工具的旧缩写 | 属 CLI/工程工具语境，不等同于数据库客户端 |

因此，后文“DBX”默认指 `t8y2/dbx`；若原始需求来自截图、品牌清单或采购表，仍建议用仓库 URL 二次确认。

## 1. Supabase Studio

研究基线：提交 [`86c813e`](https://github.com/supabase/supabase/tree/86c813ec03e340ffbe4aeb97cd0c5bee7a0ead94)，提交时间 2026-08-28。

### 技术栈与应用架构

- Studio 是 Supabase 大型 pnpm/Turborepo 中的独立应用。`apps/studio/package.json` 同时保留 Next.js 与 TanStack Start/Vite 的脚本，说明正处于双运行时/迁移兼容阶段；UI、图标、配置、共享数据分别通过 workspace package 复用。
- React 数据层以 TanStack Query 为主，路由同时存在 Next 与 TanStack Router 适配；表格使用 React Data Grid、TanStack Table/Virtual，SQL/函数编辑使用 Monaco，ER/流程使用 XYFlow/Dagre。**推断：**高复杂页面按产品域拆分，通用外壳和数据访问层共享，能支撑云端 Studio 与自托管差异。
- 主要信息架构按产品域组织：Table Editor、SQL Editor、Database、Authentication、Storage、Edge Functions、Realtime、Logs/Observability、Advisors、Settings。命令文件（如 `*.Commands.tsx`）把全局命令面板作为跨页面快速入口。

### 导航、布局与交互

- **观察：**桌面端形成三层层级：最左全局/产品入口，第二层当前模块菜单，中央为高密度工作区；表格、SQL、日志页面可再打开右侧详情/助手面板。
- `ProductMenuBar` 是纵向模块栏，标题区最小高度引用 `--header-height`，左右 `24px` 内边距，内容区独立滚动。全局 token 将 `--header-height` 定为 **3rem（48px）**。
- 右侧 `LayoutSidebar` 用可调整面板实现，默认/最小/最大尺寸为 **30/30/50**（组件传给 panel 的比例值）；在 `md` 以下不渲染桌面侧栏，改由移动 Sheet 承载。桌面宽度还分 `md: 1/2`、`lg: 2/5`、`xl` 回到文档流。
- 移动端导航是 **48px** 高横栏，项目/组织选择保留，菜单进入 Sheet，并有浮动工具栏；图标源码值为 **20px、1.5 stroke**。这不是简单压缩桌面导航，而是重排任务入口。
- 关键交互包括：可调整面板、树形 SQL snippet、虚拟表格、行内编辑、筛选排序、命令面板、连接弹层、分支切换、状态/故障横幅、AI 助手。

### 视觉系统（源码值）

| 维度 | 事实 |
| --- | --- |
| 颜色 | 语义层使用 `background/foreground/border/brand/warning/destructive` 变量；Studio 另有 `surface-100/200/300` 与 `bg-alternative` 数据网格框架层。Classic Dark 的 brand 为 `hsl(153.1deg 60.2% 52.7%)`，warning 为 `hsl(38.9deg 100% 57.1%)`，destructive 为 `hsl(10.2deg 77.9% 53.9%)`。官方文档明确建议用已做对比度检查的语义类，不直接选 palette。
| 字体 | 正文 **Inter 100–900**；标题 **Manrope 200–800**；代码 **Source Code Pro 200–900**，均自托管。正文 token：`sm 13px`、`base 15px`、`lg 16px`、`xl 18px`、`2xl 22px`、`3xl 28px`、`4xl 34px`，正常字重覆盖为 **450**；网格文本 **13px**。
| 间距 | Tailwind 实用类为主；明确的布局 token 有 `--spacing-content: 21px`，模块栏标题 `px-6`（24px）、常见 `gap-2`（8px）。不应把个别页面实用类推成完整官方尺度。
| 圆角 | 配置提供 `--radius-panel: 6px`；大量控件使用 `rounded-md`。完整 `rounded-md` 映射依赖所用 Tailwind/theme 构建，本文不猜固定像素。
| 阴影 | 整体主要靠边框与分层背景；移动顶栏源码使用 `0 0 30px 0 rgba(0,0,0,.07)`，表单常用 `shadow-xs`。没有从所审文件中发现一套独立、稳定的全局阴影阶梯。

### 响应式与可访问性

- 官方设计系统清单覆盖键盘、屏幕阅读器、可缩放文本、小设备；提供 `focus-ring`（2px ring + 2px offset）和密集表格行的 `focus-inset`（2px 内描边）两种配方。
- 文档明确要求 `:focus-visible`、可操作行的 Enter/Space、`aria-label`/`aria-hidden`/`sr-only`、radio roving focus、长列表搜索/分页/虚拟化，以及持久顶栏/侧栏页面的 skip link。
- **风险：**Studio 功能密度很高，移动方案更适合查看和轻操作，复杂表结构、SQL、多窗格工作流仍天然偏桌面；双路由/双构建时期也增加视觉回归与状态一致性成本。

### 可借鉴点

1. 以稳定产品轨承载领域切换，以第二侧栏承载当前上下文，避免把所有层级塞进一个导航。
2. 数据网格使用独立 frame/background 语义，能在空白区域建立深度，不依赖卡片阴影。
3. 将命令面板与页面内导航并行设计，适合熟练用户高频操作。
4. 移动端保留“当前组织/项目 + 关键动作”，其余进入 Sheet，比等比缩小桌面壳更可靠。

### 关键来源

- [Studio 依赖与构建](https://github.com/supabase/supabase/blob/86c813ec03e340ffbe4aeb97cd0c5bee7a0ead94/apps/studio/package.json)
- [全局字体与字号 token](https://github.com/supabase/supabase/blob/86c813ec03e340ffbe4aeb97cd0c5bee7a0ead94/apps/studio/styles/globals.css)、[字体声明](https://github.com/supabase/supabase/blob/86c813ec03e340ffbe4aeb97cd0c5bee7a0ead94/apps/studio/styles/fonts.css)
- [主题映射](https://github.com/supabase/supabase/blob/86c813ec03e340ffbe4aeb97cd0c5bee7a0ead94/packages/config/css/theme.css)、[Classic Dark](https://github.com/supabase/supabase/blob/86c813ec03e340ffbe4aeb97cd0c5bee7a0ead94/packages/ui/build/css/themes/classic-dark.css)
- [颜色使用文档](https://github.com/supabase/supabase/blob/86c813ec03e340ffbe4aeb97cd0c5bee7a0ead94/apps/design-system/content/docs/color-usage.mdx)、[可访问性文档](https://github.com/supabase/supabase/blob/86c813ec03e340ffbe4aeb97cd0c5bee7a0ead94/apps/design-system/content/docs/accessibility.mdx)
- [模块栏](https://github.com/supabase/supabase/blob/86c813ec03e340ffbe4aeb97cd0c5bee7a0ead94/apps/studio/components/layouts/Navigation/ProductMenuBar.tsx)、[移动导航](https://github.com/supabase/supabase/blob/86c813ec03e340ffbe4aeb97cd0c5bee7a0ead94/apps/studio/components/layouts/Navigation/NavigationBar/MobileNavigationBar.tsx)、[可调整侧栏](https://github.com/supabase/supabase/blob/86c813ec03e340ffbe4aeb97cd0c5bee7a0ead94/apps/studio/components/layouts/ProjectLayout/LayoutSidebar/index.tsx)

## 2. Grafana

研究基线：提交 [`5e3a02f`](https://github.com/grafana/grafana/tree/5e3a02f81d2aadf4bf24fe49ed97d872556f5bf9)，提交时间 2026-08-29。

### 技术栈与应用架构

- 前端是 React 19 + TypeScript，大型 monorepo 通过 `@grafana/data`、`@grafana/ui`、runtime、schema 与插件 API 分层；Emotion 承担主题化样式，Rspack/Webpack 构建，Go 提供服务端。
- `createTheme()` 组合 colors、spacing、shape、typography、shadows、breakpoints、transitions、components、visualization，主题对象同时给核心产品和插件。架构价值不只在 token，而在**插件也必须通过同一主题契约工作**。
- AppChrome 统一 Mega Menu、顶栏、面包屑、页面主区、Scopes、命令面板和扩展侧栏；插件/扩展可注入导航和工具，不必各自重造壳。

### 导航、布局与交互

- **观察：**Grafana 从旧式图标侧栏演进到可搜索的 Mega Menu。菜单可浮层打开，也可在 `xl` 及以上停靠；源码固定宽 **320px**，小屏会自动取消停靠。
- 顶部单行/双行工具栏承载面包屑、时间范围、刷新、分享、编辑等高频动作；中央 dashboard 以 panel 网格为核心，Explore 等页面切换为全高工作区。
- 扩展侧栏在小屏作为浮层，在桌面使用可拖拽宽度的 `Resizable`。主内容通过 `main#pageContent` 明确 landmark，并可进入 chromeless/kiosk/fullscreen workspace。
- Mega Menu 支持收藏固定、隐藏、分区折叠、拖拽重排、编辑/保存/重置；这是“导航可个性化”而非单纯树菜单。

### 视觉系统（源码值）

| 维度 | 事实 |
| --- | --- |
| 颜色 | 深色 canvas/page/primary/secondary 为 `#111217 / #181b1f / #181b1f / #22252b`；浅色 canvas/page/primary/secondary 为 `#fbfbfb / #fff / #fff / #f4f5f5`。深色主蓝 `#3d71d9`、链接蓝 `#6e9fff`；浅色主蓝 `#3871dc`、链接蓝 `#1f62e0`；警示橙两种模式均以 `#ff9900` 为主值。边框、文本和 action 状态使用 alpha 语义变量。
| 字体 | 正文 **Inter / Helvetica / Arial**，代码 **Roboto Mono**；基础 **14px**。H1–H6 为 **28/24/22/18/16/14px**，对应行高 **32/28/24/22/22/22px**；正文 14/22px，小正文 12/18px。源码默认 regular 400、medium/bold 都是 500。
| 间距 | 8px 基准；token 为 **0、2、4、8、12、16、20、24、32、40、48、64、80px**。
| 圆角 | `sm 4px`、`default/md 6px`、`lg 10px`、pill 9999px、circle 100%。旧 `borderRadius(amount)` 按 6px 倍数计算。
| 阴影 | 深色 z1/z2/z3：`0 1px 2px rgba(1,4,9,.75)`、`0 4px 8px rgba(1,4,9,.75)`、`0 8px 24px rgb(1,4,9)`；浅色 z1/z2/z3：`0 1px 2px rgba(24,26,27,.2)`、`0 4px 8px rgba(24,26,27,.2)`、`0 13px 20px 1px rgba(24,26,27,.18)`。

### 响应式与可访问性

- AppChrome 首个焦点提供“Skip to main content”，并把目标设为 `tabIndex=-1`；导航使用 `nav`、有名 `ul`、`aria-labelledby`/`aria-busy`，收藏与普通导航共享语义组件。
- 官方 accessibility style guide 要求键盘操作、焦点顺序、ARIA、颜色对比，并在 CI/Storybook 中运行 a11y；仓库还有 Playwright + axe 测试入口。
- **风险：**Dashboard panel、查询编辑器和插件内容的可访问性仍取决于具体可视化/插件；主题 API 向后兼容与旧 Sass/新 Emotion 并存，复制代码前需确认版本。

### 可借鉴点

1. 把主题定义为可验证的 TypeScript schema，而非散落 CSS 变量。
2. Mega Menu 同时支持搜索、收藏、重排、停靠和小屏浮层，兼顾新手发现与专家效率。
3. “canvas/page/primary/secondary/elevated”五层背景语义适合密集监控界面，减少无意义阴影。
4. 扩展点与核心导航共享组件、可访问语义和主题，适合平台型产品。

### 关键来源

- [仓库与许可证/依赖](https://github.com/grafana/grafana/blob/5e3a02f81d2aadf4bf24fe49ed97d872556f5bf9/package.json)
- [官方主题指南](https://github.com/grafana/grafana/blob/5e3a02f81d2aadf4bf24fe49ed97d872556f5bf9/contribute/style-guides/themes.md)、[可访问性指南](https://github.com/grafana/grafana/blob/5e3a02f81d2aadf4bf24fe49ed97d872556f5bf9/contribute/style-guides/accessibility.md)
- [颜色](https://github.com/grafana/grafana/blob/5e3a02f81d2aadf4bf24fe49ed97d872556f5bf9/packages/grafana-data/src/themes/createColors.ts)、[palette](https://github.com/grafana/grafana/blob/5e3a02f81d2aadf4bf24fe49ed97d872556f5bf9/packages/grafana-data/src/themes/palette.ts)、[排版](https://github.com/grafana/grafana/blob/5e3a02f81d2aadf4bf24fe49ed97d872556f5bf9/packages/grafana-data/src/themes/createTypography.ts)
- [间距](https://github.com/grafana/grafana/blob/5e3a02f81d2aadf4bf24fe49ed97d872556f5bf9/packages/grafana-data/src/themes/createSpacing.ts)、[圆角](https://github.com/grafana/grafana/blob/5e3a02f81d2aadf4bf24fe49ed97d872556f5bf9/packages/grafana-data/src/themes/createShape.ts)、[阴影](https://github.com/grafana/grafana/blob/5e3a02f81d2aadf4bf24fe49ed97d872556f5bf9/packages/grafana-data/src/themes/createShadows.ts)
- [AppChrome](https://github.com/grafana/grafana/blob/5e3a02f81d2aadf4bf24fe49ed97d872556f5bf9/public/app/core/components/AppChrome/AppChrome.tsx)、[Mega Menu](https://github.com/grafana/grafana/blob/5e3a02f81d2aadf4bf24fe49ed97d872556f5bf9/public/app/core/components/AppChrome/MegaMenu/MegaMenu.tsx)

## 3. Metabase

研究基线：提交 [`1e78c18`](https://github.com/metabase/metabase/tree/1e78c186c0c2884c19c10af3f675b7f1eafaea89)，提交时间 2026-08-29。

### 技术栈与应用架构

- 前端为 TypeScript + React 18，UI 库封装 Mantine 8；新代码优先 Mantine style props 和 CSS Modules，Emotion styled 与全局 utility 被官方开发指南标为遗留方式。数据使用 Redux Toolkit/RTK Query，图表含 ECharts、Visx、D3，SQL/模板编辑采用 CodeMirror。
- Clojure 后端与 React 前端打包为同一分析应用。领域按 collection、query builder、dashboard、admin、embedding 拆分；OSS 核心与 `enterprise/` 商业代码同仓。
- 产品架构围绕“从数据源到问题（Question），再到仪表盘与集合”的渐进式路径，图形查询器与原生 SQL 并列，弱化数据库对象管理术语。

### 导航、布局与交互

- 主应用栏源码高度 **52px**，子头 **48px**，管理导航 **65px**；经典主侧栏宽 **324px**。另一 `AreaLayout` 的展开导航宽 **300px**。
- 小屏断点 **40em**：侧栏改为绝对定位并占 **90vw**；整体断点为 xs 23em、sm 40em、md 60em、lg 80em、xl 120em。
- **观察：**左侧聚焦 Home、Collections、Bookmarks/最近项与管理入口，中央以浏览、查询、仪表盘为主；查询页面通过可视化/SQL 模式、数据预览、过滤/汇总色彩语义降低学习成本。
- 关键交互：命令面板（含主题切换）、图形查询构建、SQL 编辑、拖拽仪表盘卡片、过滤器、钻取、可视化切换、收藏/集合组织、嵌入主题实时预览。

### 视觉系统（源码值）

| 维度 | 事实 |
| --- | --- |
| 颜色 | 默认品牌蓝 `hsla(208,72%,60%,1)`；浅色页面主背景白，次背景 Orion 5 `hsla(240,11%,98%,1)`；主文本 Orion Alpha 80 `hsla(204,66%,8%,.84)`。语义色明确区分 brand、filter、summarize、positive/negative。新样式必须用 `--mb-color-*` 或 Mantine color props。
| 字体 | 默认由 `--mb-default-font-family` 控制，管理员可改实例字体；官方默认配置为 Lato。代码字体 `Monaco, monospace`（遗留栈还列 Menlo/Ubuntu Mono/Consolas/Source Code Pro）。字号 xs/sm/md/lg/xl 为 **11/12/14/17/21px**；H1–H6 为 **32/24/20/17/14/14px**。
| 间距 | Mantine 覆盖为 **4/8/16/24/32px**；遗留 utility 为 8/16/24/32px。
| 圆角 | xs **4px**、sm **6px**、md **8px**、xl **40px**。
| 阴影 | xs `0 0 0 .5px rgba(0,0,0,.07), 0 1px 3px rgba(0,0,0,.07)`；sm `0 1px 4px 2px rgba(0,0,0,.08)`；md `0 4px 20px rgba(0,0,0,.05)`。

### 响应式与可访问性

- 主题支持 light/dark/system；色彩通过语义变量联动。`prefers-reduced-motion` 会禁用动画，多数内容可放大至 200%。
- 官方可访问性页面明确承认**尚未达到 Section 508 或 WCAG 2.1 AA**：部分自定义控件/非模态对话框键盘不可用、焦点可见性不一致、表格标题语义不足、部分图像 alt/表单 label/动态状态提示不完整，文字重排也可能截断。
- 这份自我披露是重要风险信号：不能因为使用 Mantine 或已有主题系统就默认产品满足 AA。

### 可借鉴点

1. 用“问题、集合、仪表盘”而不是 database/schema/table 主导信息架构，适合业务分析用户。
2. filter、summarize 等操作语义有独立颜色，有助于理解查询构造，但应避免仅靠颜色表达。
3. 主题对象同时覆盖产品和 Embedding SDK，适合需要白标/嵌入的产品。
4. 官方直接披露无障碍缺口，值得在竞品评估中把“已知不足”作为一等资料，而非只看实现数量。

### 风险

- 同仓双许可证边界需要严格遵守，不能把 `enterprise/` 代码视作 AGPL。
- 新旧样式体系并存；复制旧 Emotion/utility 容易背离当前规范。
- 自助分析的易用抽象不等于数据库管理能力，不能直接替代 DBeaver/DBX 类客户端。

### 关键来源

- [依赖与架构线索](https://github.com/metabase/metabase/blob/1e78c186c0c2884c19c10af3f675b7f1eafaea89/package.json)、[前端开发指南](https://github.com/metabase/metabase/blob/1e78c186c0c2884c19c10af3f675b7f1eafaea89/docs/developers-guide/frontend.md)
- [许可证说明](https://github.com/metabase/metabase/blob/1e78c186c0c2884c19c10af3f675b7f1eafaea89/LICENSE.txt)
- [Mantine 主题：断点/字号/间距/圆角/阴影](https://github.com/metabase/metabase/blob/1e78c186c0c2884c19c10af3f675b7f1eafaea89/frontend/src/metabase/ui/theme.ts)、[基础色板](https://github.com/metabase/metabase/blob/1e78c186c0c2884c19c10af3f675b7f1eafaea89/frontend/src/metabase/ui/colors/constants/base-colors.ts)
- [浅色主题语义](https://github.com/metabase/metabase/blob/1e78c186c0c2884c19c10af3f675b7f1eafaea89/frontend/src/metabase/ui/colors/constants/themes/light.ts)、[深色主题语义](https://github.com/metabase/metabase/blob/1e78c186c0c2884c19c10af3f675b7f1eafaea89/frontend/src/metabase/ui/colors/constants/themes/dark.ts)
- [导航尺寸](https://github.com/metabase/metabase/blob/1e78c186c0c2884c19c10af3f675b7f1eafaea89/frontend/src/metabase/nav/constants.ts)、[响应式侧栏](https://github.com/metabase/metabase/blob/1e78c186c0c2884c19c10af3f675b7f1eafaea89/frontend/src/metabase/nav/containers/MainNavbar/MainNavbar.styled.tsx)
- [官方可访问性状态](https://github.com/metabase/metabase/blob/1e78c186c0c2884c19c10af3f675b7f1eafaea89/docs/installation-and-operation/accessibility.md)

## 4. DBeaver Community

研究基线：提交 [`1687c03`](https://github.com/dbeaver/dbeaver/tree/1687c03c7316d17587fe91b19c693db3a25d10bc)，提交时间 2026-08-30。

### 技术栈与应用架构

- 这是原生 Java 桌面应用，不是 Web 前端：Eclipse RCP + SWT/JFace + OSGi 插件，Maven/Tycho 组装 Windows/macOS/Linux 产品；ER 图使用 GEF，数据库驱动和 UI 功能按 plugin/feature 分包。
- 工作台继承 Eclipse 的 Perspective、View、Editor、Preference、Command/Handler 模型。优势是成熟的多标签、多窗格、快捷键、可拖拽/停靠；代价是视觉和交互受平台控件及 Eclipse 历史模型约束。
- 数据库能力下沉到驱动/模型插件，UI 通过通用 navigator、entity editor、SQL editor、result set 等抽象适配大量数据库。

### 导航、布局与交互

- 默认 Perspective 源码把 Database Navigator 放在编辑区左侧，比例 **0.25**；左下 Project Explorer 相对 navigation 比例 **0.7**；主区为多标签 Editor；底部预留日志、Query Manager、Shell、进度、任务、搜索；右侧预留 AI Chat、Properties、Help、Outline。
- **观察：**对象树是主要导航，连接→数据库/catalog→schema→表/视图/过程逐级展开；中央 SQL/数据/DDL/ER 多标签并行。工具栏、上下文菜单和快捷键承担大量专家动作。
- 关键交互：结果集虚拟表格/行内编辑、事务提交/回滚状态、SQL 自动补全、对象过滤、多个结果 tab、列排序/筛选、ER 拖拽布局、连接颜色、视图自由停靠。

### 视觉系统（源码值与边界）

| 维度 | 事实 |
| --- | --- |
| 颜色 | 主题大部分继承 Eclipse/SWT 系统色。DBeaver 浅色 View 明确为 `#fff`，编辑器 composite `#f8f8f8`、Canvas `#fbfbfb`；深色编辑器背景 RGB **47,47,47**，前景 **204,204,204**，selection 背景 **33,66,131**，当前行 **55,55,55**，链接 **102,175,249**，Canvas `#2f2f2f`，激活 tab highlight `#2b79d7`。
| 字体/字号 | ResultSet 通过 Eclipse `@ThemeFont` 取得，可在 Preferences 中配置。**未在审查源码中发现跨平台固定字体族或统一字号 token**；实际值随 OS、Eclipse 主题和用户偏好变化。
| 间距/圆角/阴影 | SWT/Eclipse renderer 与原生控件决定大部分尺寸；源码可见 tab renderer 的特殊 padding，但没有可移植的 Web 式 spacing/radius/shadow token。将截图像素当规范会产生错误。

### 响应式与可访问性

- 桌面窗口通过 Eclipse 的可停靠、可缩放窗格适配窗口大小，但不属于移动 Web 响应式。低宽度下主要靠关闭/折叠 View，而非断点重排。
- 仓库提供 High Contrast CSS；结果网格安装 SWT `AccessibleControlAdapter`，向辅助技术报告行列、值类型、只读、外键、范围选择等信息，并针对 JAWS 使用 `getName()` 的行为做兼容。
- **风险：**原生 UI 在不同 OS/主题下视觉不一致；高信息密度、深层树和大量图标工具栏对新手负担高；部分自绘网格/图表的无障碍质量必须逐控件测试。

### 可借鉴点

1. 对专业数据库用户，空间效率、可停靠窗格和跨对象多标签比“大卡片”更有价值。
2. 把结果集字体、连接颜色、编辑器配色交给用户配置，比强制品牌视觉更贴合长时间使用。
3. Navigator 保存展开/过滤状态，显著降低大型 schema 的重复定位成本。
4. 表格无障碍需要提供行列/类型/只读/关联语义，不能只给 DOM `role=grid`。

### 关键来源

- [仓库](https://github.com/dbeaver/dbeaver)、[Apache 2.0 与第三方许可说明](https://github.com/dbeaver/dbeaver/blob/1687c03c7316d17587fe91b19c693db3a25d10bc/LICENSE.md)、[Tycho 产品构建](https://github.com/dbeaver/dbeaver/blob/1687c03c7316d17587fe91b19c693db3a25d10bc/pom.xml)
- [默认 Perspective 布局](https://github.com/dbeaver/dbeaver/blob/1687c03c7316d17587fe91b19c693db3a25d10bc/plugins/org.jkiss.dbeaver.core/src/org/jkiss/dbeaver/ui/perspective/DBeaverPerspective.java)
- [浅色偏好样式](https://github.com/dbeaver/dbeaver/blob/1687c03c7316d17587fe91b19c693db3a25d10bc/plugins/org.jkiss.dbeaver.core/css/e4-dbeaver_prefstyle.css)、[深色偏好样式](https://github.com/dbeaver/dbeaver/blob/1687c03c7316d17587fe91b19c693db3a25d10bc/plugins/org.jkiss.dbeaver.core/css/e4-dark_dbeaver_prefstyle.css)、[高对比度](https://github.com/dbeaver/dbeaver/blob/1687c03c7316d17587fe91b19c693db3a25d10bc/plugins/org.jkiss.dbeaver.ui/css/e4-high_contrast_dbeaver_prefstyle.css)
- [Navigator 状态恢复](https://github.com/dbeaver/dbeaver/blob/1687c03c7316d17587fe91b19c693db3a25d10bc/plugins/org.jkiss.dbeaver.ui.navigator/src/org/jkiss/dbeaver/ui/navigator/database/DatabaseNavigatorView.java)、[结果集主题](https://github.com/dbeaver/dbeaver/blob/1687c03c7316d17587fe91b19c693db3a25d10bc/plugins/org.jkiss.dbeaver.ui.editors.data/src/org/jkiss/dbeaver/ui/controls/resultset/ResultSetThemeSettings.java)
- [结果网格辅助技术适配](https://github.com/dbeaver/dbeaver/blob/1687c03c7316d17587fe91b19c693db3a25d10bc/plugins/org.jkiss.dbeaver.ui.editors.data/src/org/jkiss/dbeaver/ui/controls/resultset/spreadsheet/SpreadsheetAccessibleAdapter.java)

## 5. Directus

研究基线：提交 [`a6c460a`](https://github.com/directus/directus/tree/a6c460a765c590c15b2e4d71e820247cbc25179e)，提交时间 2026-08-27。

### 技术栈与应用架构

- App 为 Vue 3 + TypeScript + Vite，状态 Pinia、路由 Vue Router，基础无头组件 Reka UI；富文本含 Editor.js/Tiptap，地图 MapLibre，图表 ApexCharts，长列表使用 `vue-virtual-scroller`。
- Directus 的核心差异是 schema 驱动：API/权限/集合字段元数据生成管理界面，界面（Interface）、展示（Display）、布局（Layout）、模块、面板可扩展。表格、卡片、Kanban、日历、地图是同一集合的可切换布局。
- API 与 App 同仓但边界清晰；主题也抽成 `@directus/themes` package，用嵌套规则生成 CSS variables。

### 导航、布局与交互

- **观察：**最左 module rail 负责 Content、Files、Insights、Settings 等域切换；第二栏按当前模块列集合/文件夹；主区包含 header、搜索/过滤/排序、布局切换和内容；右侧 sidebar 处理 item 详情、评论、版本、导入导出、Flow 等上下文任务。
- 源码尺寸：header **3.375rem（54px）**、sub-header **3rem（48px）**；collapsed sidebar **3.375rem**、mobile sidebar **20.75rem**；移动内容 padding **1.125rem**，`sm` 以上 **3rem**。
- 断点源码：xs **28rem**、sm **36rem**、lg **57.625rem**、xl **72rem**。
- 关键交互：布局切换、字段驱动表单、批量编辑、筛选器构建、拖拽排序/Kanban、关系选择器、抽屉/侧栏详情、命令搜索、可配置浅/深主题与项目色。

### 视觉系统（源码值）

| 维度 | 事实 |
| --- | --- |
| 颜色 | 默认 light：foreground `#4f5464`、accent text `#172940`、background `#fff`、normal `#f0f4f9`、accent `#e4eaf1`、subdued `#f7fafc`；模块轨 `#0e1c2f`。默认 dark：foreground `#c9d1d9`、accent `#f0f6fc`、background `#0d1117`、normal `#21262e`、accent `#30363d`、subdued `#161b22`。功能色 success `#2ecda7`、warning `#ffa439`、danger `#e35169`。
| 字体 | display/title/sans 为 **Inter/system-ui**，权重分别 **700/600/500**；serif **Merriweather 500**，mono **Fira Mono 500**。审查的主题定义没有集中声明全局字号阶梯，因此不把组件局部字号伪装成官方 scale。
| 间距 | form column/row gap **1.75rem / 2.25rem**；通用输入高/内边距 **3.375rem / .875rem**；sidebar form 输入 **2.9375rem / .6875rem**。按钮高度 xs/sm/default/lg/xl 为 **1.5/2/2.5/3/3.375rem**。
| 圆角 | 默认主题 **0.375rem（6px）**；focus ring 继承该圆角。
| 阴影 | 表单输入默认 `none`；light popover：`0 0 6px rgb(23,41,64,.2), 0 0 12px 2px rgb(23,41,64,.05)`；dark popover：`0 0 6px black`。整体更多依赖边框/背景分层。

### 响应式与可访问性

- 原生提供 auto/light/dark，监听 `prefers-color-scheme`；用户主题覆盖与系统默认合并。移动侧栏有独立宽度与断点内容 padding。
- 使用 focus trap，并有管理嵌套/多层 dialog trap z-order 的专门逻辑；sidebar 使用 `aside`、`aria-label`、AccordionRoot 等语义结构。
- **风险：**仓库未提供像 Supabase 那样集中、完整的公开可访问性清单；扩展作者可能绕开核心组件。多层抽屉/对话框尤其要做真实键盘和读屏回归。

### 许可证风险（重要）

- 当前根 `license` 为 **Monospace Sustainable Core License 1.0（MSCL-1.0-GPL）**，禁止与许可方商业产品构成竞争的用途，并限制绕过 license key；每个版本发布四周年后获得 GPL-3.0 未来授权。
- 这与搜索引擎缓存、旧 README 或旧版本常见的 BSL 1.1 描述不同。商业采用、托管、再分发和竞品用途必须由法务按具体 commit/tag 审核，不能只写“开源 CMS”。

### 可借鉴点

1. 由字段/schema 元数据生成表单和关系控件，是数据后台避免页面复制的高价值架构。
2. 同一 collection 可切换 table/cards/kanban/calendar/map，布局层与数据层解耦。
3. 主题规则覆盖 shell/navigation/header/form/sidebar/public/popover，比只提供颜色变量更适合白标。
4. 以平面边框和背景差构建层级，适合安静、长时间使用的运营后台。

### 关键来源

- [App 依赖](https://github.com/directus/directus/blob/a6c460a765c590c15b2e4d71e820247cbc25179e/app/package.json)、[当前根许可证](https://github.com/directus/directus/blob/a6c460a765c590c15b2e4d71e820247cbc25179e/license)
- [全局布局变量](https://github.com/directus/directus/blob/a6c460a765c590c15b2e4d71e820247cbc25179e/app/src/styles/_variables.scss)、[断点](https://github.com/directus/directus/blob/a6c460a765c590c15b2e4d71e820247cbc25179e/app/src/styles/mixins/_breakpoints.scss)
- [默认浅色主题](https://github.com/directus/directus/blob/a6c460a765c590c15b2e4d71e820247cbc25179e/packages/themes/src/themes/light/default.ts)、[默认深色主题](https://github.com/directus/directus/blob/a6c460a765c590c15b2e4d71e820247cbc25179e/packages/themes/src/themes/dark/default.ts)
- [右侧上下文栏](https://github.com/directus/directus/blob/a6c460a765c590c15b2e4d71e820247cbc25179e/app/src/views/private/private-view/components/private-view-sidebar.vue)、[主题配置合并](https://github.com/directus/directus/blob/a6c460a765c590c15b2e4d71e820247cbc25179e/app/src/composables/use-theme-configuration.ts)
- [多层 Dialog focus trap 管理](https://github.com/directus/directus/blob/a6c460a765c590c15b2e4d71e820247cbc25179e/app/src/composables/use-focus-trap-manager.ts)

## 6. Appsmith

研究基线：提交 [`75847cf`](https://github.com/appsmithorg/appsmith/tree/75847cf6137fa3e78a64519b2e4b4c74dbd262ef)，提交时间 2026-08-28。

### 技术栈与应用架构

- 前端仍以 React 17、Redux、Redux-Saga、styled-components 为主，同时并存 ADS、ADS Old、WDS、Blueprint、Mantine hooks、Tailwind 等多套 UI 依赖；编辑器含 CodeMirror、ECharts/FusionCharts、虚拟列表、拖拽和 Yjs。服务端为 Java 系列模块。
- 代码分 CE/EE，编辑器领域再拆 IDE、WidgetProvider、layoutSystems、Debugger、PropertyPane、EntityNavigation。布局系统同时存在 fixed、autolayout 与 anvil，说明产品在兼容历史画布的同时演进响应式布局。
- 设计系统 ADS 2.0 提供 primitive、semantic、category token；WDS 则更多服务最终应用 widget。**风险：**多代设计系统并存意味着任何抽取都要先确认组件属于哪一代。

### 导航、布局与交互

- **观察：**编辑器是典型四区：左侧窄 IDE 导航/实体树，中间 canvas 或 query/JS 编辑器，右侧 Property Pane，底部 Debugger/响应区；预览/发布态另有顶部或侧边应用导航。
- ADS Sidebar 模板宽 **50px**，但实际 IDE 还会组合可调整的 Entity Explorer 和 Property Pane，不应把 50px 当整套左栏宽。
- 关键交互：组件拖入画布、选中后属性配置、数据源/API/Query/JS 对象绑定、Mustache 表达式、事件动作链、响应式布局切换、调试日志/状态检查、Git/多人协作、应用预览发布。

### 视觉系统（源码值）

| 维度 | 事实 |
| --- | --- |
| 颜色 | ADS v2 主品牌橙：default `#e15615`、hover `#cf4d10`、active `#b33d0a`；中性色覆盖 black/gray 多阶；信息蓝 `#2d6bf4`、成功绿 `#059669`、错误红 `#f22b2b`。语义 token 再映射到 action/control/response/content，避免组件直接引用 primitive。
| 字体 | ADS 文档说产品使用系统字体栈（macOS SF Pro、Windows Segoe UI、Linux Ubuntu）；当前 ADS CSS 又引入 PT Root UI，说明不同区域/代际可能不同。字号 token **10、11、12、13、14、15、16、17、18、19、20、22、24、28px**，正常 400、bold 500。
| 间距 | CSS primitive 为 **0、2、4、8、12、16、20、24、28、32、36、40、44、48、52px**；设计文档强调 4-point grid，常用容器间距 24px，padding 12/16px，区内 gap 12/16px。
| 圆角 | 新 theming default elevation base **8px**，三层 elevation 圆角通过外间距计算；这套 token 与 ADS v2 组件局部圆角可能并存，不能假定全产品统一 8px。
| 阴影 | 新 theming 用三层 `boxShadow` 公式，偏移/模糊引用 inner-spacing 和语义 shadow color；源码未给出在所有旧 ADS/Blueprint 组件上统一生效的保证。

### 响应式与可访问性

- 最终发布应用支持顶部/侧栏导航和移动 toggle；画布有 fixed/autolayout/anvil 多种响应式策略。**观察：**构建器本身仍是桌面优先的高密度 IDE，移动端更适合查看最终应用而非完整搭建。
- Playwright helper 使用 axe，默认检查 WCAG 2.1 A/AA tags；依赖中也包含 `@axe-core/playwright`。焦点策略模块说明 IDE 有程序化焦点管理。
- **风险：**存在 axe helper 不代表全流程零违规；自定义 widget、拖拽画布、代码编辑器和用户搭建出的应用内容仍需单独审计。

### 可借鉴点

1. “实体树 + 画布 + 属性面板 + 调试器”是复杂可视化构建器最清晰的工作区分工。
2. 将 token 分 primitive → semantic → category，能把品牌色和组件用途解耦。
3. 将布局系统封装成独立策略，有利于在不破坏历史应用的前提下引入新响应式模型。
4. 属性面板应按选择上下文动态生成，而非每类 widget 编写一套独立页面。

### 风险

- React 17、Blueprint、ADS Old、ADS、WDS、styled-components、Tailwind 并存，视觉一致性和 bundle/维护成本高。
- 低代码编辑器中的嵌套滚动、拖拽、键盘焦点与响应式预览非常容易互相冲突。
- 若借鉴其 UI，应优先借鉴信息架构和 token 分层，不宜直接复制旧组件代码。

### 关键来源

- [前端依赖](https://github.com/appsmithorg/appsmith/blob/75847cf6137fa3e78a64519b2e4b4c74dbd262ef/app/client/package.json)、[Apache 2.0](https://github.com/appsmithorg/appsmith/blob/75847cf6137fa3e78a64519b2e4b4c74dbd262ef/LICENSE)
- [ADS 颜色](https://github.com/appsmithorg/appsmith/blob/75847cf6137fa3e78a64519b2e4b4c74dbd262ef/app/client/packages/design-system/ads/src/__theme__/default/colors.css)、[语义映射](https://github.com/appsmithorg/appsmith/blob/75847cf6137fa3e78a64519b2e4b4c74dbd262ef/app/client/packages/design-system/ads/src/__theme__/default/semantic.css)
- [字号](https://github.com/appsmithorg/appsmith/blob/75847cf6137fa3e78a64519b2e4b4c74dbd262ef/app/client/packages/design-system/ads/src/__theme__/default/typography.css)、[间距 token](https://github.com/appsmithorg/appsmith/blob/75847cf6137fa3e78a64519b2e4b4c74dbd262ef/app/client/packages/design-system/ads/src/__theme__/default/variables.css)、[间距指南](https://github.com/appsmithorg/appsmith/blob/75847cf6137fa3e78a64519b2e4b4c74dbd262ef/app/client/packages/design-system/ads/src/Documentation/Space.mdx)
- [新 theming 默认圆角/阴影](https://github.com/appsmithorg/appsmith/blob/75847cf6137fa3e78a64519b2e4b4c74dbd262ef/app/client/packages/design-system/theming/src/token/src/defaultTokens.json)、[Sidebar 模板](https://github.com/appsmithorg/appsmith/blob/75847cf6137fa3e78a64519b2e4b4c74dbd262ef/app/client/packages/design-system/ads/src/Templates/Sidebar/styles.ts)
- [实体侧栏](https://github.com/appsmithorg/appsmith/blob/75847cf6137fa3e78a64519b2e4b4c74dbd262ef/app/client/src/components/editorComponents/EntityExplorerSidebar.tsx)、[属性侧栏](https://github.com/appsmithorg/appsmith/blob/75847cf6137fa3e78a64519b2e4b4c74dbd262ef/app/client/src/components/editorComponents/PropertyPaneSidebar.tsx)、[Debugger](https://github.com/appsmithorg/appsmith/tree/75847cf6137fa3e78a64519b2e4b4c74dbd262ef/app/client/src/components/editorComponents/Debugger)
- [axe WCAG 2.1 A/AA helper](https://github.com/appsmithorg/appsmith/blob/75847cf6137fa3e78a64519b2e4b4c74dbd262ef/app/client/playwright/helpers/a11y.ts)

## 7. DBX（t8y2/dbx）

研究基线：提交 [`9190554`](https://github.com/t8y2/dbx/tree/9190554e50da5a61a5a1a1d97037603e106817ea)，提交时间 2026-08-30；仓库版本 `0.5.98`。

### 技术栈与应用架构

- Vue 3.5 + TypeScript 6 + Vite 8，桌面壳 Tauri 2/Rust；Tailwind 4、shadcn-vue/Reka UI、Pinia、CodeMirror 6、Vue Flow、ECharts、ELK、虚拟滚动。还提供 Web/Docker、CLI、MCP Server。
- 前端按 connection/sidebar/editor/grid/diagram/admin/mq/settings 等领域拆分；Rust core/agents 负责多数据库连接和本地能力。相比 Electron 数据客户端，Tauri 路径有更小安装包与原生桥接，但跨数据库驱动仍带来较大测试矩阵。
- App.vue 是当前大型编排层，统一连接树、tab、编辑器、结果、右侧 AI/历史/SQL library/file panel、设置与 dialog。**风险：**壳层状态集中度较高，长期应继续拆分状态机/路由边界。

### 导航、布局与交互

- **观察：**顶部全局工具栏；左侧连接与 schema 树；中央 tab bar + editor toolbar + SQL/数据/DDL/ER 主区；右侧可独立打开 AI、历史、SQL Library、SQL File；支持 classic 紧凑布局和带 4px gutter/圆角边框的 panel 布局。
- 左栏宽度、AI、历史、SQL library/file panel 都由 resize composable 管理；侧栏可收起为 **32px（`w-8`）** 窄条，展开按钮 **28px（`h-7 w-7`）**。工具栏常见高度 36/40px（`h-9/h-10`）。
- 关键交互：连接树多选/分组/搜索/刷新、标签式 SQL、多库执行、选中 SQL 执行、结果 run 切换、虚拟数据网格行内编辑、类型着色、事务模式、图表/Explain/消息切换、ER 自动布局、Vim 模式、主题/圆角/快捷键自定义、AI/MCP。

### 视觉系统（源码值）

| 维度 | 事实 |
| --- | --- |
| 颜色 | Light：背景/前景 `rgb(255 255 255)` / `rgb(10 10 10)`，muted `rgb(245 245 245)`，border `rgb(229 229 229)`；Dark：背景 `rgb(19 20 22)`，card `rgb(27 27 30)`，前景 `rgb(215 215 219)`，border `rgb(110 110 114 / .28)`。功能色 light success/warning/info 为 `rgb(22 163 74)` / `rgb(217 119 6)` / `rgb(37 99 235)`。数据类型另有 integer/numeric/string/boolean/temporal 等独立色。
| 字体 | **Geist Variable 100–900** 自托管；中文 fallback 为 PingFang SC、Hiragino Sans GB、Microsoft YaHei，再到 Segoe UI/system-ui。表格另定义 tabular variant（`font-feature-settings: "tnum"`）。源码 token 未建立独立固定字号阶梯，实际大量使用 Tailwind `text-xs/text-sm`。
| 间距 | 主要使用 Tailwind 4，常见壳 gutter **4px（`gap-1 p-1`）**、侧栏 header 横向 padding **12px（`px-3`）**、密集动作 gap **1px（`gap-px`）**。没有在独立 token 文件中声明一套产品专属 spacing scale。
| 圆角 | default/sm/md **4px**，lg/xl **6px**；另保留 fixed 4/5/6px，并允许用户选择 corner style。
| 阴影 | 基础 shell 几乎完全靠 border/background；token 文件没有通用 elevation shadow。局部设置搜索高亮使用 inset shadow 动画。**观察：**这是刻意的低装饰、高密度桌面风格。

### 响应式与可访问性

- 主要目标是桌面窗口；Web 模式存在，但未见面向手机重排的完整断点壳。适配主要依靠 panel resize、collapse、zen mode 和 overflow，而非移动导航。
- 源码广泛出现 icon button 的 `title`/`aria-label`、键盘快捷键和 focus-visible；主题跟随系统，动效检查 `prefers-reduced-motion`，CSS 在 reduced motion 下禁用高亮动画。
- **风险：**CodeMirror、虚拟网格、树、拖拽分栏和自绘 ER 都需要专门读屏/键盘测试；“有 ARIA”不能等同于完整 WCAG。中文 fallback 很好，但不同平台字体度量仍可能影响密集表格。

### 可借鉴点

1. 以中性灰壳和极少阴影承载长时间数据库工作，视觉噪声低于传统 IDE。
2. 数据类型使用稳定语义色，同时为 dark tooltip 单独调低/调亮色阶，体现 surface-aware token。
3. 所有辅助面板都可调整、关闭，并有 zen mode；把屏幕面积还给当前任务。
4. Geist Tabular + 中文系统 fallback 对数字密集、双语数据库客户端很实用。

### 风险

- 仍处于 `0.x` 且提交频繁；组件/API、视觉 token 和产品结构可能快速变化。
- 90+ 数据库意味着菜单、对象树、DDL 与权限行为高度分叉，界面一致性需要 capability model 驱动，不能只靠条件渲染累积。
- App.vue 体量和跨面板状态较集中，是后续演进与可测试性的主要架构风险。

### 关键来源

- [仓库/依赖/版本/许可证声明](https://github.com/t8y2/dbx/blob/9190554e50da5a61a5a1a1d97037603e106817ea/package.json)、[Apache 2.0 文本](https://github.com/t8y2/dbx/blob/9190554e50da5a61a5a1a1d97037603e106817ea/LICENSE)、[官方产品站](https://dbxio.com/)
- [设计 token](https://github.com/t8y2/dbx/blob/9190554e50da5a61a5a1a1d97037603e106817ea/apps/desktop/src/styles/tokens.css)、[字体与全局样式](https://github.com/t8y2/dbx/blob/9190554e50da5a61a5a1a1d97037603e106817ea/apps/desktop/src/styles/globals.css)
- [应用壳](https://github.com/t8y2/dbx/blob/9190554e50da5a61a5a1a1d97037603e106817ea/apps/desktop/src/App.vue)、[连接侧栏](https://github.com/t8y2/dbx/blob/9190554e50da5a61a5a1a1d97037603e106817ea/apps/desktop/src/components/layout/AppSidebar.vue)、[标签栏](https://github.com/t8y2/dbx/blob/9190554e50da5a61a5a1a1d97037603e106817ea/apps/desktop/src/components/layout/AppTabBar.vue)、[内容区](https://github.com/t8y2/dbx/blob/9190554e50da5a61a5a1a1d97037603e106817ea/apps/desktop/src/components/layout/ContentArea.vue)
- [主题/系统模式/自定义颜色](https://github.com/t8y2/dbx/blob/9190554e50da5a61a5a1a1d97037603e106817ea/apps/desktop/src/composables/useTheme.ts)
- [官方仓库文档目录](https://github.com/t8y2/dbx/tree/9190554e50da5a61a5a1a1d97037603e106817ea/docs/content/docs)

## 跨项目可执行建议

### 如果要设计“数据库管理/开发工具”

采用 Supabase/DBX/DBeaver 的共同骨架：全局产品或连接入口、上下文对象树、多标签主工作区、可收起/可调整辅助面板。默认保持 12–14px 级密集正文、4–8px 基础间距和 4–6px 圆角，层级主要靠 1px 边框与 2–4 档背景，而非大量卡片和重阴影。具体数值应建立自有 token，不应直接拼接上述项目数值。

### 如果要设计“分析/监控工具”

采用 Grafana 的主题契约与插件边界、Metabase 的用户语言和渐进式查询流程。Dashboard 编辑态与消费态要明确分离；筛选、汇总、时间范围、刷新和分享必须稳定占位，不能因图表加载而跳动。

### 如果要设计“可配置后台/低代码平台”

结合 Directus 的 schema 驱动与 Appsmith 的工作区分工：数据/字段元数据生成基础表单，实体树负责结构，画布负责结果，属性面板负责局部配置，Debugger 负责运行反馈。扩展必须继承主题、键盘语义和权限上下文。

### 通用风险清单

1. **许可证先行**：Grafana AGPL、Metabase 双许可证、Directus MSCL 都不能按 Apache/MIT 的方式复用。
2. **不要混淆 token 与截图**：DBeaver 受 OS/Eclipse 主题影响；Supabase/Appsmith 多代样式并存；截图像素不是稳定规范。
3. **高密度不等于不可访问**：表格、树、编辑器、拖拽和可调整窗格需要独立键盘模型、焦点恢复、状态播报与读屏语义。
4. **移动端应重排任务**：Supabase 的 Sheet 策略值得参考；DBeaver/DBX/Appsmith 编辑器不应被包装成“完全响应式”而忽略其桌面任务本质。
5. **插件/扩展是治理问题**：Grafana 和 Directus 的优势来自契约；若扩展可以绕过 token、权限或 a11y，平台规模越大，一致性越差。

## 研究限制

- stars、版本和默认分支会继续变化；本文保留约数与固定 commit 链接，便于复现视觉/架构结论。
- 未对所有项目启动完整产品并逐像素测量；布局结论以主壳/导航/主题源码和官方文档为主。凡非 token 的视觉印象均标记为观察或推断。
- 云版、企业版、实验 feature flag、插件和 OS 原生主题可能产生不同界面；尤其 Grafana visual refresh、Metabase enterprise、DBeaver 各平台、Supabase 双构建和 Directus 用户主题不能简单外推。
