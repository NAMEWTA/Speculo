# 响应式与平台职责

响应式设计改变任务流，不只是 CSS 宽度。桌面适合并行、比较、快捷键和可调面板；Web 适合易部署与跨设备访问；移动端适合通知、监督、拍摄、语音、审批和即时 follow-up。跨端一致性落在对象、状态和核心流程，不要求像素一致。

## 桌面到窄屏的任务重排

| 桌面结构 | 窄屏替代 |
|---|---|
| 固定侧栏 | off-canvas drawer 或单层导航 |
| 右侧检查器 | bottom sheet 或 full-screen detail |
| 三栏主从 | 列表页 -> 详情页，并提供明确返回路径 |
| 宽表格 | 关键列 + 横向滚动 + 行详情 |
| 常驻工具栏 | 主要动作 + overflow menu |
| hover 工具 | 可点击菜单或显式按钮 |
| 多 pane 代码工作区 | tabs、全屏工具 route 或按任务切换的单 pane |

每个 breakpoint 写出主要任务如何开始、继续、返回和恢复，不以“元素能换行”为完成。移动端触控目标建议至少 44px；桌面紧凑视觉控件可以更小，但命中区可保持更大。

## 平台职责

| 平台 | 优先任务 | 避免 |
|---|---|---|
| 桌面 | 多对象比较、精细编辑、键盘命令、diff/terminal/preview 并行 | 把每个区域做成浮卡，或用大标题浪费工作区 |
| Web/PWA | 跨设备访问、分享 URL、自托管、响应式工作区 | 将桌面三栏直接压窄；依赖 hover 才能完成关键动作 |
| 移动 | 状态摘要、通知、权限审批、阅读 diff 摘要、短 follow-up、拍摄/上传 | 完整复刻 IDE、密集小控件、无返回路径的多栏 |
| 原生壳 | 文件、通知、相机、系统凭据、后台任务等平台能力 | 为像素一致牺牲系统语义和原生可达性 |

## 四种跨端实现模型

1. 同一 Web UI + Electron/Tauri/native WebView，例如 Actual Budget。共享率高，但 Web 语义、shell 能力和窄屏任务流要分别治理。
2. React Web 与 React Native 双壳，共享领域层，例如 Notesnook、Standard Notes、Joplin。共享对象和状态，不强求视图代码一致。
3. Flutter/React Native 单一 UI 覆盖多端，例如 LocalSend、RustDesk。渲染一致，但 Web 语义和平台细节仍需单独验证。
4. 共享协议、SDK 和设计语言，SwiftUI/Compose/React 分别实现，例如 Element X、Bitwarden。平台体验最好，设计系统和行为一致性需要明确合同。

Immich 展示另一种常见取舍：共享 API 与领域词汇，Web 使用 SvelteKit、移动使用 Flutter，让媒体浏览和拍摄/上传分别贴近平台。

## Agent 工作区专项

- 桌面通常收敛为“会话侧栏 + 对话/工具时间线 + Plan/Files/Diff/Preview”，通过可调 pane 或分屏支持验证。
- Web 窄屏将 sidebar 变 drawer，将工具区变 full-screen route 或 bottom sheet，将 composer 固定在 safe area 上方。
- 移动端第一任务是状态、审批、摘要/diff 和 follow-up，不是完整开发环境。
- 会话状态、工具执行、权限边界、代码变更和跨设备控制是核心对象；聊天气泡只是呈现层。

对应样板分别是 responsive Web、mobile supervisor 和 cross-platform workspace，见 `<Path>{roots.workflows}/specdev/P-prototype/design-library/style-index.md</Path>`。

## 可访问与设备检查

- 全部功能可用键盘到达，Tab 顺序与视觉顺序一致，`:focus-visible` 清晰可见；
- dialog/menu/listbox/combobox 使用正确语义和焦点管理；
- 图标按钮有可访问名称，tooltip 不是唯一说明；
- 测试 200% 缩放、reduced motion、屏幕阅读器、长文本、CJK 与 RTL；
- 使用 safe-area inset，移动 composer、审批动作和底部导航不被系统 UI 遮挡；
- 图片有有效替代文本；媒体本身可检查，不用暗化、模糊或装饰性裁切掩盖内容。
