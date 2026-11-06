# 2026 热门开源软件 UI/UX 与前端架构研究

> 采集基准日：2026-08-30
>
> 研究对象：数据库/BI、开发工具、生产力、设计、AI、客服、协作与多端个人软件
>
> 用途：为新软件的信息架构、视觉系统、交互规范和前端架构提供可执行参考

## 1. 执行摘要

成熟工具型产品的共同点不是某一种颜色或圆角，而是把复杂性放在正确的层级：全局导航保持稳定，上下文操作靠近对象，低频设置渐进披露，状态通过语义 token 统一表达。视觉上普遍使用低饱和中性色、大量 1px 边框、有限阴影和 4/8px 间距节奏；高密度工作区常用 13-14px 正文和 28-36px 控件，内容型产品则更偏向 14-16px 与更宽松行高。

技术上没有单一赢家。React/Next.js 在 Web SaaS 与复杂后台中占多数；Vue 在数据库客户端和 API 工具中表现成熟；Flutter 适合真正跨端的本地产品；ClojureScript、Java/SWT 等非主流栈同样可以支撑优秀 UI，但组件生态和招聘成本不同。比框架选择更重要的是：是否有独立设计系统包、语义 token、可访问原语、稳定 shell、可测试的复杂交互，以及是否避免业务页面直接散落样式常量。

本研究最值得直接采用的结论：

1. 先按任务模型选择布局，再做视觉风格；不要先画卡片。
2. 把 `canvas / surface / text / border / action / status` 做成语义 token，并同时设计浅色与深色模式。
3. 默认建立 4px 基准、13/14/16px 正文字号层级、28/32/36/40px 控件密度档、4/6/8px 主圆角档。
4. 工作型界面优先用边框和背景差异建立层级，阴影只用于 popover、menu、dialog 等临时浮层。
5. 为侧栏、表格、检查器、命令面板、快捷键、空/错/加载/权限状态建立产品级模式，而不是每个页面重做。
6. 响应式不是把桌面三栏压窄，而是根据宽度改变导航与任务流程：固定栏 -> 抽屉，检查器 -> sheet，表格 -> 列优先级或详情页。
7. 所有精确视觉值都应有源码 token 或设计系统作为唯一事实来源；截图只能支持“约”和观察结论。

## 2. 如何使用这份报告

- 要确定技术栈：看“技术架构横向比较”和相近产品的单项研究。
- 要画第一版框架：看“六种布局范式”与“推荐尺寸基线”。
- 要建立设计系统：直接使用 `reference/design-tokens.css` 作为讨论起点，再按品牌和用户测试修订。
- 要设计具体交互：看“高频交互模式”和对应项目的源码证据。
- 要评审设计稿：使用文末的设计与工程验收清单。

不要直接复制某个项目的品牌色、布局或控件尺寸。先匹配目标用户、信息密度、输入设备、权限模型和任务时长。

## 3. 研究范围与证据

本报告的证据分为四级：

- **A 级**：设计 token、主题、组件源码和官方设计系统，可支持精确值。
- **B 级**：官方架构/产品文档、Storybook 和官方截图，可支持架构与主要流程。
- **C 级**：可访问的实际产品界面，可支持带“约”的观察结论。
- **D 级**：第三方资料和研究者推断，仅作线索。

完整方法见 [METHODOLOGY.md](../METHODOLOGY.md)。星标按基准日记录为近似值，只说明社区关注度，不代表 UI 质量。许可字段用于提醒复用边界，不构成法律意见。

## 4. 项目总览

本次实际检索和源码核查的 19 个基础主项目如下；另有 19 个 Claude Code/多端扩展项目见第 15-16 节。热度为 2026-08-30 附近的约数，不是排名。

| 类别 | 项目 / GitHub 热度 | 当前许可要点 | 前端主栈 | 核心布局 | 最适合借鉴 |
|---|---|---|---|---|---|
| 数据平台 | [Supabase Studio](https://github.com/supabase/supabase) / 108.6k | Apache-2.0 | React、Next/TanStack、Tailwind 4、Radix | 产品轨 + 模块侧栏 + 数据工作区 | 成熟设计系统、数据工具 shell、语义颜色 |
| 可观测性 | [Grafana](https://github.com/grafana/grafana) / 76.5k | AGPL-3.0-only | React 19、Emotion、Redux、RxJS | 顶栏 + 可停靠菜单 + 仪表盘画布 | 主题契约、密集 dashboard、插件化 UI |
| BI | [Metabase](https://github.com/metabase/metabase) / 49.0k | 核心 AGPL；企业目录商业许可 | React 18、Mantine 8、RTK Query、CSS Modules | 应用栏 + 集合侧栏 + 查询/仪表盘 | 低门槛数据分析、主题封装、命令面板 |
| 数据库客户端 | [DBeaver Community](https://github.com/dbeaver/dbeaver) / 51.6k | Apache-2.0；组件另有许可 | Java、Eclipse RCP、SWT/JFace、OSGi | 对象树 + 多标签编辑器 + 辅助视图 | 极高密度桌面工作台、上下文命令 |
| 数据/CMS | [Directus](https://github.com/directus/directus) / 35.9k | MSCL-1.0-GPL，非宽松开源 | Vue 3、Vite、Pinia、Reka UI、SCSS | 模块轨 + 集合导航 + 多布局 + 侧栏 | schema 驱动界面、扩展点、多视图 |
| 低代码 | [Appsmith](https://github.com/appsmithorg/appsmith) / 40k | Apache-2.0 | React 17、Redux-Saga、styled-components | 实体树 + 画布 + 属性面板 + 调试器 | 低代码编辑器、检查器、调试反馈 |
| 数据库客户端 | [DBX](https://github.com/t8y2/dbx) / 16.3k | Apache-2.0 | Vue 3、Tauri 2、Tailwind 4、Reka UI | 连接树 + 标签 + 编辑/数据区 + 工具面板 | 轻量现代桌面端、可调多窗格、AI/MCP |
| 项目管理 | [Plane](https://github.com/makeplane/plane) / 58.5k | AGPL-3.0 | React、Vite、MobX、Tailwind、Propel | 可调侧栏 + List/Kanban/Gantt + 详情 | 高效工作台、同一数据多视图、peek 侧栏 |
| 生产力 | [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) / 76.1k | AGPL-3.0 | Flutter/Dart、BLoC、Rust core | 插件式工作区 + 跨端导航 | local-first、原生跨端、移动任务重排 |
| CRM | [Twenty](https://github.com/twentyhq/twenty) / 55.9k | AGPL + 例外；部分目录 MIT/企业许可 | React 19、Jotai、Linaria、GraphQL、Nx | 数据表/管道 + 记录侧面板 | 元数据驱动 CRM、表格/对象详情、移动首页 |
| 日程 | [Cal.com / Cal.diy](https://github.com/calcom/cal.diy) / 48.0k | MIT | Next.js 16、React、Tailwind 4、tRPC | 配置后台 + 对外预约流程 | 后台/客户界面分离、品牌化表单流程 |
| 知识库 | [Outline](https://github.com/outline/outline) / 40.4k | BSL 1.1，有竞争服务限制 | React、MobX、styled-components、ProseMirror/Yjs | 文档树 + 聚焦编辑区 + 协作 | 低干扰写作、树导航、命令栏、协作状态 |
| 文档/白板 | [AFFiNE](https://github.com/toeverything/AFFiNE) / 72.0k | 多目录混合：MIT/MPL/EE 等 | React 19、Vite、Electron、Yjs、Vanilla Extract | Page/Edgeless 双模 + 浮动侧栏 | local-first、多模编辑、响应式侧栏 |
| 设计工具 | [Penpot](https://github.com/penpot/penpot) / 59k | MPL-2.0 | ClojureScript、React、SCSS、WASM | 无限画布 + 双侧面板 + inspect | 专业画布、设计 token、设计/开发交付 |
| 白板 | [Excalidraw](https://github.com/excalidraw/excalidraw) / 131k | MIT | React、TypeScript、SCSS、Canvas、Jotai | 全屏画布 + 漂浮工具岛 | 低学习成本画布、情境工具、手绘语义 |
| AI 工作台 | [Open WebUI](https://github.com/open-webui/open-webui) / 150k | 自定义许可，含品牌限制 | Svelte 5、SvelteKit、Tailwind 4 | 会话侧栏 + 单列对话 + 工具/RAG | AI 会话 IA、文字缩放、模型/工具渐进披露 |
| 客服 | [Chatwoot](https://github.com/chatwoot/chatwoot) / 36k | 社区 MIT；企业目录另有许可 | Vue 3、Vite、Tailwind 3、Pinia/Vuex | 队列 + 会话 + 客户上下文多栏 | 高密度主从工作台、实时状态、客服上下文 |
| 通信 | [Mattermost](https://github.com/mattermost/mattermost) / 39k | 仓库/目录多许可 | React 18、Redux、SCSS | 团队栏 + 频道栏 + 消息流 + 线程栏 | 长期复杂协作 UI、主题、可调线程面板 |
| API 工具 | [Hoppscotch](https://github.com/hoppscotch/hoppscotch) / 80k | MIT | Vue 3、Vite、Tailwind 3、RxJS | 协议导航 + 请求/响应分割窗格 + 集合栏 | API 工作流、可调 pane、主题与协议切换 |

### 快速选择参考对象

- 做数据库/SQL 客户端：优先组合 **DBX 的现代桌面壳 + DBeaver 的功能密度 + Supabase 的设计系统 + Hoppscotch 的分割工作区**。
- 做普通 SaaS 后台：优先看 **Twenty、Plane、Supabase Studio、Directus**，但不要照搬其许可证受限代码。
- 做内容/知识产品：优先看 **Outline、AFFiNE、AppFlowy**；重点比较 Web 编辑体验与真正跨端能力。
- 做画布/创作工具：用 **Excalidraw** 学低门槛，用 **Penpot** 学专业复杂度，用 **Appsmith** 学属性检查器。
- 做消息/AI/客服：用 **Open WebUI** 学会话组织，用 **Chatwoot/Mattermost** 学多栏上下文与实时反馈。

## 5. “DBX”术语核查

在数据库 GUI 语境下，最可能对应的是 [t8y2/dbx](https://github.com/t8y2/dbx)，而不是名字相近的 dbx Studio。判断依据是：其产品名就是大写 **DBX**，约 16.3k stars，明确定位为支持 90+ 数据库的跨平台客户端，并同时提供桌面、Docker/Web、CLI、AI 与 MCP。

| 候选 | 实际含义 | 本报告处理 |
|---|---|---|
| `t8y2/dbx` | Vue 3 + Tauri 的现代数据库 GUI | 作为 DBX 主对象详细研究 |
| `Dbxstudio/dbx-studio` | 约 73 stars 的 React/Electron AI SQL 客户端 | 记录为同名候选，不作为热门主样本 |
| `databrickslabs/dbx` | Databricks 的旧 CLI 工作流扩展 | 无产品级 GUI，排除 |
| `pocketbase/dbx` 等 | Go 数据库访问/查询库 | 无 GUI，排除 |
| Unix `dbx` | 历史源码调试器 | 与现代产品无关 |

若你原本指的是某张截图或特定公司的“dbx Studio”，应以仓库 URL 再确认；本报告仍保留了 [dbx Studio](https://github.com/Dbxstudio/dbx-studio) 的栈和许可线索。

## 6. 技术架构横向比较

### 6.1 框架不是设计质量的决定因素

样本同时覆盖 React、Vue、Svelte、Flutter、ClojureScript 与 Java/SWT。高质量 UI 的共同工程条件更稳定：

- 有可复用组件层，并与业务模块保持边界。
- 颜色、间距、字体、圆角和层级通过主题/token 注入。
- 对 popover、dialog、menu、tooltip、focus management 等使用经过验证的可访问原语。
- 数据密集型区域使用虚拟化、缓存和局部状态，避免全局状态驱动每次输入。
- 路由 shell 保持挂载，避免导航时丢失侧栏滚动、面板宽度或编辑上下文。
- 设计系统有 Storybook、组件演示应用或视觉回归入口。

### 6.2 常见架构形态

| 形态 | 适用场景 | 优点 | 主要风险 |
|---|---|---|---|
| React/Next.js + monorepo + 共享 UI 包 | SaaS 后台、协作与账户体系复杂产品 | 生态完整、SSR/路由选择多、团队扩展容易 | 服务端/客户端边界和多套样式方案容易混杂 |
| React SPA + 专用数据层 | 仪表盘、BI、编辑器 | 客户端状态明确、复杂工作区自由度高 | 初始包体、长期状态迁移和性能治理成本高 |
| Vue + Vite + Pinia/组合式 API | 开发工具、后台、桌面 WebView | 模板直观、渐进式组织、性能和体积平衡好 | 大型团队需严格约束 composable 与组件职责 |
| Svelte/SvelteKit | AI 对话、内容与交互产品 | 组件轻、局部响应式自然 | 超大型团队的约定和第三方企业组件选择较少 |
| Flutter | 真正跨桌面/移动产品 | 渲染一致、跨端共享高 | Web 语义、原生平台细节和包体需单独治理 |
| ClojureScript + React | 数据驱动复杂编辑器 | 不可变数据与复杂状态变换契合 | 人才、调试和通用生态门槛高 |
| Java/Eclipse RCP/SWT | 深度本地集成、成熟数据库工具 | 原生能力、插件体系、长期稳定 | 现代视觉定制、跨平台细节和迭代速度受限 |

### 6.3 设计系统应是产品基础设施

一个可持续的前端仓库至少应区分：

```text
apps/
  web-or-desktop-shell/
packages/
  tokens/          raw + semantic tokens, themes
  primitives/      button, input, dialog, menu, tooltip
  patterns/        data table, filter bar, command palette, inspector
  icons/
  domain/          business components
```

`primitives` 不能依赖具体业务；`patterns` 可以组合原语但不拥有页面数据；业务模块消费模式并注入文案、权限与数据。项目早期也应保留这个逻辑边界，即使暂时不拆成多个发布包。

### 6.4 样式方案选择

- **Tailwind/utility CSS**：适合快速组合和 token 约束，前提是禁止随意值泛滥，并把重复组合提炼为组件变体。
- **CSS Modules**：适合复杂局部布局，命名与作用域清晰；与 token 变量结合效果好。
- **CSS-in-JS/Emotion**：适合主题对象和运行时计算丰富的仪表盘，但需关注运行时成本、SSR 和迁移成本。
- **SCSS**：成熟大型项目常见，适合已有变量与 mixin 体系；新增代码仍应向 CSS custom properties 和语义 token 收敛。
- **组件库二次封装**：Mantine、MUI、Radix、Reka UI 等不应直接泄漏到所有业务页面；建立薄封装以固定默认密度、焦点、圆角和 API。

## 7. 六种高价值布局范式

### 7.1 全局侧栏 + 页面内容

适合项目管理、CRM、设置与常规业务后台。

```text
┌──────────────┬─────────────────────────────────────┐
│ workspace    │ page header / breadcrumbs / actions │
│ global nav   ├─────────────────────────────────────┤
│              │                                     │
│              │ page content                        │
│              │                                     │
└──────────────┴─────────────────────────────────────┘
```

关键规则：全局导航只放跨页面稳定对象；当前页面操作放在内容头部；二级导航超过 5-7 项时再引入上下文侧栏。侧栏折叠必须保留 tooltip、可见选中态与持久化状态。

### 7.2 双层导航：图标轨 + 上下文侧栏

适合同时包含多个产品模块、组织或工作区的复杂平台。

```text
┌────┬────────────┬──────────────────────────────────┐
│ 52 │ 224-272    │ active product / project         │
│ px │ px         │                                  │
│rail│context nav │ main work area                   │
└────┴────────────┴──────────────────────────────────┘
```

图标轨回答“我在哪个产品/工作区”，上下文栏回答“这个范围内有哪些对象”。不要让两层都出现相同菜单；移动端通常只保留一层抽屉。

### 7.3 列表-详情主从布局

适合客服会话、邮件、任务、对象浏览器与数据库表。

```text
┌────────────┬────────────────────────┬──────────────┐
│ filters +  │ selected item detail   │ properties / │
│ item list  │ editor / conversation  │ activity     │
└────────────┴────────────────────────┴──────────────┘
```

必须处理：列表选择与 URL 同步、面板宽度持久化、未保存修改、键盘上下移动、空选择、删除当前对象后的落点，以及窄屏下列表和详情的返回路径。

### 7.4 编辑器/画布 + 检查器

适合设计、白板、SQL、API 请求和可视化搭建。

```text
┌────tools────┬────────canvas/editor────────┬inspector┐
│ objects     │ tabs / zoom / selection     │ context │
│ assets      │ primary creation surface    │ props   │
└─────────────┴──────────────────────────────┴─────────┘
```

画布是主角，不应再包在装饰卡片中。工具与检查器应可折叠/调整尺寸；快捷键、撤销栈、选择状态、缩放和平移必须由统一交互模型管理。

### 7.5 仪表盘网格

适合 BI、可观测性与运营概览。

网格需要稳定的列系统、拖放手柄、最小/最大组件尺寸、编辑与查看模式区分，以及无数据/加载/错误在每个 panel 内独立呈现。颜色优先表达序列和阈值，不应同时承担装饰。

### 7.6 内容中心/文档编辑器

适合知识库、文档与长内容。

编辑区建议限制行长，而资源树、目录和评论独立占栏。工具栏按选择上下文出现；自动保存状态应安静但可确认；斜杠命令和命令面板适合替代长期占空间的低频按钮。

## 8. 视觉系统研究结论

### 8.1 色彩：角色先于色值

推荐最小语义集合：

```text
canvas
surface-1 / surface-2 / overlay
text-primary / secondary / tertiary / disabled
border-subtle / default / strong
accent / accent-hover / accent-subtle / accent-contrast
success / warning / danger / info (+ subtle variants)
hover / selected / pressed / focus-ring / scrim
```

成熟产品普遍避免业务组件直接写 `#fff`、`black` 或任意透明度。浅色和深色不是简单反相：深色浮层通常比基础表面更亮，边框对比需重新分配，语义色也需要降低或提高明度以维持可读性。

配色建议：

- 让品牌色只负责主要动作、选中和链接，不要铺满背景。
- 状态色必须同时配图标或文字；红绿不能是唯一信息。
- 数据可视化色板与 UI 语义色分开，至少在常见色觉异常下可区分。
- 中性色不要全都带强品牌色倾向，否则长时间工作容易疲劳。
- 对文字、图标、边框和焦点分别定义对比度目标，不只测试按钮。

### 8.2 字体与字号

跨项目可复用的桌面工具基线：

| 角色 | 建议字号 | 行高 | 常用字重 |
|---|---:|---:|---:|
| 极密集元数据/坐标/辅助标签 | 11-12px | 16px | 400-500 |
| 表格、侧栏、紧凑控件 | 13px | 18-20px | 400-500 |
| 默认 UI 正文与表单 | 14px | 20px | 400-500 |
| 内容正文 | 15-16px | 24-26px | 400 |
| 小节标题/弹窗标题 | 16-18px | 22-26px | 600 |
| 页面标题 | 20-24px | 28-32px | 600-700 |

原则：

- 工具界面不需要营销页级的大标题；标题应与容器密度匹配。
- 12px 只能用于次要信息，不能承载长文本、错误原因或主要操作。
- 数字表格可启用 tabular numerals；代码、SQL、ID 使用 mono 字体。
- 中英文混排需单独测试 CJK 回退字体和行高，不能只看 Inter 的效果。
- 不用负字距挤压 UI；长名称使用布局、换行或中间截断策略解决。

### 8.3 间距、控件与密度

采用 4px 基准，2px 只用于视觉校正。推荐密度档：

| 密度 | 控件高度 | 表格行高 | 水平内边距 | 典型场景 |
|---|---:|---:|---:|---|
| Compact | 28px | 32px | 8-10px | SQL、日志、开发工具 |
| Default | 32-36px | 36-40px | 10-12px | CRM、项目管理、后台 |
| Comfortable | 40px | 44-48px | 12-16px | 文档、协作、低频表单 |
| Touch | 44-48px | 48-52px | 14-16px | 移动与触屏 |

控件内部、控件之间和区块之间应使用不同间距层级。例如图标与文字 6-8px，相邻字段 12-16px，表单分组 24-32px，页面区块 32-48px。

### 8.4 圆角

圆角应表达组件类型与层级，而不是给每个矩形加同样的大圆角：

- 2-4px：代码块、表格内小元素、密集工具按钮。
- 4-6px：输入、按钮、菜单项、紧凑面板。
- 6-8px：普通卡片、popover、较大控件。
- 8-12px：dialog、sheet、移动端大容器。
- pill：状态徽标、分段选择的滑块或真正胶囊语义；不要用于所有按钮。

同一视觉层通常只需要 2-3 个主圆角值。嵌套容器的内圆角应小于外圆角，并扣除边框/间距。

### 8.5 边框、阴影与层级

- 页面分区、侧栏、表格和常驻面板：使用 1px 边框或背景差，不使用浮卡阴影。
- popover/menu：中等阴影 + 清晰边框。
- dialog：更大扩散阴影 + scrim，仍需边框保证深色可见。
- focus：独立 focus ring，不要复用 box-shadow 层级阴影。
- hover/selected/pressed：至少三个不同 token，避免一个灰底覆盖全部状态。

## 9. 高频交互模式

### 9.1 导航与状态保持

- 路由切换时保持 shell、侧栏滚动、展开组和面板宽度。
- 选中态同时使用背景、文字/图标对比和位置线索。
- breadcrumb 只表达层级，不替代主要返回操作。
- 深层对象应有可复制 URL；刷新后尽量恢复选择、筛选和视图。

### 9.2 搜索、命令面板与快捷键

命令面板适合跨模块跳转、低频动作和主题/设置切换；局部搜索仍应放在当前列表附近。命令项应有分组、最近使用、键盘导航、不可用原因和快捷键提示。不要把所有功能藏进 `Cmd/Ctrl+K`。

### 9.3 表格与数据网格

完整数据网格应考虑：

- 列显示/隐藏、排序、筛选、调整宽度和固定列。
- 行选择与批量动作；批量工具条只在有选择时出现。
- 虚拟滚动与键盘导航；编辑态不应因滚动丢失。
- 空值、布尔、长文本、代码、日期、时区与大数字格式。
- 加载骨架、局部错误、无数据、无结果和无权限是不同状态。
- 危险写操作提供预览/影响范围，数据库工具尤其需要只读与事务提示。

### 9.4 表单与保存模型

- 创建流程：明确主按钮和取消路径，优先在提交后显示字段级错误。
- 设置页：可使用显式保存，或可靠的自动保存 + 可见状态；不要混用而不说明。
- 长表单按领域分组，标签位置保持一致，帮助文本只解释决策而非重复标签。
- 危险设置放独立区，要求对象名确认只用于高损失、不可逆操作。

### 9.5 反馈与异步状态

- 100ms 内完成：通常无需 loading。
- 100ms-1s：按钮局部进度或轻量 skeleton，避免整个页面闪烁。
- 1s 以上：显示持续进度、可取消性或后台任务入口。
- toast 用于非阻塞确认，不承载必须阅读的错误修复步骤。
- 错误信息说明发生了什么、影响什么、下一步是什么，并保留用户输入。

### 9.6 危险操作与撤销

能撤销时优先“立即执行 + 短时撤销”；真正不可逆或影响范围不明显时才使用确认 dialog。确认按钮要写具体动作，例如“删除 12 条记录”，而不是“确定”。

## 10. 响应式与可访问性

### 10.1 响应式任务重排

| 桌面 | 窄屏替代 |
|---|---|
| 固定侧栏 | off-canvas drawer / 单层导航 |
| 右侧检查器 | bottom sheet / full-screen detail |
| 三栏主从 | 列表页 -> 详情页导航 |
| 宽表格 | 关键列 + 横向滚动 + 行详情 |
| 常驻工具栏 | 主要动作 + overflow menu |
| hover 工具 | 可点击菜单或显式按钮 |

每个 breakpoint 都要定义任务流，而不只是 CSS 宽度。触屏目标建议至少 44px；桌面紧凑控件可以更小，但命中区不一定要等于视觉图标大小。

### 10.2 最低可访问基线

- 所有功能可用键盘到达并操作，Tab 顺序与视觉顺序一致。
- `:focus-visible` 清晰可见，不能全局移除 outline。
- dialog/menu/listbox/combobox 使用正确语义与焦点管理。
- 图标按钮有可访问名称；tooltip 不能是唯一说明渠道。
- 表单错误与字段通过程序化关系关联，并在提交后可快速定位。
- 颜色对比、缩放 200%、reduced motion、屏幕阅读器、长文本与 RTL 至少进入发布检查。
- 画布型产品需为核心对象和操作提供非纯画布的替代路径。

## 11. 推荐的软件 UI 基础方案

### 11.1 设计决策顺序

1. 定义核心对象与用户最常做的 3-5 个任务。
2. 定义对象层级、URL、权限和状态模型。
3. 从六种范式选择 shell，并画空/错/加载/只读状态。
4. 确定密度档与输入设备，再定字号、控件高度和面板宽度。
5. 建立浅/深主题的语义 token。
6. 建立 primitives 与高频 patterns，最后才做页面。
7. 用真实极端数据、键盘和不同宽度验证。

### 11.2 推荐尺寸起点

```text
global icon rail      48-56px
expanded sidebar      224-272px
top bar               44-56px
right inspector       288-360px, resizable
reading/form width    720-960px
wide app content      up to 1280-1440px
compact control       28-32px
default control       32-36px
touch control         44-48px
icon                  14 / 16 / 20px
primary radius        4 / 6 / 8px
```

这些是启动假设，不是硬规范。数据表、画布、日志和仪表盘应使用可用宽度，不要套普通阅读内容最大宽度。

### 11.3 组件优先级

第一阶段必须完整：Button、IconButton、Link、Input、Textarea、Select/Combobox、Checkbox、Radio、Switch、Tooltip、Menu、Popover、Dialog、Drawer/Sheet、Tabs、Toast、InlineAlert、Skeleton、EmptyState。

第二阶段按工具型产品补齐：AppShell、Sidebar、Breadcrumb、CommandPalette、DataTable、FilterBar、Pagination、ResizablePanel、Inspector、Tree、CodeEditor wrapper、FormField、PermissionGate。

每个组件都要定义 default/hover/pressed/focus/disabled/loading/error/selected 等适用状态，并有键盘行为、长文本和浅深主题示例。

## 12. 不应照搬的做法

- 因流行而选择同一种紫蓝渐变、超大圆角和卡片海洋。
- 在侧栏、页面区块、卡片中继续嵌套卡片，层级只能靠阴影理解。
- 把 12px 灰字当作“专业感”，导致可读性和对比度不足。
- 用颜色深浅区分全部状态，却没有文本、图标或形状线索。
- 桌面三栏布局直接缩到移动端，产生不可操作的窄栏。
- 业务页面任意使用 Tailwind arbitrary value 或 hex，绕过 token。
- 为追求统一而封装一个包含几十个布尔参数的万能组件。
- 复制项目源码中的旧组件或迁移中过渡方案，而未确认当前推荐路径。
- 将 GitHub 星标高等同于许可宽松、可访问性好或设计适合自己的用户。

## 13. 设计与工程验收清单

### 信息架构

- [ ] 用户能在 5 秒内判断当前位置、作用域和主操作。
- [ ] 全局、上下文与对象内导航没有重复职责。
- [ ] URL 能表达需要分享/恢复的关键状态。
- [ ] 窄屏有任务重排方案，不只是元素换行。

### 视觉系统

- [ ] 页面没有绕过 token 的随机色值、圆角和阴影。
- [ ] 主要文字、次要文字、边框和状态在浅/深主题均可辨认。
- [ ] 字号与容器密度匹配；12px 不承载主要信息。
- [ ] 边框负责常驻分区，阴影只负责浮层。
- [ ] 最长名称、中文、数字、错误文案不会重叠或撑坏控件。

### 交互

- [ ] 鼠标、键盘与触屏的主要操作路径都明确。
- [ ] hover、focus、selected、pressed、disabled 不混为一态。
- [ ] 加载、空数据、无结果、错误、离线、无权限和只读分别设计。
- [ ] 危险操作显示对象和影响范围，并优先支持撤销。
- [ ] 页面切换不会意外丢失滚动、面板尺寸、筛选或未保存输入。

### 工程

- [ ] token、primitive、pattern 与业务组件有清晰边界。
- [ ] 复杂列表/表格考虑虚拟化和局部更新。
- [ ] 组件演示覆盖状态、主题、密度和长文本。
- [ ] 自动化测试覆盖键盘、焦点、响应式和关键异步状态。
- [ ] 第三方组件库的默认样式经过产品级封装。

## 14. 逐项目详细研究

为避免总报告变成无法维护的十几万字拼接，逐项目的源码值、关键文件路径与来源保存在三份按统一证据标准整理的研究报告中：

### 14.1 数据与开发工具

详见 [data-dev-tools.md](../research/data-dev-tools.md)，包含 Supabase Studio、Grafana、Metabase、DBeaver、Directus、Appsmith、DBX 与 DBX 消歧。

重点精确结论示例：

- Supabase 把设计系统演示应用、共享 `ui` 原语和 `ui-patterns` 组合模式分层，是最适合学习“设计系统作为仓库基础设施”的样本。
- Grafana 的 theme API 使用 8px spacing 基准，`borderRadius(1)` 为 2px、`borderRadius(2)` 为 4px，体现高密度工具对克制圆角的偏好。
- Metabase 正从旧 Emotion/全局工具类收敛到 Mantine style props + CSS Modules，并禁止组件写 literal colors，是大型产品渐进迁移的现实样本。
- DBeaver 的优势是成熟多窗格和上下文动作，而不是现代 Web 视觉；研究它时应学习工作流，不照搬 SWT 外观。
- Directus 的 schema 驱动布局和扩展机制很强，但当前许可不能按旧文章里的 BSL 1.1 简化描述。
- Appsmith 将实体树、画布、属性检查器和调试器组合成 IDE 式低代码壳，适合参考编辑态与运行态分离。
- DBX 用 Tauri 避免 Electron 运行时体积，Vue/CodeMirror/虚拟列表/可调 panel 组成现代本地数据工具基线。

### 14.2 协作与生产力

详见 [productivity-collaboration.md](../research/productivity-collaboration.md)，包含 Plane、AppFlowy、Twenty、Cal.com、Outline、AFFiNE。

重点精确结论示例：

- Plane 主侧栏默认 250px、可在 236-350px 拖动并持久化；扩展栏 300px，hover peek 延迟 1500ms，展示了高密度侧栏应有的完整行为。
- AppFlowy 的 Flutter + Rust local-first 架构与真正移动壳适合跨端产品，但 Web 语义和现成 Web 组件生态需要单独权衡。
- Twenty 将对象元数据映射为表格、管道和记录面板，移动端不强塞桌面抽屉，而是将主导航重组为首页。
- Cal.com 清晰区分管理后台与面向访客的 booking flow；同一系统允许两套密度与品牌表达。
- Outline 证明内容编辑器应让正文成为主角，通过命令栏和情境工具降低常驻 chrome；其 BSL 许可需独立评估。
- AFFiNE 的响应式侧栏源码使用 540/768px 阈值区分隐藏和浮动模式，是“任务重排”而非简单缩窄的具体例子。

### 14.3 创作、AI 与通信

详见 [creative-ai-communication.md](../research/creative-ai-communication.md)，包含 Penpot、Excalidraw、Open WebUI、Chatwoot、Mattermost、Hoppscotch。

重点精确结论示例：

- Penpot 将 ClojureScript 应用状态、共享几何模型、WASM 渲染、RPC 与实时通知组合成专业编辑器，不能按普通 CRUD SPA 估算架构。
- Excalidraw 通过全屏画布、漂浮工具岛和选择后情境属性，将首屏认知负担压到很低，适合学习“默认简单、按需复杂”。
- Open WebUI 使用 Inter，并提供由 `--app-text-scale` 驱动的界面缩放；会话项的高度、padding 和行高随同一 scale 变化。
- Chatwoot 的四栏上下文和队列模型适合客服、工单、邮件类产品；移动端必须显式决定列表与当前会话的返回关系。
- Mattermost 的价值在于长期演化的实时协作状态、线程侧栏、主题变量和插件兼容，而非追求极简外观。
- Hoppscotch 通过 Splitpanes 在宽屏显示请求/响应工作区，并在窄屏改变方向和侧栏呈现，是开发工具响应式的好样本。

## 15. 多端个人应用扩展

详见 [personal-multiplatform-apps.md](../research/personal-multiplatform-apps.md)，新增 Notesnook、Standard Notes、Joplin、Logseq、LocalSend、Immich、Bitwarden Clients、RustDesk、Element、Home Assistant Frontend 和 Actual Budget。

这组项目补足了原报告以桌面/Web 工具为主的局限，并形成四种跨端实现模型：

1. 同一 Web UI + Electron/Tauri/native WebView，例如 Actual Budget。
2. React Web 与 React Native 双壳，共享领域层，例如 Notesnook、Standard Notes、Joplin。
3. Flutter/React Native 单一 UI 真正覆盖多端，例如 LocalSend、RustDesk。
4. 共享协议、SDK 和设计语言，但使用 SwiftUI/Compose/React 分别实现，例如 Element X、Bitwarden。

桌面端适合并行、比较、键盘快捷键和可调面板；Web 端适合易部署与跨设备访问；移动端适合通知、监督、拍摄、语音和即时批准。跨端一致性应落在对象、状态和核心流程上，不要求像素完全一致。

## 16. Claude Code 现代客户端专项

详见 [claude-code-modern-clients.md](../research/claude-code-modern-clients.md)，专项覆盖 CloudCLI、Happy、Paseo、Opcode、CodePilot、cdesktop、TOKENICODE 和 OpenClaudgents。

核心结论：

- 桌面端逐渐收敛为“会话侧栏 + 对话/工具时间线 + Plan/Files/Diff/Preview 工具区”，并通过可调 pane 或分屏支持验证工作。
- Web 端不应直接压缩三栏，而应在窄屏把 sidebar 变 drawer、工具区变 full-screen route/bottom sheet、composer 固定到安全区上方。
- 手机端的第一任务是查看状态、批准权限、阅读摘要/diff 和发送 follow-up，不是完整复刻 IDE。
- 高密度工程工具常用 12-15px 字号与 2-8px 圆角；移动/个人 AI 客户端常用 15-17px 字号与 16-24px composer/sheet 圆角。
- 现代配色的共同点是 3-5 层低 chroma 中性表面，小面积品牌 accent，且把状态色、Git diff 色和 syntax 色分成独立 token 组。
- Claude Code GUI 的核心设计对象不是聊天气泡，而是会话状态、工具执行、权限边界、代码变更和跨设备控制。

## 17. 结论

开源产品最有价值的不是“长得像谁”，而是其已被真实复杂业务磨出来的结构性选择。为新软件建立 UI 基础时，应先复制这些选择背后的约束：稳定的应用 shell、按对象组织的信息架构、语义 token、明确密度档、上下文操作、完整状态模型和可访问交互。品牌色、圆角和字体只是这个系统的外层表达。

本项目的 `reference/design-tokens.css` 提供一套可运行的综合起点；逐项目原始研究位于 `research/`，便于在产品演进后重新核查证据，而无需推翻整份结论。
