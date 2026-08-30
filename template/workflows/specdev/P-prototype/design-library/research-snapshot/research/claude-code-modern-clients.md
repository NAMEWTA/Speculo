# Claude Code 现代开源客户端 UI 专项研究

> 采集日期：2026-08-30（Asia/Shanghai）  
> 研究对象：围绕 Claude Code CLI / Agent SDK 构建的开源桌面端、Web 端和移动端客户端。  
> 重点：应用壳、工作区布局、颜色、字体、圆角、交互、跨端策略与工程架构。

## 1. 范围与术语

本报告研究的是“Claude Code 的开源图形界面与远程客户端”，不是 Claude 聊天机器人套壳，也不是仅包含 `CLAUDE.md`、插件或提示词的仓库。

纳入项目至少满足一项：

- 直接启动、恢复或管理 Claude Code CLI / Agent SDK 会话；
- 能在桌面、浏览器或手机上查看 Claude Code 的工具调用、权限请求和 diff；
- 将 Claude Code 纳入多 Agent 工作区，并保留项目目录、终端和 Git 上下文。

需要区分三类架构：

1. **本地 GUI**：桌面应用直接启动本机 Claude Code，数据主要留在本机。
2. **自托管 Web UI**：本机/服务器运行后端，浏览器访问，必须自行处理认证、TLS 和网络暴露。
3. **远程控制客户端**：电脑端 wrapper/daemon 与手机/Web 配对，通过加密通道同步会话和权限请求。

官方 Claude Code Desktop 不是开源项目，因此只作为交互基线：并行会话、Git 隔离、可拖拽窗格、终端/编辑器、diff review、app preview 和手机 Dispatch。来源：[Anthropic Desktop 文档](https://code.claude.com/docs/en/desktop)。

## 2. 搜索到的核心项目列表

星标为采集日快照，不代表设计质量、安全性或商业可用性。

| 项目 | 星标 | 主要端 | Claude Code 关系 | 主要技术 | 许可证 | 研究定位 |
|---|---:|---|---|---|---|---|
| [CloudCLI / Claude Code UI](https://github.com/siteboon/claudecodeui) | 13,505 | Web、PWA、Electron | 直接接 Agent SDK/CLI | React 18、Vite、Express、SQLite、Tailwind 3、CodeMirror、xterm | AGPL-3.0 | 响应式 Web 与自托管样本 |
| [Happy](https://github.com/slopus/happy) | 23,551 | iOS、Android、Web、macOS | wrapper + 远程控制 | Expo、React Native 0.83、React 19、Unistyles、Zustand、Tauri | MIT | 移动优先、跨设备接力样本 |
| [Paseo](https://github.com/getpaseo/paseo) | 15,495 | iOS、Android、Web、Electron、CLI | 多 Agent daemon，支持 Claude Code | Expo/React Native Web、Electron、Zustand、xterm、CodeMirror | Apache-2.0 | 最完整的真正多端工作台样本 |
| [Opcode](https://github.com/winfunc/opcode) | 22,384 | Windows、macOS、Linux | 本机 Claude Code 控制台 | Tauri 2、React 18、Rust、Tailwind 4、Zustand | AGPL-3.0 | 高密度本地桌面控制台 |
| [CodePilot](https://github.com/op7418/CodePilot) | 6,437 | Windows、macOS、Linux、浏览器模式 | 可导入/调用 Claude Code，也支持其他 provider | Electron、Next.js 16、React 19、Tailwind 4、Radix | BSL-1.1，2029-03-16 转 Apache-2.0 | 视觉主题与桌面平台适配样本 |
| [cdesktop](https://github.com/cdesktop-ai/cdesktop) | 108 | 响应式 Web；Tauri 尚未发布 | 将多个 CLI 作为本地子进程 | Rust、React 18、Vite、Tailwind 3、SQLite | Apache-2.0 | 官方 Code tab 布局的开源复刻 |
| [TOKENICODE](https://github.com/yiliqi78/TOKENICODE) | 438 | Windows、macOS、Linux | Claude Code 桌面会话与文件工作区 | Tauri 2、React 19、Tailwind 4、CodeMirror、Tiptap、Zustand | Apache-2.0 | 现代主题、多编辑器组合样本 |
| [OpenClaudgents](https://github.com/MagnusPladsen/OpenClaudgents) | 1 | 桌面 | 多会话与 Agent team 可视化 | Tauri 2、React、TypeScript | MIT | 新兴概念样本，不作为成熟度基准 |

### 补充说明

- Opcode 的历史 README 和 clone 命令仍出现 `getAsterisk/opcode`，当前公开仓库为 `winfunc/opcode`；Claudia 是该产品/代码线曾使用的名称。不要把 Opcode 与多个 Claudia fork 重复计数。
- CodePilot 源码可见，但 BSL-1.1 对商业用途有限制，不能因为“GitHub 可见”就直接归类为宽松开源。
- cdesktop 的 README 明确说明当前是浏览器运行，Tauri 已接线但未发布安装包；报告按“Web-first”评价。
- OpenClaudgents 星标和使用量很低，只用于观察 Agent team 界面方向，不应作为生产选型依据。

## 3. 总体布局结论

### 3.1 桌面端：三栏/四区工作台成为主流

最稳定的桌面结构是：

```text
┌──────────────┬──────────────────────────┬────────────────────┐
│ 项目/会话     │ 对话时间线 + Composer     │ Plan / Files / Diff │
│ 224-280 px   │ min 520-720 px           │ 300-420 px         │
│              ├──────────────────────────┤                    │
│ 状态/筛选     │ Terminal / Tool output    │ Preview / Inspector │
└──────────────┴──────────────────────────┴────────────────────┘
```

关键不是“三栏看起来专业”，而是三种任务并行存在：选择会话、推进对话、验证变更。桌面端项目普遍支持折叠/拖动右栏、分屏会话或底部终端，否则 AI 生成代码后仍要频繁跳回 IDE。

### 3.2 Web 端：保留桌面信息密度，窄屏改为任务切换

CloudCLI 和 cdesktop 在宽屏维持侧栏 + 主区 + 工具区；移动宽度不是把三栏压窄，而是：

- 会话侧栏变成 drawer；
- 主导航变成约 52px 的底部浮动栏；
- diff、文件和权限详情变成 full-screen view 或 bottom sheet；
- composer 固定在安全区上方；
- hover-only 操作改成显式菜单。

CloudCLI 源码把移动导航高度定义为 `52px`，再叠加 `20px` 间距与 `safe-area-inset-bottom`，这是可直接复用的实现思路。

### 3.3 移动端：核心任务不是写代码，而是监督与决策

Happy 与 Paseo 的手机端优先级是：

1. 查看 Agent 是否运行、等待输入或失败；
2. 批准/拒绝权限；
3. 阅读摘要与 diff；
4. 发送短 follow-up、语音或附件；
5. 在桌面与手机之间接管会话。

手机上完整复刻 IDE 会造成密度、键盘遮挡和手势冲突。优秀实现会把终端/文件浏览保留为二级能力，把状态、通知和批准放在首层。

## 4. 逐项目 UI 与工程拆解

### 4.1 CloudCLI / Claude Code UI

### 产品与架构

- 前端为 React 18 + Vite，后端为 Express，使用 `better-sqlite3` 保存本地状态。
- 集成 Claude Agent SDK、Codex SDK、CodeMirror、xterm、Git 与文件系统能力。
- 同一 Web 应用可作为浏览器/PWA 使用，并提供 Electron 打包脚本。
- 源码基线：[package.json](https://github.com/siteboon/claudecodeui/blob/677b7ba43695d5624d1a981c62f87fa086187991/package.json)、[index.css](https://github.com/siteboon/claudecodeui/blob/677b7ba43695d5624d1a981c62f87fa086187991/src/index.css)。

### 布局

- 桌面：项目/会话导航 + 对话主区 + Git、文件、终端和设置类工具视图。
- 小屏侧栏宽度为 `85vw`，上限 `max-w-sm`；`sm` 以上固定到 `w-80`。
- app shell 使用固定视口并禁止 document 滚动，各面板独立滚动，避免手机下拉刷新误触。
- PWA 明确处理四向 safe area；主导航高度与底部安全区由 token 统一计算。

### 颜色与主题

| Token | 浅色 | 深色 |
|---|---|---|
| Background | `hsl(44 22% 96%)`，带暖灰 | `hsl(0 0% 8%)` |
| Card | 白色 | `12%` 亮度中性灰 |
| Secondary/Muted | 暖灰 `44 15% 91%` | `17%` 中性灰 |
| Border | 暖灰 `44 14% 87%` | `17%` 中性灰 |
| Primary | 蓝 `221.2 83.2% 53.3%` | 蓝 `217.2 91.2% 59.8%` |

深色模式不是“所有东西都发蓝”，而是以 8%/12%/17%/23% 的中性表面分层，只把 focus、选中和主要操作交给蓝色。

### 字体、圆角与动效

- UI 字体：Encode Sans；系统字体作为 fallback；正文常用 Tailwind `text-sm` 14px，辅助信息 `text-xs` 12px。
- 基础圆角 `0.5rem`（8px），派生为 8/6/4px；弹窗、认证页等较独立表面可到 12/16px。
- 交互默认 `150ms cubic-bezier(0.4,0,0.2,1)`；主题颜色切换 `200ms`；active 可缩短到 `50ms`。
- 移动 bottom sheet 使用 `220ms cubic-bezier(0.22,1,0.36,1)`，比普通 hover 更有“进入空间”的感觉。
- 明确支持 `prefers-reduced-motion`。

### 可借鉴与风险

- **可借鉴**：Web/PWA 安全区、drawer、底部导航、CodeMirror/xterm 的统一主题。
- **风险**：自托管到公网时，认证、TLS、反向代理和命令执行边界由部署者负责；不能把开发服务器直接暴露。

### 4.2 Happy

### 产品与架构

- `happy` wrapper 在电脑上启动 Claude Code/Codex；手机或 Web 端接管会话。
- Expo + React Native 形成 iOS/Android/Web 共享 UI，macOS 另有 Tauri 构建路径。
- 支持端到端加密、push notification 和桌面/手机瞬时接力。
- 源码基线：[仓库](https://github.com/slopus/happy/tree/b824cd0a4681d41af631a8e422a813873e4455b0)、[主题色](https://github.com/slopus/happy/blob/b824cd0a4681d41af631a8e422a813873e4455b0/packages/happy-app/sources/theme.light.json)。

### 布局与交互

- 首页以 active sessions 分组，先呈现“谁在运行、谁需要我”，不是先呈现文件树。
- session 页把时间线作为主区，composer 固定在底部；权限、问题与工具结果进入同一事件流。
- 手机使用原生 navigation、sheet 和 keyboard controller，Web 端则减少圆角、增加横向空间利用率。
- 代码与命令使用 Menlo/monospace；diff 使用 11-13px 的紧凑信息层级。

### 颜色

Happy 的默认色板接近 Material 3 tonal palette：

| Token | 浅色 | 深色 |
|---|---|---|
| Primary | `#5e52a7` | `#c8bfff` |
| Primary container | `#e5deff` | `#463a8d` |
| Background | `#fffbff` | `#1c1b1f` |
| Surface variant | `#e5e0ec` | `#48454f` |
| Outline | `#78767f` | `#928f99` |
| Error | `#ba1a1a` | `#ffb4ab` |

它使用紫色作为身份色，但主要工作区仍由中性/轻微染色表面承担。容器色用于低强度选中，实色 primary 用于高优先动作。

### 字体与圆角

- 正文常用 14-16px，标题 17-24px，极弱元数据 11-13px。
- Web 卡片/输入常用 8-14px 圆角；原生端同一组件常提高到 16-24px。
- 例如 session/composer 代码中存在 Web `10/14px`、原生 `18px` 的平台分支；圆形动作按钮使用高度一半或 `999`。
- 这说明跨端 token 不应只有一套 `radius-md`，至少需要 `compact desktop` 与 `touch/native` 两个密度 profile。

### 可借鉴与风险

- **可借鉴**：push + 权限审批 + 设备接力是移动 Claude Code 客户端最明确的价值闭环。
- **风险**：远程代理体系比本地 GUI 多出配对、密钥恢复、离线重放和多设备冲突等安全/状态复杂度。

### 4.3 Paseo

### 产品与架构

- 单一 Expo/React Native Web 应用覆盖 iOS、Android 和 Web，Electron 包装同一界面；后台 daemon 统一 Claude Code、Codex、Copilot、OpenCode 与 Pi。
- 支持跨设备、远程主机、并行 Agent、worktree、terminal、file explorer、diff、语音和 notification。
- 使用 React Native Unistyles 作为动态主题层，CodeMirror/xterm 处理编辑器和终端。
- 源码基线：[主题系统](https://github.com/getpaseo/paseo/blob/5e561f8a2346dff86833cc4d7b27ea0c7f38d314/packages/app/src/styles/theme.ts)、[应用依赖](https://github.com/getpaseo/paseo/blob/5e561f8a2346dff86833cc4d7b27ea0c7f38d314/packages/app/package.json)。

### 布局

- 桌面采用 workspace-first：左侧 workspace/agent 列表，中间会话/编辑器，右侧或标签内显示文件、diff、terminal。
- workspace tabs、file tabs 和可排序 tab groups 让多个 Agent 与多个验证视图并行存在。
- 移动端把 explorer、settings、permission、model selector 变成 sheet/stack route；composer 会随软键盘整体上移。
- 同一信息架构通过 adaptive modal/sheet、safe area、hardware keyboard 和 gesture handler 做平台分支。

### 精确 token

| 类型 | 值 |
|---|---|
| 间距 | 2/4/6/8/12/16/24/32/48/64/80/96/128 |
| UI 字号 | 12/14/16/18/20/22/26px |
| 正文 | 15px |
| Code/diff | 12px，diff line-height 22px |
| 图标 | 12/14/16/20px |
| 圆角 | 0/2/4/6/8/12/16/full |
| 字重 | 400/500/600/700 |

默认浅色表面为白 `#ffffff`、`#fafafa`、`#f4f4f5`、`#e4e4e7`、`#d4d4d8` 的 Zinc 阶梯；正文 `#1a1a1e`，muted `#71717a`，品牌 accent 为低饱和深绿 `#20744A`。

状态色专门按密度和小尺寸可辨识度设计：普通状态色较克制，6px 状态点使用更高 chroma；diff 的增删色又独立一组。这个分层比“全局 success-green 一把梭”更适合 Agent 监控界面。

### 可借鉴与风险

- **可借鉴**：这是本次最适合学习“真正多端，而非响应式网页”的项目；主题、终端、键盘、sheet 都有平台级处理。
- **风险**：架构完整也意味着实现成本最高。若你的产品只需桌面本地运行，不应照搬 daemon、relay、配对和 React Native 全套。

### 4.4 Opcode

### 产品与架构

- Tauri 2 + Rust 负责本地系统能力，React 18 + Tailwind 4 负责 UI。
- 功能覆盖项目/会话、custom agents、用量分析、MCP、timeline/checkpoints 和 `CLAUDE.md`。
- 默认本地数据与进程隔离，不依赖远程服务。
- 源码基线：[styles.css](https://github.com/winfunc/opcode/blob/70c16d8a4910db48cd9684aeacdd431caefd7d71/src/styles.css)。

### 视觉系统

- 默认深色：background `oklch(0.10 0.01 240)`，card `0.14`，secondary `0.18`，border/input `0.20`。
- 前景接近白 `0.95`，muted foreground `0.65`；primary 也是近白，整体近乎无品牌色。
- 提供 light、gray、white 与 custom theme；状态绿和 destructive red 保留语义彩色。
- Inter 可变字体；monospace 为系统等宽栈。
- 字号完整定义为 12/14/16/18/20/24/30/36/48px，但业务工作区主要使用 12-16px。
- 圆角 4/6/8/12/16px；窗口本身使用 12px 圆角并裁切 fixed/backdrop 内容。

### 交互风格

- 通过低亮度差和 1px border 划分层级，阴影不是主结构。
- 普通 transition 约 200-300ms，流式/旋转状态有持续动画。
- 项目浏览、session resume、usage dashboard 和 MCP manager 更像“管理控制台”，而不是单一聊天页。

### 可借鉴与风险

- **可借鉴**：低彩度、紧凑、多模块桌面工具壳；Tauri 适合本地文件与 CLI 管理。
- **风险**：主分支最近推送时间为 2025-10-16，报告采集时活跃度明显落后于 Happy/Paseo/CloudCLI；采用前要检查 issue 与 release 状态。

### 4.5 CodePilot

### 产品与架构

- Electron + Next.js 16 + React 19；浏览器开发模式与桌面模式共享渲染层。
- 支持多 provider、MCP、skills、双会话分屏、用量图表、媒体与远程 bridge。
- 主题系统把 light/dark 与 12 个 theme family 分成两层，代码高亮分别映射 Prism、HLJS 和 Shiki。
- 源码基线：[globals.css](https://github.com/op7418/CodePilot/blob/aeb1e446fd2bc304a03f6b10baab6c669edc83d6/src/app/globals.css)、[主题说明](https://github.com/op7418/CodePilot/blob/aeb1e446fd2bc304a03f6b10baab6c669edc83d6/docs/handover/theme-system.md)。

### 视觉系统

- 默认浅色采用近白和暖中性 OKLCH；primary 为 `#252525` 近似炭黑，不再使用默认蓝。
- 深色 background `oklch(0.147 0.004 49.25)`、card/sidebar `0.216`、secondary `0.268`，呈温和的深灰而不是冷蓝黑。
- 基础圆角从 12px 提升到 `1rem`（16px），派生为 12/14/16/20/24/28/32px，整体明显比 Opcode/cdesktop 更柔和。
- composer 使用两层 diffuse shadow；终端保持独立深色 token，不受浅色页面干扰。
- macOS profile 使用系统/SF Pro 字体、透明 window、28px blur + 1.5 saturation、8px 外部 inset 和交通灯安全区；Windows 单独保留 44px window-controls overlay 安全带。

### 设计判断

CodePilot 是“现代消费级桌面工具”方向：大圆角、柔和阴影、平台材质和主题家族。它适合个人 AI 助手，但若做高密度数据库/日志工具，16px 全局基准会浪费空间，应收敛到 6-10px。

### 4.6 cdesktop

### 产品与架构

- 本地 Rust 后端把 Claude Code/Codex/Gemini/OpenCode/Hermes CLI 作为子进程；React Web UI 管理会话、worktree、diff 和 preview。
- README 明确布局仿照官方 Code tab：sessions sidebar + transcript/terminal/diff + 右侧 plan/files/app preview。
- 支持最多四个 session cell 的分屏和拖拽。
- 源码基线：[主题 CSS](https://github.com/cdesktop-ai/cdesktop/blob/75bd015e88f9797d785c9fabcfca03c7151fd5cc/packages/web-core/src/app/styles/new/index.css)。

### 视觉系统

- 浅色 background 95%、主内容白色；深色 background 4%、secondary 12%、muted 16%、border 20%。
- 品牌色为橙 `hsl(25 82% 54%)`，只用于关键强调；用户消息另用低强度蓝。
- 全局圆角仅 `0.125rem`（2px），是本次最方正、最 IDE 化的项目。
- UI 使用 IBM Plex Sans；diff 使用系统等宽字体、12px，部分 header 11px。
- 可以读取 VS Code CSS variables 覆盖 background/button/input/focus/status，便于嵌入编辑器环境时保持一致。

### 可借鉴与风险

- **可借鉴**：开发工具不必追随“大圆角卡片”潮流；2px 圆角、橙色小面积强调和多窗格更接近专业 IDE。
- **风险**：采集时仅 108 stars，且桌面安装包仍在 roadmap；布局思路可参考，成熟度需单独验证。

### 4.7 TOKENICODE

### 产品与架构

- Tauri 2 + React 19 + Tailwind 4，本地文件/进程由 Rust 插件连接。
- 同时使用 CodeMirror（代码）和 Tiptap（富文本/提示编辑），Zustand 管理前端状态。
- 默认 black 主题之外提供 blue/purple/green 主题变体。
- 源码基线：[App.css](https://github.com/yiliqi78/TOKENICODE/blob/7a0f195bd53ac25b9007209efb3af9f1e48a7722/src/App.css)。

### 视觉系统

- 浅色：主背景 `#F8F8FA`、sidebar `#F5F5F7`、chat 白、border `#E5E5EA`、正文 `#1A1A1A`。
- 深色：主背景 `#141414`、chat `#0A0A0A`、sidebar/input `#1C1C1E`、border `#38383A`、正文 `#F0F0F0`。
- 默认 accent 为 `#333333/#D0D0D0`，即黑白反转；蓝 `#4E80F7`、紫 `#9169BF`、绿 `#57A64B` 作为可选身份色。
- syntax colors 与语义色解耦；切换 accent 时会避开同色代码 token，避免蓝主题下 function 也变蓝。
- 系统/SF Pro/PingFang SC/Segoe UI 字体栈，对中文和桌面原生感更友好。
- 禁用全局文本选择，只在输入框和消息内容恢复选择，模拟 native app；同时尊重 reduced motion。

### 可借鉴与风险

- **可借鉴**：主题变体只替换 accent 与相关 token，不重做全部表面；中文字体 fallback 很实用。
- **风险**：全局 `user-select: none` 必须精确白名单，否则日志、路径、错误信息会难以复制。

### 4.8 OpenClaudgents

它展示多 session chat、Agent team visualization、slash commands 和多主题，是“Agent 协作可视化”方向的补充。但采集时只有 1 star，不能把其细节当作经过真实用户验证的规范。更合理的用途是：提取 team topology、running/blocked/done 状态如何呈现，再用 Paseo/CloudCLI 的成熟交互重新实现。

## 5. 跨项目视觉对照

### 5.1 圆角不是越大越现代

| 产品气质 | 代表项目 | 建议主圆角 |
|---|---|---:|
| IDE / 高密度工程工具 | cdesktop | 2-4px |
| 桌面控制台 | Opcode、Paseo | 4-8px |
| 响应式 Web 工具 | CloudCLI | 6-8px |
| 移动/触屏优先 | Happy | 16-24px |
| 消费级个人 AI 桌面 | CodePilot | 12-20px |

圆角应由输入设备、密度和层级决定。一个产品可以同时存在 4px 的 diff row、8px 的表单控件、12px 的 dialog、20px 的移动 composer；不应把同一个 16px 强制应用到表格、侧栏行和代码块。

### 5.2 配色共同点

- 主工作面始终以低 chroma 中性色构成 3-5 级表面。
- 品牌色集中在 focus、selection、primary action、running state，不铺满背景。
- success/warning/error 与 Git diff 颜色应分组，不能所有绿色共用一个 token。
- 代码高亮和产品主题需要独立映射，否则主题色会与 syntax role 冲突。
- 深色表面常见亮度阶梯约为 4-10% / 12-16% / 17-23%，用边框和细微明度差分区。

### 5.3 字体共同点

- 桌面侧栏/元数据：12-14px；主要正文 14-16px；小标题 16-20px。
- 移动正文更稳定地落在 15-17px，辅助信息 11-13px。
- diff/terminal 通常 12-14px monospace，line-height 1.45-1.8 或固定 20-22px。
- UI 字体优先 system/Inter/Encode Sans/IBM Plex Sans；中文必须加入 PingFang SC、Microsoft YaHei 等实际 fallback。
- 不建议用 12px 承载权限解释、错误修复步骤或长段 Agent 输出。

### 5.4 动效共同点

- hover/focus：100-150ms；颜色和浮层：150-220ms；复杂 panel：200-300ms。
- 流式生成使用 cursor、pulse 或三点 indicator，但不让整个消息反复闪烁。
- active feedback 可以轻微缩放到 0.98-0.99；桌面密集列表通常只做颜色变化。
- 所有持续动画都应响应 reduced motion。

## 6. 推荐的 Claude Code 软件 UI 基线

### 6.1 桌面默认 token

```text
ui font             system-ui / Inter / PingFang SC
body                14px / 1.5
content             15px / 1.6
metadata            12px / 1.4
code/diff            12-13px / 20-22px
sidebar              248px, resizable 220-340px
right panel          340px, resizable 280-520px
top/tab bar          40-44px
compact control      28-32px
default control      34-36px
radius               4 / 6 / 8 / 12px
border               1px low-contrast
transition           120 / 180 / 240ms
```

### 6.2 移动 profile

```text
body                 15-16px
metadata             12-13px
touch target         >= 44px
composer radius      16-22px
sheet radius         18-24px top corners
bottom navigation    48-56px + safe area
side panels          full-screen route or sheet
```

### 6.3 推荐布局顺序

1. 会话列表明确显示 running / needs-input / failed / done，而不只显示时间。
2. 对话时间线把 tool call、permission、question、diff summary 作为一等事件。
3. composer 同时容纳 mode、model、attachment、context usage，但次要项折叠。
4. diff/terminal/preview 使用右栏或可拆分 pane；记住用户上次宽度。
5. 移动端首屏只保留监督、批准和 follow-up，不默认打开文件树。
6. destructive approval 显示命令、路径、影响范围和 allow-once/deny；不要只有“确认”。

## 7. 你的后续软件最值得采用的组合

如果目标是“现代、个人使用、桌面为主、以后扩到手机”，建议组合而不是照搬单个项目：

- **信息架构**：cdesktop/Paseo 的 workspace + session + review 三层结构；
- **桌面密度**：Paseo 的 12/14/15px 字号与 4/6/8px 圆角；
- **视觉气质**：CodePilot/TOKENICODE 的温和中性表面，但把全局 16px 圆角收敛；
- **移动任务**：Happy 的 push、权限审批和设备接力；
- **Web 响应式**：CloudCLI 的 drawer、52px bottom nav 与 safe-area token；
- **本地架构**：轻量需求采用 Tauri，Web/插件生态与复杂后台需求采用 Electron；
- **安全模型**：默认 loopback、本地凭据、明确配对，公网访问必须有 TLS 与强认证。

最终不应做成“一个更漂亮的聊天框”。Claude Code 图形客户端的核心设计对象是：**会话状态、工具执行、权限边界、代码变更和跨设备控制**。UI 是否现代，取决于这些对象是否被清晰组织，而不只取决于圆角和配色。

## 8. 证据与局限

- 星标、活跃度与主仓库信息通过 GitHub API 于 2026-08-30 获取。
- 精确 token 来自采集日浅克隆的源码；关键链接固定到所检查的 commit。
- README 功能声明不等于实测稳定性；本报告没有为所有项目安装 release 并完成端到端安全测试。
- 许可证仅作工程研究提示，不构成法律意见；商业使用前必须复核仓库当前 LICENSE 和依赖许可证。
