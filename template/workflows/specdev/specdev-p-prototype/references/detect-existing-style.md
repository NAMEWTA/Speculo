# Existing Style Detection

在推荐风格前使用。本协议只记录可发现事实；依赖名称、README 宣传语和单张截图都不能单独证明实际 UI。

## 1. 确定检测面

先定位用户实际要设计的应用、入口、代表性路由和目标平台。多应用仓库按 app 分开记录，不把后台、营销站、桌面壳和移动端混为同一风格。至少选择一个主任务页面，以及存在时的列表、详情、设置、空状态和窄屏页面。

**完成标准**：检测范围、排除范围、核心用户和最高频 3-5 个任务均已写入 `Project Evidence`。

## 2. 技术与组件证据

穷尽读取与目标 app 相关的 manifest、框架配置、样式入口、主题、组件封装、图标、路由和测试：

- Web：React/Vue/Svelte 等框架、SSR/SPA、CSS/Tailwind/SCSS/CSS-in-JS、组件原语和图标库；
- Desktop：Electron/Tauri/Flutter/原生壳、窗口 chrome、菜单、快捷键、文件和终端能力；
- Mobile：React Native/Expo/Flutter/原生导航、safe area、keyboard controller、sheet 与手势；
- 设计系统：raw/semantic/component/business token 层级、浅深主题和密度机制。

记录项目相对路径与具体 symbol/token；不存在时写 `not-found`，不得用常见默认值补齐事实。

**完成标准**：每项技术断言可回到 manifest、配置或源码，第三方默认值与项目覆写已区分。

## 3. 视觉与布局盘点

统计或抽样确认重复出现的颜色、字号、行高、字重、间距、控件高度、图标尺寸、圆角、边框、阴影、动画时长和 breakpoint。识别 shell 属于全局侧栏、双层导航、列表-详情、编辑器/画布、仪表盘网格或内容中心，也允许明确的组合。

按 `一致且可复用 / 存在但分裂 / 缺失 / 无法确认` 分类，不因某个页面用了 16px 圆角就把整个产品称为柔和风格。

**完成标准**：`Project Evidence` 含可核查的 token 表、布局尺寸和置信度，异常值与主流值分开。

## 4. 交互与状态盘点

检查导航恢复、URL 状态、hover、pressed、focus-visible、selected、disabled、loading、empty、no-result、error、offline、read-only、permission-denied、危险操作和撤销。检查键盘、触屏、200% 缩放、长中文、reduced motion 与深浅主题。

可以运行现有应用时，使用真实页面和极端数据观察；不能运行时明确记录 `source-only`，不虚构浏览器观察。

**完成标准**：主要任务的鼠标、键盘和触屏路径均有结论，缺失状态成为后续设计要求。

## 5. 输出检测摘要

形成以下四栏：

| 分类 | 含义 |
|---|---|
| 保留 | 已一致、符合任务且有证据的设计 |
| 调整 | 方向正确但 token、状态或跨端行为不完整 |
| 替换 | 与核心任务、输入设备或可访问性冲突 |
| 补齐 | 当前不存在但完成任务必须具备 |

最后写出 `detected_style`、密度、色调、主布局、平台和置信度；无法归入单一风格时使用 `hybrid` 并列出组成，不强行贴标签。

**完成标准**：候选推荐可以逐条引用本摘要，所有推断均明确标记。
