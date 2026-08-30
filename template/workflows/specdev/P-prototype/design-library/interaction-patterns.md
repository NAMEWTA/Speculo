# 交互模式

原型要呈现完整状态和可恢复行为，而不只展示静态 happy path。以下模式按工具型产品的高频任务组织。

## 导航与状态保持

- shell 在路由切换时保持挂载，侧栏滚动、展开组、面板宽度、筛选和编辑上下文不意外丢失。
- 选中态同时使用背景、文字/图标对比和位置线索；breadcrumb 只表达层级，不替代明确返回动作。
- 深层对象提供可复制 URL；刷新后尽量恢复选择、筛选和视图。
- 列表-详情必须定义空选择、删除当前对象后的落点、未保存修改处理和窄屏返回路径。

## 搜索、命令与快捷键

命令面板服务跨模块跳转、低频动作和主题/设置切换；当前列表的局部搜索仍放在对象附近。命令项包含分组、最近使用、键盘导航、不可用原因和快捷键提示。不要把所有能力藏进 `Cmd/Ctrl+K`。

## 数据表格与网格

按原型问题逐项决定并呈现：

- 列显示/隐藏、排序、筛选、调整宽度和固定列；
- 行选择与批量动作，批量工具条只在有选择时出现；
- 虚拟滚动和键盘导航，编辑态不因滚动丢失；
- 空值、布尔、长文本、代码、日期、时区和大数字格式；
- loading、无数据、无结果、局部错误和无权限分别建模；
- 危险写操作展示预览、影响范围、只读或事务提示。

## 表单与保存

- 创建流程有明确主要动作和取消路径；提交后错误与字段程序化关联并可快速定位。
- 设置页选择“显式保存”或“可靠自动保存 + 可见状态”，不混用而不说明。
- 长表单按领域分组，标签位置一致；帮助文字解释决策，不重复标签。
- 危险设置独立成区；只有高损失、不可逆操作才要求输入对象名确认。

## 异步反馈

| 时长 | 反馈 |
|---|---|
| 约 100ms 内 | 通常不显示 loading，避免闪烁 |
| 约 100ms-1s | 按钮局部进度或轻量 skeleton |
| 1s 以上 | 持续进度、取消能力或后台任务入口 |

Toast 只承载非阻塞确认，不承载必须阅读的错误修复步骤。错误说明发生了什么、影响什么、下一步是什么，并保留用户输入。离线、只读和权限不足不是通用 error 的文案变体，应各有可行动状态。

## 危险操作与撤销

能撤销时优先“执行后短时撤销”；真正不可逆或影响范围不明显时才用 confirmation dialog。按钮写具体动作和范围，例如“删除 12 条记录”，不用“确定”。审批流程同时呈现请求对象、能力边界、允许范围、拒绝路径和可见结果。

## 画布、编辑器与可调面板

- 选择、撤销、缩放、平移和快捷键由统一模型管理；上下文工具随选择出现。
- 可调 panel 有最小/最大尺寸、键盘或替代控制、持久化和重置路径。
- 画布型产品为核心对象和操作提供非纯画布的可访问替代路径。
- 代码/diff/terminal/preview 的 tabs 或 panes 保持稳定尺寸，loading、长标签和状态图标不引起布局跳动。

## 完整组件状态

Button、IconButton、Link、Input、Textarea、Select/Combobox、Checkbox、Radio、Switch、Tooltip、Menu、Popover、Dialog、Drawer/Sheet、Tabs、Toast、InlineAlert、Skeleton 和 EmptyState 至少覆盖适用的 `default / hover / pressed / focus / disabled / loading / error / selected`。工具产品再按问题补 AppShell、Sidebar、CommandPalette、DataTable、FilterBar、ResizablePanel、Inspector、Tree、CodeEditor wrapper 和 PermissionGate。

## 样板验证证据

快照的 Playwright 测试验证九个页面在 390x844 下无横向溢出、Lucide 与图片加载、主题和 token drawer 可交互，以及移动审批产生可见结果：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/tests/gallery.spec.js</Path>`。复制样板后，用原型自己的状态和任务补充测试，不把这组检查当作生产验收。
