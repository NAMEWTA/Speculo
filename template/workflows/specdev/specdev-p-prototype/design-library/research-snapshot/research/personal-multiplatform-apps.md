# 多端个人应用 UI 与架构对照研究

> 采集日期：2026-08-30  
> 目的：补充桌面个人应用、Web 应用、移动应用和真正跨端产品，帮助判断“共享代码”与“共享体验”的不同实现路径。

## 1. 项目列表

| 项目 | 星标 | 覆盖端 | 核心技术 | UI 代码共享方式 | 许可证 |
|---|---:|---|---|---|---|
| [Notesnook](https://github.com/streetwriters/notesnook) | 14,482 | Web、Windows、macOS、Linux、iOS、Android | React、React Native、Electron、TypeScript | editor/core/theme 共享，Web/原生视图分层 | GPL-3.0 |
| [Standard Notes](https://github.com/standardnotes/app) | 6,612 | Web、桌面、iOS、Android | React、React Native、Electron、TypeScript | 业务模型共享，桌面/Web 与 mobile 分壳 | AGPL-3.0 |
| [Joplin](https://github.com/laurent22/joplin) | 56,164 | Web 服务、桌面、iOS、Android、CLI | React、Electron、React Native、TypeScript | packages monorepo，共享数据/同步，UI 按端实现 | AGPL-3.0-or-later（目录可有例外） |
| [Logseq](https://github.com/logseq/logseq) | 44,685 | Web、桌面、iOS、Android | ClojureScript、React、Electron、DataScript | 块模型和核心逻辑共享，端能力分层 | AGPL-3.0 |
| [LocalSend](https://github.com/localsend/localsend) | 89,722 | Windows、macOS、Linux、iOS、Android | Flutter、Dart | 单一 Flutter UI 覆盖主要平台 | Apache-2.0 |
| [Immich](https://github.com/immich-app/immich) | 112,970 | Web、iOS、Android、Server | SvelteKit、Flutter、TypeScript、Dart | API/领域一致，Web 与 mobile UI 独立 | AGPL-3.0 |
| [Bitwarden Clients](https://github.com/bitwarden/clients) | 13,703 | Web、Browser、桌面、iOS、Android、CLI | Angular/Nx、Electron；移动端原生 Swift/Kotlin | Web/Browser/Desktop 大量共享；移动端分仓原生 | 默认 GPL-3.0，部分 Bitwarden License |
| [RustDesk](https://github.com/rustdesk/rustdesk) | 122,142 | Windows、macOS、Linux、Web、iOS、Android | Rust、Flutter | Rust 核心 + Flutter 跨端 UI | AGPL-3.0 |
| [Element Web](https://github.com/element-hq/element-web) / Element X | 13,411（Web） | Web、桌面、iOS、Android | React/Electron；SwiftUI、Kotlin/Compose、Matrix Rust SDK | 协议/SDK/token 共享，移动 UI 原生 | AGPL-3.0 |
| [Home Assistant Frontend](https://github.com/home-assistant/frontend) | 5,639 | 响应式 Web、iOS/Android companion | Lit、Web Components；移动原生 shell | Web UI 嵌入 companion，原生能力桥接 | Apache-2.0 |
| [Actual Budget](https://github.com/actualbudget/actual) | 28,455 | Web、Windows、macOS、Linux；移动浏览器 | React、Electron、SQLite/WASM | Web UI 与桌面共享，运行时数据层适配 | MIT |

星标只是热度快照。Immich、RustDesk 等项目规模很大，但它们的交互约束与个人笔记/AI 工作台并不相同，研究时应按任务选择样本。

## 2. 四种跨端架构模型

### 2.1 同一 Web UI + 桌面壳

代表：Actual Budget、部分 Standard Notes、Home Assistant。

```text
React/Lit Web UI
      ├─ Browser/PWA
      └─ Electron/native WebView + local bridge
```

优点是复用率高、迭代快、组件生态成熟。缺点是移动键盘、手势、后台任务、通知和平台导航经常显得不够原生。适合桌面/Web 为主，手机只做轻量查看和输入。

### 2.2 Web 与 React Native 双壳，共享领域层

代表：Notesnook、Standard Notes、Joplin。

共享同步、加密、编辑器模型、API client 和主题语义；桌面/Web 使用 DOM，手机使用 native view。工程成本高于纯响应式，但输入、导航、列表性能和离线能力更可靠。

### 2.3 单一 Flutter/React Native UI 真正跨平台

代表：LocalSend、RustDesk；Paseo/Happy 也属于这一方向。

优点是多个端的组件与行为更一致，适合文件传输、远程桌面、Agent 监督这类对象和流程高度一致的工具。缺点是 Web bundle、桌面原生菜单/文本行为和复杂编辑器生态需要额外适配。

### 2.4 共享协议/SDK，UI 完全原生

代表：Element X、Bitwarden 新移动客户端、Signal 类产品。

这是成本最高但平台质量上限也最高的路径。品牌 token、状态语言和信息架构共享，SwiftUI/Compose/React 各自实现控件。适合安全、通信和长期维护的大型产品，不适合资源有限的早期个人软件。

## 3. 桌面端分别总结

### 3.1 布局

- Notesnook、Standard Notes、Joplin、Logseq 都以“集合/笔记列表/编辑器”三层主从关系为核心。
- Actual Budget 以顶层账户/预算导航 + 数据工作区为主，页面比笔记工具更接近财务应用。
- RustDesk 和 LocalSend 的核心任务少，不需要永久三栏；首屏直接呈现设备/发送目标和主动作。
- 桌面个人应用常保留 220-280px sidebar，并允许隐藏；主阅读/编辑宽度通常比企业表格更克制。

### 3.2 视觉

- 笔记和财务工具常用 14-16px 正文、12-13px 元数据；长文编辑区提高 line-height 到约 1.55-1.75。
- sidebar row 圆角通常 4-8px，编辑器/主内容区不应被包进大卡片。
- 桌面壳的边界主要依靠 1px border 和表面明度差；阴影留给 dialog、popover 和悬浮 composer。
- 文件/同步/离线状态使用小图标、dot 和短文本，不应只靠颜色。

### 3.3 技术选择

- 要快速覆盖桌面 + Web：React + Electron/Tauri 是最低风险路径。
- 本地数据库、文件、CLI 较重而又在意安装体积：Tauri/Rust 更合适。
- 复杂富文本/插件生态优先考虑 Web 技术；Flutter/React Native 需要验证编辑器与拖拽能力。

## 4. Web 端分别总结

### 4.1 布局

- 宽屏 Web 可以与桌面共享应用壳，但必须接受浏览器滚动、刷新、地址栏、快捷键冲突和文件权限差异。
- Actual Budget 是“同一 UI、运行时适配”的典型：浏览器用 Worker/WASM 处理本地数据，桌面通过 Node/Electron 能力处理 SQLite。
- Home Assistant 使用 Web Components 将大量设备卡片组合成 dashboard；价值在可扩展 card contract，而不是卡片视觉本身。
- Immich Web 使用大图网格、时间分组和沉浸式 viewer；其手机端不是直接缩放 Svelte 页面，而是 Flutter 独立实现。

### 4.2 响应式策略

- 低复杂度：sidebar -> drawer，详情 -> full-screen route。
- 中复杂度：保留 tab state，窄屏一次只显示一个 pane。
- 高复杂度编辑器：手机 Web 只支持阅读/轻编辑，明确提示桌面端完成高级任务。
- PWA 必须处理 safe area、离线、安装模式、浏览器返回键和虚拟键盘高度。

### 4.3 视觉与交互

- hover 不能承载唯一操作；行尾菜单在 touch 时必须显式可达。
- 最小触控命中建议 44px，视觉按钮可以更小但透明命中区要足够。
- skeleton 应匹配照片网格、列表行或 dashboard card 的真实结构，避免全页转圈。
- Web 表面可保持 4-8px 圆角；不要因为手机存在就把桌面所有容器改成 20px。

## 5. 移动端分别总结

### 5.1 导航

- 主对象少且并列：bottom tabs，例如照片、搜索、共享、设置。
- 层级深：stack navigation + back；编辑和详情占满屏幕。
- 筛选、选择器、次要表单：bottom sheet；危险确认使用 modal/action sheet。
- 大型 sidebar 不应缩成 80% 屏宽后永久存在，只在临时导航时使用 drawer。

### 5.2 字体、圆角与密度

```text
mobile body           15-17px
secondary             12-14px
screen title          20-28px
touch target          44-48px
input/card radius     12-20px
bottom sheet radius   18-24px
list row height       48-64px
```

照片网格和远程桌面可突破这些值；数据表、代码 diff 和密钥列表可以更紧凑，但仍需保证手势和可读性。

### 5.3 平台能力

- Notesnook/Standard Notes：离线、加密、本地数据库和编辑器输入比像素一致性更重要。
- LocalSend/RustDesk：局域网发现、文件权限、后台传输和系统分享是 UI 流程的一部分。
- Immich：相册权限、后台备份、长列表虚拟化、手势 viewer 决定移动体验。
- Bitwarden/Element：生物识别、通知、系统自动填充/分享、加密密钥生命周期要求原生 integration。

## 6. 值得直接学习的项目细节

### Notesnook

- 学习点：Web/desktop/mobile monorepo 如何共享 editor、core 和 theme，而不是强行共享所有 view。
- UI：安静的笔记层级、列表/编辑器主从、离线与同步状态持续可见。
- 适用：个人知识库、local-first 文档、隐私型软件。

### Joplin

- 学习点：长期演进项目如何让 Electron、React Native、CLI 和 sync server 共存。
- UI：高功能密度、插件与多窗格能力成熟；视觉并非最前沿，适合学工作流而非直接复制外观。

### LocalSend

- 学习点：单一 Flutter 代码库覆盖桌面和移动，核心流程保持一致。
- UI：首屏目标明确，设备卡片、发送队列、进度与错误状态围绕一个任务展开。
- 适用：简单对象、强系统能力、端间流程一致的工具。

### Immich

- 学习点：Web 与 Flutter mobile 独立实现时，如何通过统一 API、领域名词和功能目标维持产品一致。
- UI：照片本身是第一视觉信号；导航和 chrome 克制，不用装饰卡片抢内容注意力。

### Actual Budget

- 学习点：共享 React UI，但让浏览器和桌面使用不同后台数据通道。
- UI：财务数据通过表格、月份/账户层级、持续保存状态组织；色彩主要表达金额和预算状态。

### Element / Bitwarden

- 学习点：共享设计语言不等于共享 UI 代码。协议、token、图标和状态词汇统一，平台控件可以原生实现。
- 适用：安全、通信、系统 integration 很重的长期产品。

## 7. 对后续软件的决策建议

### 桌面优先，手机只监督/查看

选择 React + Tauri/Electron，做完整桌面工作区；手机先做响应式 Web/PWA，采用 drawer + full-screen detail。等核心工作流稳定后再决定是否需要原生 App。

### 桌面和手机同等重要

选择 React Native/Expo 或 Flutter，共享领域层和大部分 UI；对桌面单独设计 window chrome、快捷键、右键菜单、hover、resizable pane 和多窗口。

### 内容编辑是核心

优先 Web editor 生态，移动端共享文档模型而非强行共享渲染组件。富文本、输入法、选区、拖拽和 Markdown shortcut 必须在中文与移动键盘上实测。

### 安全/系统能力是核心

共享 Rust/TypeScript domain SDK，平台 UI 分开实现。不要为了代码复用牺牲 biometric、keychain、notification、background task 和系统分享体验。

## 8. 最终原则

多端设计的目标不是“每个像素完全一样”，而是：对象命名一致、状态含义一致、核心任务连续、各端使用符合输入设备的布局和控件。桌面擅长并行和比较，Web 擅长可达与部署，手机擅长通知、监督、拍摄、语音和即时决策。先为每个端定义任务，再决定共享多少代码。
