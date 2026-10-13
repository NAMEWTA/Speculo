# 协作与生产力类热门开源产品 UI / 架构研究

> 研究对象：Plane、AppFlowy、Twenty、Cal.com、Outline、AFFiNE
>
> 截止日期：2026-08-30（Asia/Shanghai）
>
> 证据范围：官方 GitHub 主仓库、仓库内源码/许可、官方设计系统与官方文档。GitHub 热度为当日 API 快照的约数，不是长期稳定指标。

## 0. 方法与口径

- **精确值**仅抄录自项目源码、官方设计系统 token 或源码常量；均附关键路径。`观察`表示由组件结构、类名和交互代码归纳，`推断`表示未找到正式规范、只能从实现模式判断。
- 源码快照：Plane `effd0c5`（`preview`）；AppFlowy `5cf3a36`（`main`）；Twenty `bfd3ffc`（`main`）；Cal.com/Cal.diy `176037d`（`main`）；Outline `d55e7f3`（`main`）；AFFiNE `4953682`（`canary`）。补充设计系统：Plane Propel `8786a80`、AFFiNE Design `2ce2dfa`。
- “开源”在本文中表示源码公开可研究，并不自动意味着 OSI 许可、允许竞争性托管或所有目录同一许可。Outline、Twenty、AFFiNE 尤其需要逐目录复核。
- 颜色只摘录代表性语义层和品牌层，不复制完整色板；字号、间距、圆角、阴影同理。

## 1. 横向速览

| 产品 | 官方仓库 / 当日约热度 | 许可要点 | 前端主栈 | 最鲜明的 UI 模式 |
| --- | --- | --- | --- | --- |
| Plane | [makeplane/plane](https://github.com/makeplane/plane)，约 **58.5k stars / 5.6k forks** | AGPL-3.0 | React、React Router、Vite、MobX、SWR、Tailwind CSS、Propel | 可缩放/可折叠/可 peek 的项目侧栏；List/Kanban/Gantt 同一数据模型；紧凑工作台 |
| AppFlowy | [AppFlowy-IO/AppFlowy](https://github.com/AppFlowy-IO/AppFlowy)，约 **76.1k / 5.9k** | AGPL-3.0 | Flutter/Dart、Flutter BLoC、GoRouter、Provider；Rust 核心 | 原生跨端、local-first；文档/数据库/看板/日历共用插件式工作区；桌面侧栏到移动抽屉 |
| Twenty | [twentyhq/twenty](https://github.com/twentyhq/twenty)，约 **55.9k / 8.8k** | 主体 AGPLv3 + Section 7 例外；部分 Enterprise；SDK/UI/Apps 等 MIT | React 19、Jotai、Linaria、Apollo/GraphQL、Nx | CRM 数据表/管道/记录侧面板；窄屏把主导航变成首页；高度可配置的数据模型 UI |
| Cal.com | [calcom/cal.diy](https://github.com/calcom/cal.diy)（原 `calcom/cal.com` URL 已重定向），约 **48.0k / 15.0k** | MIT | Next.js 16、React 18、Tailwind CSS 4、tRPC、Prisma、TanStack Query | 日程配置后台 + 对外 Booker 双界面；平板图标栏/桌面宽侧栏；品牌可定制 booking flow |
| Outline | [outline/outline](https://github.com/outline/outline)，约 **40.4k / 3.5k** | BSL 1.1；禁止用作竞争性 Document Service；转换日 2030-07-13 | React 17、MobX、styled-components、ProseMirror/Yjs、Vite | 以写作为中心的低干扰知识库；树形 collection/doc 侧栏；命令栏与实时协作 |
| AFFiNE | [toeverything/AFFiNE](https://github.com/toeverything/AFFiNE)，约 **72.0k / 5.2k** | 前端/大部分内容 MIT；后端和 native 需按目录看，含 EE 与 MPL-2.0 条款 | React 19、Vite、Electron、Vanilla Extract、Jotai、Yjs、BlockSuite | Page 与 Edgeless 白板双模编辑；local-first；可浮动/可缩放侧栏；桌面、Web、iOS、Android 多壳 |

### 共同趋势

1. **稳定壳层 + 可切换内容视图**：左侧全局导航，中央主任务面，必要时右侧详情/评论/AI 面板。区别不在“有没有侧栏”，而在侧栏是否可缩放、可浮动、可持久化。
2. **紧凑中性色作为底盘，语义色只表达状态**：成功、警告、错误、优先级、标签与参与者颜色是主要彩色区域；大面积品牌色很少进入工作台。
3. **命令式入口缩短长路径**：Plane Power K、Outline Command Bar、AFFiNE Quick Search、Cal KBar 等把“搜索 + 导航 + 创建”合并。
4. **移动端不是桌面的等比缩小**：Twenty 直接取消桌面抽屉并把主导航作为移动首页；AFFiNE 有独立移动壳和安全区/键盘变量；AppFlowy 用 Flutter 原生布局；Cal 用窄屏导航；Outline 用断点切换覆盖式侧栏。
5. **设计 token 的成熟度差异明显**：Plane Propel、AppFlowy UI、Twenty UI、Cal token CSS、AFFiNE Design 都有集中式 token；Outline 仍大量依赖主题对象和组件内数值，复制成本更高。

---

## 2. Plane

### 2.1 定位、许可与架构

- 项目管理工作台，核心对象包括 workspace、project、work item、cycle、module、view、page/wiki、intake、analytics。官方文档同时列出 List、Kanban、Calendar、Gantt、Spreadsheet 等视图。
- 主仓库为 pnpm/Turborepo monorepo。Web 前端是 React + React Router + Vite，MobX 管客户端领域状态，SWR 处理请求缓存；UI 使用 Tailwind CSS 与独立的官方 [Propel](https://github.com/makeplane/propel) 设计系统。API 端是 Django/Python，仓库还包含 worker、live、proxy、space、admin 等应用。
- 根许可为 **AGPL-3.0**。自托管修改并通过网络提供服务时要评估 AGPL 源码提供义务。

### 2.2 导航与布局

- `观察`：workspace 项目壳由左侧 `ProjectAppSidebar`、可选 extended sidebar、中央 `<main>` 构成，最外层是带边框与 `rounded-lg` 的连续工作区，而非大量卡片拼贴。
- 主侧栏默认宽度源码常量为 **250 px**，扩展侧栏为 **300 px**；拖拽范围 **236–350 px**，宽度保存在 local storage。折叠后可 hover peek，项目壳设置 peek 延迟 **1500 ms**。
- 侧栏可双击 resize handle 折叠；移动环境把它改为绝对定位覆盖层。主内容内部通过 layout switcher 在 List/Kanban/Gantt 等模式间切换；Kanban 列实现中常见固定 **350 px** 列宽。
- 信息层级通常是：workspace 级导航 → favorites/projects → project 内 cycles/modules/views/pages → 视图工具条 → item 详情抽屉。适合高频扫描与跨项目跳转。

### 2.3 视觉系统（源码 token）

Plane 当前 `packages/tailwind-config/index.css` 明确说明旧 token 已由 Propel 取代，因此以下值来自官方 Propel，而不是历史 Plane CSS。

| 维度 | 精确源码值 / 结论 |
| --- | --- |
| 颜色 | 浅色 canvas `--bg-canvas: var(--neutral-300)`，surface 1 为 `neutral-white`，surface 2 为 `neutral-100`；品牌默认 `oklch(0.4799 0.1158 242.91)`；主文本 `neutral-1200`；危险主色 `red-700`。使用 OKLCH + semantic alias 双层体系。 |
| 字体 | heading/body：`Inter Variable, ui-sans-serif, system-ui...`；code：`IBM Plex Mono...`。权重 300/450/500/600/700/800。 |
| 字号 | 原子级 9/10/11/12/13/14/16/18/20/24/28/32/40 px 对应 rem token；H1 32、H2 28、H3 24、H4 20、H5 18、H6 16；body md/sm/xs 为 16/14/13，行高均 1.54。 |
| 间距 | 未在迁移后的 Plane 层找到独立完整 spacing token；组件主要使用 Tailwind utility。不能仅凭类名宣称一套 Plane 专属间距规范。`观察`：密集列表常用 2/4/8/12/16 px 级组合。 |
| 圆角 | Propel 追加 `3xl = 1.25rem`，其余依赖 Tailwind/组件规格；应用壳 `rounded-lg`、Kanban 列 `rounded-md`、紧凑 icon action 常用 `rounded-sm/xs`。后半句为源码类名观察，不把其换算成未经项目 token 明示的 px。 |
| 阴影 | `raised-100`: `0 1px 6px -1px rgb(41 47 61 / 3%), 0 1px 4px rgb(41 47 61 / 4%)`；`raised-200`: `0 1px 2px -1px .../6%, 0 1px 3px .../5%`；overlay 层使用 10–60 px 的多层柔和阴影。 |

### 2.4 关键组件与交互

- **ResizableSidebar**：resize、collapse、peek、extended sidebar、local persistence 是一套完整交互，而不是静态导航。
- **多布局同构**：`BASE_LAYOUTS` 明确定义 List、Board、Timeline；业务模块再扩展 spreadsheet/calendar。用户无需改变对象模型即可改变观察方式。
- **Work item 详情**：桌面可嵌在布局右侧，窄屏成为全宽 fixed panel；避免丢失列表上下文。
- **Power K / quick actions**：搜索、创建 work item、跨 workspace/project 跳转集中在命令入口。
- **状态视觉**：priority、state、label 使用独立语义/扩展色，主壳保持低饱和。

### 2.5 响应式与可访问性

- 源码使用 Tailwind `sm/md/lg/xl` 分支与 `usePlatformOS().isMobile`，但当前项目层未找到自定义断点 token，因此不在此写入未经证实的项目专属断点 px。
- 主侧栏有 `role="complementary"`、`aria-label`，resize handle 有 `role="separator"`。风险是 resize handle 仍是 `div`，未见 `tabIndex`、键盘增减宽度或 `aria-valuenow`，键盘用户不能获得等价 resize 能力。
- Propel 提供语义色，但仅凭 token 不能证明所有组合达到 WCAG；OKLCH 体系有利于后续自动对比度审计。

### 2.6 可借鉴点与风险

**可借鉴**：把侧栏做成可持久化的工作区工具；让同一数据支持多视图；用 canvas/surface/layer 语义色替代页面级硬编码；在详情 panel 保留列表上下文。

**风险**：AGPL；前后端 monorepo 和多个 app 的部署复杂度；Propel 刚从旧 token 迁移，应用内仍可能存在遗留类/硬编码；桌面优先的高密度布局在移动端需要单独验证；resizer 键盘无障碍不足。

### 2.7 来源与关键路径

- [主仓库 README](https://github.com/makeplane/plane/tree/effd0c57194b1c7d1b9716803c4bb1e4c822520c)、[LICENSE.txt](https://github.com/makeplane/plane/blob/effd0c57194b1c7d1b9716803c4bb1e4c822520c/LICENSE.txt)、[官方产品文档](https://docs.plane.so/)
- [项目布局壳](https://github.com/makeplane/plane/blob/effd0c57194b1c7d1b9716803c4bb1e4c822520c/apps/web/app/%28all%29/%5BworkspaceSlug%5D/%28projects%29/layout.tsx)、[侧栏装配](https://github.com/makeplane/plane/blob/effd0c57194b1c7d1b9716803c4bb1e4c822520c/apps/web/app/%28all%29/%5BworkspaceSlug%5D/%28projects%29/_sidebar.tsx)、[ResizableSidebar](https://github.com/makeplane/plane/blob/effd0c57194b1c7d1b9716803c4bb1e4c822520c/apps/web/core/components/sidebar/resizable-sidebar.tsx)、[sidebar 常量](https://github.com/makeplane/plane/blob/effd0c57194b1c7d1b9716803c4bb1e4c822520c/packages/constants/src/sidebar.ts)
- [Tailwind/Propel 迁移入口](https://github.com/makeplane/plane/blob/effd0c57194b1c7d1b9716803c4bb1e4c822520c/packages/tailwind-config/index.css)、[Propel variables.css](https://github.com/makeplane/propel/blob/8786a8021ebf59e399daba38f8d4f8d7a838a819/packages/propel/src/styles/variables.css)、[Propel 设计约定](https://github.com/makeplane/propel/blob/8786a8021ebf59e399daba38f8d4f8d7a838a819/docs/design.md)
- [Web package.json](https://github.com/makeplane/plane/blob/effd0c57194b1c7d1b9716803c4bb1e4c822520c/apps/web/package.json)、[Django API 入口](https://github.com/makeplane/plane/tree/effd0c57194b1c7d1b9716803c4bb1e4c822520c/apps/api)

---

## 3. AppFlowy

### 3.1 定位、许可与架构

- local-first 的 Notion 类工作区，组合文档、数据库表格、看板、日历、AI chat、团队空间与同步。一个 Flutter 代码库覆盖 Windows/macOS/Linux/iOS/Android，业务和数据核心大量使用 Rust。
- UI 使用 Flutter/Dart，状态以 Flutter BLoC 为主，同时使用 GoRouter、Provider；编辑器为 `appflowy_editor`。仓库结构把 mobile、plugins、workspace、packages/appflowy_ui 分开，属于“原生壳 + 插件式内容能力”。
- 根许可 **AGPL-3.0**；字体与子包可能有各自许可，分发时需保留对应声明。

### 3.2 导航与布局

- 桌面 Home 是左侧 sidebar、中央 tab/document/database 区、可选右侧 edit panel/notification panel。sidebar 最小宽度 **268 px**，right edit panel **400 px**，notification panel 常量 **380 px**，top bar **44 px**，tab bar 高 **40 px**。
- 当屏宽 `<= 768`（`PageBreaks.tabletPortrait`）且菜单展开时，sidebar 变为 drawer，不再占中央内容 offset；断点还定义 550、1024、1440。
- 侧栏结构由 workspace switcher、favorites、spaces、folder/page tree、search/new page、trash/footer 组成。Bloc 监听 workspace、space、favorites、tabs，使创建/切换页面直接打开对应插件 tab。
- `观察`：它比 Web SaaS 更接近桌面 IDE/知识工具，tab、多面板、可 resize 与平台窗口行为都是一级概念。

### 3.3 视觉系统（AppFlowy UI token）

| 维度 | 精确源码值 / 结论 |
| --- | --- |
| 颜色 | 浅色 primary text `#21232A`，secondary `#6F748C`；action `#0092D6`，hover `#0078C0`；品牌 skyline `#00B5FF`、violet `#9327FF`、berry `#E3006D`、lemon `#FFCE00`。色板是 primitive → semantic scheme。 |
| 字体 | 主题默认 `fontFamily: ''`，交由 Flutter/平台默认字体；用户可选择 Google Fonts。不要把某一种字体误称为全平台强制品牌字体。 |
| 字号 | Heading 1/2/3/4 = **36/24/20/16**，对应行高 40/32/28/22；Headline 24/36，Title 20/28，Body 14/20，Caption 12/18；常用权重 400/600/700。 |
| 间距 | UI token xs/s/m/l/xl/xxl = **4/6/8/12/16/20 px**。旧/基础 infra 另有动态 Insets 2/6/12/24/36/64/80，两套尺度并存。 |
| 圆角 | UI token xs/s/m/l/xl/xxl = **4/6/8/12/16/20 px**；基础 infra 另保留 3/4/5/6/8/10/12/16。 |
| 阴影 | 浅色 small：offset `(0,2)`、blur 16、`#000` 12%（alpha `0x1F`）；medium：`(0,4)`、blur 32、同 alpha。暗色改为 alpha `0x7A`（约 48%）。 |

### 3.4 关键组件与交互

- **文档编辑器**：block editor、slash/toolbar、颜色/字体/页面样式、图片多布局；数据库 block 可在 Grid/Kanban/Calendar 间切换。
- **空间与页面树**：favorites、private/public space、folder、拖拽、重命名、复制、移动、recent/search，构成稳定信息架构。
- **Tabs + plugins**：页面打开为 plugin tab，文档、数据库和空白页共享导航生命周期。
- **自定义主题**：不仅深浅色，还支持上传 theme；primitive/semantic 自动生成文件减少手写漂移。
- **原生跨端**：移动工具条、键盘、字体选择与通知组件独立实现，不假设 hover。

### 3.5 响应式与可访问性

- Flutter 断点为 550/768/1024/1440；`HomeLayout` 在 768 切 drawer，是明确的源码常量。
- Flutter 原生 `Semantics`、Tooltip、平台焦点机制可提供基础能力，但“使用 Flutter”不等于自动无障碍。`观察`：源码中桌面 hover/鼠标菜单很多，需逐项检查键盘顺序和移动替代动作。
- 基础 `Sizes.hit = 40` 表明不少目标以 40 逻辑像素为基线；它不是全局强制最小触控尺寸，不能据此宣称全部达到 44/48 标准。

### 3.6 可借鉴点与风险

**可借鉴**：用 primitive/semantic 两层 token；把移动端视为独立交互壳；用统一 plugin/tab 生命周期承载多内容类型；保留 local-first 和用户字体/主题选择。

**风险**：AGPL；Flutter Web 与传统 DOM 产品在 bundle、可复制文本、浏览器扩展、SEO/无障碍工具链上取舍不同；旧 infra 与新 AppFlowy UI token 并存可能产生间距/圆角漂移；Rust + Flutter 的贡献门槛较高。

### 3.7 来源与关键路径

- [主仓库](https://github.com/AppFlowy-IO/AppFlowy/tree/5cf3a365dec0d59f64bad1ee4bb1050471a39b93)、[LICENSE](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/LICENSE)、[官方开发文档与架构入口](https://docs.appflowy.io/docs/documentation/appflowy)
- [Flutter pubspec](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/pubspec.yaml)、[HomeLayout](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/lib/workspace/presentation/home/home_layout.dart)、[HomeSizes](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/lib/workspace/presentation/home/home_sizes.dart)、[sidebar](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/lib/workspace/presentation/home/menu/sidebar/sidebar.dart)
- [共享 spacing/radius/shadow](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/packages/appflowy_ui/lib/src/theme/data/shared.dart)、[primitive colors](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/packages/appflowy_ui/lib/src/theme/data/appflowy_default/primitive.dart)、[semantic theme](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/packages/appflowy_ui/lib/src/theme/data/appflowy_default/semantic.dart)、[type scale](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/packages/appflowy_ui/lib/src/theme/definition/text_style/base/default_text_style.dart)
- [断点/基础尺寸](https://github.com/AppFlowy-IO/AppFlowy/blob/5cf3a365dec0d59f64bad1ee4bb1050471a39b93/frontend/appflowy_flutter/packages/flowy_infra/lib/size.dart)

---

## 4. Twenty

### 4.1 定位、许可与架构

- 面向可定制数据模型的 CRM：Companies、People、Opportunities 只是预置对象，核心抽象是 objects/fields/views/records/workflows/pages。UI 必须同时服务 table、kanban、calendar、record page、dashboard 和 schema/settings。
- Yarn 4 + Nx monorepo。前端 React 19、Jotai、Linaria、Apollo Client/GraphQL；后端 NestJS、BullMQ、TypeORM，配 PostgreSQL/Redis。`twenty-ui` 是独立组件与主题库，官方 docs 有 Twenty UI 专区。
- **混合许可**：根 LICENSE 说明主体 AGPLv3，并带 Twenty Application Exception；标注 `/* @license Enterprise */` 的文件走商业许可；`twenty-sdk`、client SDK、create app、shared、`twenty-ui` 与 apps 等部分为 MIT。不能用 GitHub 的 `NOASSERTION` 简化成“无许可”。

### 4.2 导航与布局

- 桌面主壳：可 resize/collapse 的 Navigation Drawer + Page body + 500 px 默认 side panel。导航可在普通导航与 AI history tab 间切换，并允许 workspace 自定义 navigation menu items。
- Drawer 默认 **220 px**、范围 **180–350 px**、折叠宽 **40 px**，持久化到 local storage；页面 body 使用连续表格/画布，record 通常在侧面板或 record page 打开。
- 移动断点 **768 px**。源码明确写道“main navigation is the home page on mobile, not a drawer”，因此移动端不渲染桌面 AppNavigationDrawer，而是把对象入口提升为首页。
- `观察`：CRM 高密度任务以表格、筛选、排序、group、saved view 为中心，UI 装饰服从横向字段比较和批量操作。

### 4.3 视觉系统（Twenty UI token）

| 维度 | 精确源码值 / 结论 |
| --- | --- |
| 颜色 | 浅色灰阶以 Display-P3 定义：gray1 `color(display-p3 1 1 1)`，gray4 `0.945`，gray12 `0.2`；background primary/secondary/tertiary 映射 gray1/2/4；accent 以 Radix Indigo P3 + 内部 blue scale 组合。 |
| 字体 | `Inter, sans-serif`；权重 400/500/600。 |
| 字号 | xxs/xs/sm/md/lg/xl/xxl = **0.625/0.85/0.92/1/1.23/1.54/1.85 rem**。注意该尺度不是整数 px 的简单映射。 |
| 间距 | `spacingMultiplicator = 4`，`theme.spacing(n...)` 输出 `n × 4 px`；siblings gap 2 px；表格 checkbox 列 32 px，cell horizontal margin/padding 均 8 px。 |
| 圆角 | xs/sm/md/lg/xl/xxl = **2/4/8/16/20/40 px**；pill 999 px；rounded 100%。 |
| 阴影 | Light：`0 2px 4px gray2 + 0 0 4px gray5`；Strong：`2px 4px 16px gray7 + 0 2px 4px gray5`；另有 underline/superHeavy。alpha 值在 `GrayScaleLightAlpha.ts`，不能只凭名字假定百分比。 |

### 4.4 关键组件与交互

- **Object table / pipeline**：字段类型丰富、inline cell 编辑、column resize、filter/group/sort、批量选择；这是 UI 系统的主要压力测试。
- **Record side panel**：不离开列表即可查看/编辑记录、活动、邮件、关系；side panel 宽度 token 为 500 px。
- **Navigation Drawer**：resize、collapse、custom item/folder、对象与 view 入口、AI chat history tab。
- **Command menu / workflow builder / layout customization**：把复杂 CRM 操作收敛到可搜索命令与结构化配置面板。
- **Twenty UI**：组件以 SCSS modules/Linaria 与 theme CSS variables 混合，Storybook/docs 为复用入口。

### 4.5 响应式与可访问性

- 单一核心 mobile breakpoint 为 **768 px**，SCSS mixin 与 TypeScript 常量对齐；桌面 drawer 在窄屏可全 viewport，但主 app 逻辑通常直接不渲染它。
- Navigation/inputs 大量使用语义组件，但复杂 data grid 的键盘 roving、screen reader 表头关系和 virtualized content 仍应作为专项测试，而不是由组件库存在推定合规。
- Display-P3 提升广色域一致性，但需要 sRGB fallback/旧浏览器验证；主题变量与动态 workspace color 也要做对比度约束。

### 4.6 可借鉴点与风险

**可借鉴**：让 schema、view、navigation 都可配置；把详情放入 side panel；把 4 px spacing、圆角、字体与 P3 灰阶做成可编程 token；移动端重新定义导航信息架构。

**风险**：许可矩阵复杂，Enterprise 标记必须文件级扫描；Nx/Nest/GraphQL/metadata engine 学习成本高；高密度表格在窄屏很难完整等价；`twenty-ui` 主题正在同时承载 TS constants、CSS variables、SCSS modules，复用时要避免只抽一层。

### 4.7 来源与关键路径

- [主仓库/README](https://github.com/twentyhq/twenty/tree/bfd3ffc03d819f51f171157139e93c6491daa498)、[混合 LICENSE](https://github.com/twentyhq/twenty/blob/bfd3ffc03d819f51f171157139e93c6491daa498/LICENSE)、[官方文档](https://docs.twenty.com/)、[Twenty UI 文档](https://docs.twenty.com/twenty-ui/introduction)
- [前端架构文档](https://github.com/twentyhq/twenty/blob/bfd3ffc03d819f51f171157139e93c6491daa498/packages/twenty-docs/developers/contribute/capabilities/frontend-development/folder-architecture-front.mdx)、[前端 package](https://github.com/twentyhq/twenty/blob/bfd3ffc03d819f51f171157139e93c6491daa498/packages/twenty-front/package.json)、[服务端 package](https://github.com/twentyhq/twenty/blob/bfd3ffc03d819f51f171157139e93c6491daa498/packages/twenty-server/package.json)
- [AppNavigationDrawer](https://github.com/twentyhq/twenty/blob/bfd3ffc03d819f51f171157139e93c6491daa498/packages/twenty-front/src/modules/navigation/components/AppNavigationDrawer.tsx)、[Resizable NavigationDrawer](https://github.com/twentyhq/twenty/blob/bfd3ffc03d819f51f171157139e93c6491daa498/packages/twenty-front/src/modules/ui/navigation/navigation-drawer/components/NavigationDrawer.tsx)、[drawer constraints](https://github.com/twentyhq/twenty/blob/bfd3ffc03d819f51f171157139e93c6491daa498/packages/twenty-front/src/modules/ui/layout/resizable-panel/constants/NavigationDrawerConstraints.ts)
- [FontCommon](https://github.com/twentyhq/twenty/blob/bfd3ffc03d819f51f171157139e93c6491daa498/packages/twenty-ui/src/theme/constants/FontCommon.ts)、[ThemeCommon/spacing](https://github.com/twentyhq/twenty/blob/bfd3ffc03d819f51f171157139e93c6491daa498/packages/twenty-ui/src/theme/constants/ThemeCommon.ts)、[BorderCommon](https://github.com/twentyhq/twenty/blob/bfd3ffc03d819f51f171157139e93c6491daa498/packages/twenty-ui/src/theme/constants/BorderCommon.ts)、[BoxShadowLight](https://github.com/twentyhq/twenty/blob/bfd3ffc03d819f51f171157139e93c6491daa498/packages/twenty-ui/src/theme/constants/BoxShadowLight.ts)、[768 breakpoint](https://github.com/twentyhq/twenty/blob/bfd3ffc03d819f51f171157139e93c6491daa498/packages/twenty-ui/src/theme-constants/constants.ts)

---

## 5. Cal.com / Cal.diy

### 5.1 定位、许可与架构

- 开源 scheduling infrastructure，产品有两类截然不同但共享品牌系统的 UI：登录后的 event types/availability/bookings/settings 后台，以及对外 booking 页面/嵌入式 Booker。
- 2026-08-30 访问旧官方仓库 URL `calcom/cal.com` 已重定向到 **`calcom/cal.diy`**；本文研究同一代码谱系，不把它计为另一个产品。
- Yarn/Turborepo monorepo；Next.js 16 + React 18 + Tailwind CSS 4，使用 tRPC、Prisma、TanStack Query、NextAuth，并拆有 API v2、features、platform atoms、embeds、app store、`coss-ui`。
- 根许可为 **MIT**，是六者中最宽松、最便于商业复用的主应用许可。

### 5.2 导航与布局

- 登录后台的经典壳：左 sidebar + page header/main。`md` 显示窄图标栏 `w-14`，`lg` 扩为 `w-56` 并显示文字与 profile；移动端不显示该 aside，使用主导航的移动实现。
- 侧栏包含 event types、bookings、availability、teams/apps、settings 等任务入口；底部放帮助/公开页/credits，KBar 作为快速入口。
- Booker 以“选择事件/日期 → 可用时间 → 表单 → 确认”为线性流程，支持 timezone、locale、品牌色与 embed。`观察`：管理端追求扫描，Booker 追求单任务低认知负担，两者不强行共用同一版式。
- 新 `coss-ui` sidebar primitive 支持 offcanvas/icon、floating/inset、mobile Sheet、cookie persistence 与 keyboard toggle，显示产品正在把遗留固定 sidebar 抽象成复用壳。

### 5.3 视觉系统（Cal token CSS）

| 维度 | 精确源码值 / 结论 |
| --- | --- |
| 颜色 | 浅色 background `--cal-bg: hsla(0,0%,100%,1)`，subtle `hsla(220,14%,94%,1)`，muted `hsla(210,20%,97%,1)`；primary `hsla(214,30%,16%,1)`；text emphasis `hsla(210,30%,4%,1)`；border `hsla(216,12%,84%,1)`。Brand 可由组织/booking theme 覆盖。 |
| 字体 | body 是 Next Font 的 **Inter** + system-ui；display 使用本地 `CalSans-SemiBold.woff2`（`--font-cal`）。官方 Cal Sans 2 另有独立字体仓库，但此快照 app 明确加载的是上述文件。 |
| 字号 | 未发现独立 Cal type-scale token；主要使用 Tailwind `text-xs/sm/lg/xl/...`。源码存在少量明确例外，如 onboarding title **28 px**。因此不把 Tailwind 默认尺度冒充 Cal 专属 token。 |
| 间距 | 未重定义 Tailwind 的基础 spacing；组件使用 Tailwind scale。精确可见例子：sidebar `py-3/lg:px-3`、item `px-2 py-1.5` 是源码 utility，不在此自行换算 px。 |
| 圆角 | none/sm/base/md/lg/xl/2xl/3xl/full = **0/2/4/6/8/12/16/24/9999 px**。 |
| 阴影 | dropdown：`0 5px 20px rgba(0,0,0,.10), 0 10px 40px rgba(0,0,0,.03)`；elevation-low 是 1–2 px 多层阴影；buttons 另有 rested/hover/active/focused 内外阴影 token。 |

### 5.4 关键组件与交互

- **Event type card/list**：复制、启停、编辑、分享、嵌入、team ownership 是核心重复动作。
- **Availability editor**：按 weekday 分组的时间区间、date override、timezone；比纯 calendar grid 更适合规则配置。
- **Booker**：calendar/date picker、slot list、timezone/locale、表单、确认；layout/theme 可由 API/event type 控制。
- **App Store / conferencing / calendars**：集成以安装卡、credential state 与设置页组织。
- **COSS UI primitives**：Radix/shadcn 风格的 sidebar、dialog、sheet、command、tabs 等，和旧 `packages/ui` 正处于共存期。

### 5.5 响应式与可访问性

- legacy shell 通过 `md/lg` 改变侧栏；全局 CSS 对 **max-width 768 px** 隐藏第三方 chat FAB，避免遮挡移动流程。COSS sidebar 在移动端使用 Sheet。
- 侧栏 icon-only 状态配 Tooltip，底部 link 有 `aria-label`，COSS trigger 有 `sr-only` 文本，rail 有 `aria-label`。
- 风险：新旧组件库共存造成 focus ring、圆角与命名差异；booking embed、timezone picker、calendar grid 需要专项键盘与 screen reader 测试；第三方 widget 会影响焦点和 z-index。

### 5.6 可借鉴点与风险

**可借鉴**：同一领域分“后台配置”和“外部完成任务”两套信息架构；品牌变量通过语义 alias 注入而非复制组件；窄屏 icon rail 到宽 sidebar 的渐进展开；MIT 便于直接学习实现。

**风险**：`packages/ui` 与 `coss-ui` 迁移期的视觉债务；Next/tRPC/Prisma 大 monorepo 运行成本；强品牌定制容易破坏对比度；仓库已改名，旧链接/包名/文案中仍可能同时出现 Cal.com、Cal.diy。

### 5.7 来源与关键路径

- [当前官方仓库](https://github.com/calcom/cal.diy/tree/176037d0afbe572f870a3c702985e7cd83fe6c0c)、[MIT LICENSE](https://github.com/calcom/cal.diy/blob/176037d0afbe572f870a3c702985e7cd83fe6c0c/LICENSE)、[官方文档](https://cal.com/docs/availability)
- [Web package](https://github.com/calcom/cal.diy/blob/176037d0afbe572f870a3c702985e7cd83fe6c0c/apps/web/package.json)、[App layout / fonts](https://github.com/calcom/cal.diy/blob/176037d0afbe572f870a3c702985e7cd83fe6c0c/apps/web/app/layout.tsx)、[legacy SideBar](https://github.com/calcom/cal.diy/blob/176037d0afbe572f870a3c702985e7cd83fe6c0c/apps/web/modules/shell/SideBar.tsx)
- [核心 tokens.css](https://github.com/calcom/cal.diy/blob/176037d0afbe572f870a3c702985e7cd83fe6c0c/packages/config/theme/tokens.css)、[COSS globals](https://github.com/calcom/cal.diy/blob/176037d0afbe572f870a3c702985e7cd83fe6c0c/packages/coss-ui/src/styles/globals.css)、[COSS sidebar primitive](https://github.com/calcom/cal.diy/blob/176037d0afbe572f870a3c702985e7cd83fe6c0c/packages/coss-ui/src/components/sidebar.tsx)、[Web globals/responsive widget rules](https://github.com/calcom/cal.diy/blob/176037d0afbe572f870a3c702985e7cd83fe6c0c/apps/web/styles/globals.css)
- [Cal Sans 官方仓库](https://github.com/calcom/sans)

---

## 6. Outline

### 6.1 定位、许可与架构

- 团队知识库/wiki，重点是 collections、nested documents、search、markdown shortcuts、realtime collaboration、comments、sharing、permissions 与 integrations。
- 单仓全栈 TypeScript：React 17 + MobX + React Router + styled-components + Vite；编辑器基于 ProseMirror/Yjs，协作使用 Hocuspocus/Socket.IO；服务端 Koa + Sequelize/PostgreSQL + Redis/Bull。
- **Business Source License 1.1**，当前 Licensed Work 为 Outline 1.9.1；Additional Use Grant 明确禁止把它用于对第三方提供竞争性的 “Document Service”；Change Date **2030-07-13**。它是 source-available，不应在采购表中无条件写成 OSI open source。

### 6.2 导航与布局

- 左侧树形 sidebar 按 Home/Search/Drafts、Starred、Shared with me、Collections、Archive/Trash 组织；collection/document 支持嵌套、展开、拖拽与自定义 section order。
- 中央是以阅读/写作为主的单列文档面；右侧按需出现 comments/metadata 等 `Aside`。左侧默认 **260 px**，collapsed 占位 **16 px**；右侧默认 **300 px**；可 resize 范围为包含 padding 的最小 **256 px** 到最大 **500 px**。
- 左侧侧栏折叠快捷键为 Mod + `.`；搜索/新文档有全局键盘触发；Command Bar 统一收敛动作。
- `观察`：Outline 的版式最克制，导航树提供结构，中央把视觉预算让给正文，浮层只用于命令、菜单和 modal。

### 6.3 视觉系统（theme.ts + globals.ts）

| 维度 | 精确源码值 / 结论 |
| --- | --- |
| 颜色 | Light：background `#FFF`，text `#111319`，sidebar background `hsl(212 31% 95%)`，sidebar hover/active 为同色相 90%/85% lightness，accent `#0366D6`；Dark：background `#111319`，sidebar `#08090C`，text `#E6E6E6`。 |
| 字体 | `-apple-system, BlinkMacSystemFont, Inter, 'Segoe UI', Roboto, Oxygen, sans-serif`；mono 为 SFMono/Consolas/Liberation Mono/Menlo/Courier。权重 400/500/600。 |
| 字号 | body **16 px / 1.5**；H1/H2/H3/H4/H5 = **36/26/20/18/16 px**，heading line-height 1.25、weight 500。 |
| 间距 | 没有集中 spacing scale；组件内多为 4/8/12/16 等值。此处只能归纳为实现观察，不宣称官方 token。 |
| 圆角 | 没有集中 radius token。源码高频：sidebar links/inputs 4 px、buttons 6 px、command bar/cards 8 px、reaction 12 px；属于组件约定而非统一 scale。 |
| 阴影 | Light menu：`0 0 0 1px rgb(0 0 0 / 2%), 0 4px 8px .../8%, 0 2px 4px .../0%, 0 30px 40px .../8%`；modal 类似但无 1 px ring；Command Bar `0 16px 60px rgb(0 0 0 / 40%)`。 |

### 6.4 关键组件与交互

- **ProseMirror editor**：Markdown 兼容、slash/format toolbar、tables、embeds、mentions、comments、history；实时协作通过 Yjs。
- **Collection/document tree**：递归 disclosure、drag/drop、favorites、shared、archive，是知识库可发现性的核心。
- **Command Bar**：搜索、导航、创建和上下文 action；比给每页堆按钮更适合文档产品。
- **Permissions/share**：collection、document、group、guest/public link 的边界在 UI 中持续可见。
- **Right Aside**：评论等辅助任务按需进入，不挤占默认写作宽度。

### 6.5 响应式与可访问性

- 官方 breakpoint：mobile 0、mobileLarge **460**、tablet **737**、desktop **1025**、desktopLarge **1600 px**。小于 tablet 时主 content 清除 sidebar margin，right aside 变为绝对覆盖层。
- 有 SkipNavLink/SkipNavContent、全局 `:focus-visible`、RTL DirectionProvider、safe-area variables；`prefers-reduced-motion: reduce` 把动画/过渡降到 0.01 ms，这是六者中证据最完整的一组基础无障碍措施。
- 风险：React 17/MobX 4 和大量 styled-components 组件内样式使一致性审计较难；嵌套 tree 与编辑器仍需真实 screen reader/IME/键盘回归。

### 6.6 可借鉴点与风险

**可借鉴**：为写作产品保持“树 + 文档 + 按需 aside”的单一主轴；把 skip link、focus-visible、reduced motion、RTL 放进全局基础层；允许用户调整 sidebar 宽度但限制合理范围。

**风险**：BSL 的竞争服务限制是首要风险；缺乏集中 spacing/radius token；技术版本偏旧；复杂富文本与实时协作的测试成本高；主题颜色允许自定义时仍需对比度校验。

### 6.7 来源与关键路径

- [主仓库/README](https://github.com/outline/outline/tree/d55e7f37e551a72d7b959ededa79e267fb946f1d)、[BSL LICENSE](https://github.com/outline/outline/blob/d55e7f37e551a72d7b959ededa79e267fb946f1d/LICENSE)、[官方用户指南](https://docs.getoutline.com/s/guide)、[架构文档](https://github.com/outline/outline/blob/d55e7f37e551a72d7b959ededa79e267fb946f1d/docs/ARCHITECTURE.md)
- [AuthenticatedLayout](https://github.com/outline/outline/blob/d55e7f37e551a72d7b959ededa79e267fb946f1d/app/components/AuthenticatedLayout.tsx)、[Layout](https://github.com/outline/outline/blob/d55e7f37e551a72d7b959ededa79e267fb946f1d/app/components/Layout.tsx)、[App sidebar](https://github.com/outline/outline/blob/d55e7f37e551a72d7b959ededa79e267fb946f1d/app/components/Sidebar/App.tsx)、[Right Aside](https://github.com/outline/outline/blob/d55e7f37e551a72d7b959ededa79e267fb946f1d/app/components/Sidebar/Aside.tsx)
- [theme.ts](https://github.com/outline/outline/blob/d55e7f37e551a72d7b959ededa79e267fb946f1d/shared/styles/theme.ts)、[globals.ts](https://github.com/outline/outline/blob/d55e7f37e551a72d7b959ededa79e267fb946f1d/shared/styles/globals.ts)、[breakpoints.ts](https://github.com/outline/outline/blob/d55e7f37e551a72d7b959ededa79e267fb946f1d/shared/styles/breakpoints.ts)、[Theme/RTL](https://github.com/outline/outline/blob/d55e7f37e551a72d7b959ededa79e267fb946f1d/app/components/Theme.tsx)
- [package.json](https://github.com/outline/outline/blob/d55e7f37e551a72d7b959ededa79e267fb946f1d/package.json)

---

## 7. AFFiNE

### 7.1 定位、许可与架构

- local-first 的 all-in-one knowledge workspace，核心差异是同一内容可在 **Page**（文档）与 **Edgeless**（无限画布/白板）中组织；还包括数据库、journal、collections、tags、AI、实时协作。
- Yarn monorepo，React 19 + Vite + Electron + Vanilla Extract + Jotai；编辑/协作核心是同仓 BlockSuite、Yjs 和 Rust/native 数据层；另有 NestJS/Prisma/PostgreSQL/Redis/BullMQ 服务端及 iOS/Android 壳。
- **混合许可**：根 LICENSE 表示 `packages/backend`、`packages/common/native` 等按各目录许可，其余主要 MIT；后端 server LICENSE 包含 AFFiNE EE 条款，同时说明 CE 或发往客户端的 JS/CSS/font/image 部分按 MPL-2.0。必须按要复用的具体目录判定，不能只写“MIT”。

### 7.2 导航与布局

- 桌面 workspace 是 AppSidebar + Workbench，多 view 支持 split/peek；sidebar 组织 workspace selector、quick search/new page、All Docs、Journal、Notifications、AI、Favorites、Organize、Tags、Collections、Trash/Import/Invite。
- Sidebar 可 resize，范围 **248–480 px**；小屏可 floating with mask，关闭时也支持 hover floating。响应 hook 默认在 **<=540 px** 隐藏 sidebar，在跨越 **768 px** 时切 small-screen floating mode。
- Page 主编辑宽度 token **944 px**、side padding **96 px**；全局在 768 以下把 page title 上距从 40 调为 24，并让 editor width 100%。Edgeless 则去除页面 padding，使用全画布 toolbar/zoom。
- 移动版有独立 bottom tabs：iOS **49 px**、其他移动端 **62 px**，并把 safe area 与虚拟键盘高度纳入 CSS 变量。

### 7.3 视觉系统（官方 `toeverything/design`）

| 维度 | 精确源码值 / 结论 |
| --- | --- |
| 颜色 | Light：brand/primary `#1E96EB`，background primary `rgb(255,255,255)`、secondary `rgba(244,244,245,1)`，text primary `rgb(18,18,18)`、secondary `rgb(142,141,145)`；Dark：background primary `rgb(20,20,20)`、text primary `rgb(234,234,234)`。 |
| 字体 | UI：`Inter, Source Sans 3, Poppins, system...`；serif `Source Serif 4`；mono `Source Code Pro/IBM Plex Mono...`；code `IBM Plex Mono/Space Mono...`。仓库内实际打包 Inter、Source Code Pro、Kalam、Source Serif 4、Space Mono、IBM Plex Mono。 |
| 字号 | legacy base token：Title/H1/H2/H3/H4/H5/H6/Base/Sm/Xs = **36/28/26/24/22/20/18/15/14/12 px**。官方 typography preset 另有 iOS 风格 34/28/22/20/17/16/15/13/12/11 级别，说明新旧体系并存。 |
| 间距 | 没有单一全局 spacing token；源码常见 4/6/8/12 等组件值。Page token 明确 paragraph space 8、editor side padding 96。不能由观察推成完整官方 scale。 |
| 圆角 | base 只集中定义 popover radius **12 px**；sidebar hover floating 使用 6 px；其他组件圆角分散。未发现完整官方 radius scale。 |
| 阴影 | Light button `0 0 1px rgba(0,0,0,.12), 0 1px 5px rgba(0,0,0,.12)`；menu `0 10px 18px rgba(0,0,0,.14), 0 -1px 12px rgba(0,0,0,.08)`；popover 是 30 px + 4 px + inset 多层阴影；active ring `0 0 0 2px rgba(30,150,235,.30)`。 |

### 7.4 关键组件与交互

- **BlockSuite Page/Edgeless 双模**：同一 block model 支持文档排版与白板空间组织，是最有辨识度的架构资产。
- **Workbench**：split view、peek view、sidebar tab、doc navigation，把知识工具做成多任务桌面环境。
- **AppSidebar**：resize、persistent state、hover floating、small-screen mask、拖拽到 workbench resize edge。
- **Quick Search / collections / tags / journal**：既有树式入口，也有横向聚合入口，减少只靠文件夹组织的局限。
- **Theme editor**：官方 design token 与应用内 custom theme editor 相连，支持 runtime 主题修改。

### 7.5 响应式与可访问性

- 明确阈值：hide **540 px**、float **768 px**；移动端使用 `100dvh`、safe-area 与 keyboard height，说明对真实移动 viewport 有专门处理。
- global CSS 清除 `[contenteditable]:focus-visible` 是为了编辑体验，但移动 CSS 又清除 `a:focus`、`button:focus` outline；如果没有组件级替代 focus style，会对键盘可见焦点构成风险。
- 编辑器/画布同时面对 contenteditable、canvas、拖拽、缩放、多人 cursor；仅有 DOM aria 不足，需要 Page 模式的 screen reader 路径、Edgeless 的替代表述与 reduced-motion 审计。

### 7.6 可借鉴点与风险

**可借鉴**：同一 block data model 支持线性文档与空间画布；为侧栏提供 open/floating/hover 三态；把移动键盘和 safe area 当布局变量；将设计系统独立为可发布包。

**风险**：许可目录边界复杂；BlockSuite + Yjs + native + 多端壳的维护门槛最高；legacy theme 与 v2 token/typography 共存；Edgeless 模式的可访问性天然困难；全局隐藏 scrollbar 和 focus outline 会增加可发现性风险。

### 7.7 来源与关键路径

- [主仓库/README](https://github.com/toeverything/AFFiNE/tree/49536827790702ad0ab6d3be3405d891a6b19f83)、[根 LICENSE](https://github.com/toeverything/AFFiNE/blob/49536827790702ad0ab6d3be3405d891a6b19f83/LICENSE)、[backend server LICENSE](https://github.com/toeverything/AFFiNE/blob/49536827790702ad0ab6d3be3405d891a6b19f83/packages/backend/server/LICENSE)
- [前端 core package](https://github.com/toeverything/AFFiNE/blob/49536827790702ad0ab6d3be3405d891a6b19f83/packages/frontend/core/package.json)、[后端 package](https://github.com/toeverything/AFFiNE/blob/49536827790702ad0ab6d3be3405d891a6b19f83/packages/backend/server/package.json)、[workspace layout](https://github.com/toeverything/AFFiNE/blob/49536827790702ad0ab6d3be3405d891a6b19f83/packages/frontend/core/src/desktop/pages/workspace/layouts/workspace-layout.tsx)
- [AppSidebar implementation](https://github.com/toeverything/AFFiNE/blob/49536827790702ad0ab6d3be3405d891a6b19f83/packages/frontend/core/src/modules/app-sidebar/views/index.tsx)、[sidebar styles](https://github.com/toeverything/AFFiNE/blob/49536827790702ad0ab6d3be3405d891a6b19f83/packages/frontend/core/src/modules/app-sidebar/views/index.css.ts)、[responsive sidebar hook](https://github.com/toeverything/AFFiNE/blob/49536827790702ad0ab6d3be3405d891a6b19f83/packages/frontend/core/src/components/hooks/use-responsive-siedebar.ts)、[mobile layout variables](https://github.com/toeverything/AFFiNE/blob/49536827790702ad0ab6d3be3405d891a6b19f83/packages/frontend/core/src/mobile/styles/mobile.css.ts)
- [应用 fonts.css](https://github.com/toeverything/AFFiNE/blob/49536827790702ad0ab6d3be3405d891a6b19f83/packages/frontend/component/src/theme/fonts.css)、[global.css](https://github.com/toeverything/AFFiNE/blob/49536827790702ad0ab6d3be3405d891a6b19f83/packages/frontend/component/src/theme/global.css)
- [官方 design 仓库](https://github.com/toeverything/design)、[theme tokens](https://github.com/toeverything/design/blob/2ce2dfa5d9c207e270d874275b3b3d2dd5cfaf91/packages/theme/src/index.ts)、[typography preset](https://github.com/toeverything/design/blob/2ce2dfa5d9c207e270d874275b3b3d2dd5cfaf91/packages/theme/src/presets/typography.css.ts)、[Design System 文档](https://toeverything.github.io/design/)

---

## 8. 可直接转化为设计决策的模式

### 8.1 推荐组合

| 目标 | 最值得参考 | 落地建议 |
| --- | --- | --- |
| 高密度项目/CRM | Plane + Twenty | 左侧 220–280 px 可 resize；中央 list/table/board；详情右侧 panel；把 view state 存 URL/local preference。 |
| 文档/知识库 | Outline + AppFlowy | 树只负责定位，正文保持单一视觉主轴；命令栏负责跨层导航；移动端把树改 drawer。 |
| 文档 + 白板 | AFFiNE | 先统一 block/data model，再做 Page/Canvas 两种 renderer；不要从两个互不兼容编辑器开始。 |
| 对外完成型流程 | Cal.com | 把后台配置 UI 与客户完成 UI 分开；外部流程一次只问一个决定，并优先 timezone/locale/accessibility。 |
| Token 架构 | Plane Propel + AppFlowy UI + Twenty UI | primitive → semantic → component 三层；颜色、type、spacing、radius、shadow 均可机器读取；dark/high-contrast 不在组件内分叉。 |

### 8.2 应避免的照搬

- 不要因为六个产品都有左侧栏，就复制它们的具体 IA。侧栏内容必须对应自己的对象模型和高频路径。
- 不要从截图吸颜色；这些项目大量支持 dark/custom brand/runtime theme，截图只是一个状态。
- 不要同时引入两套 spacing/type/radius 系统。AppFlowy、Cal、AFFiNE 的新旧系统共存是迁移现实，不是目标架构。
- 不要把鼠标 resize/hover peek 当完整交互；必须补键盘操作、触控替代、ARIA value 与 focus management。
- 不要把“源码可见”当作“可随意商用”。Outline 的 BSL、Twenty/AFFiNE 的目录级许可、Plane/AppFlowy 的 AGPL 都会影响产品路线。

## 9. 最终判断

- **最成熟的业务工作台范式**：Plane（项目管理）与 Twenty（结构化 CRM）。前者强在多视图与侧栏层级，后者强在 metadata-driven UI 和数据密度。
- **最成熟的原生跨端范式**：AppFlowy。Flutter + Rust、明确断点与独立移动交互值得研究，但不适合需要纯 Web DOM 生态的团队直接照搬。
- **最成熟的外部任务流**：Cal.com。Booker 与后台分离、品牌注入和 embed/platform 能力很有复用价值。
- **最克制、可读性最强的知识库壳**：Outline。其全局无障碍基础也最清晰，但许可限制最需要在立项前确认。
- **最具差异化的编辑架构**：AFFiNE。Page/Edgeless 共用 block model 是长期能力，不是表层 UI；同时也是工程和无障碍成本最高的路线。
- 若要从六者提炼一套新产品基线，建议采用：**Twenty/Plane 的可缩放工作台壳 + Outline 的内容克制与无障碍基础 + Cal 的外部流程分离 + AppFlowy/AFFiNE 的跨端与 local-first 思路**，视觉 token 则采用 Propel/AppFlowy UI 的 primitive→semantic 分层，而不是复制任一产品的具体品牌色。
