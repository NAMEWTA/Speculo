# 示例：采购申请原型的 DESIGN 引用

此例演示如何引用仓库已有源文件，不表示这些样式已被某个用户项目接受。项目使用时替换为实际选定原型及确认依据；这里只记录源码可证明的内容，不声称已经完成本次浏览器验收。

## 来源与版本

以下各节的 UI、CSS、JS 链接均固定到提交 `16704dab5083d25b5f7f3dd3568b0270b49c9531` 的 `enterprise-data.html` 及其资源。页面入口是 [采购申请 UI][ui]，本地可打开同版本页面，或从模板目录启动静态服务。页面中的数据和操作为本地演示，JS 不持久化数据，刷新会恢复初始状态。

## 布局与信息层级

原型依据：[UI][ui] 的 `.enterprise-shell`、`.app-sidebar`、`main#requests`、`#overview` 和 `.data-section`；[CSS][css] 的 `.enterprise-shell`、`.app-sidebar`、`.app-main`、`.grid-3`、`.data-section` 与 `.table-wrap`；JS 不适用：此节描述静态结构。

侧栏导航、主区域顶部信息、概览卡片和申请列表的相对关系按这些节点与布局规则复现。桌面基础规则是 `220px minmax(0,1fr)`；窄屏使用下方引用的媒体查询。不要从“管理后台”这一描述推导另一种导航结构。

## 视觉样式与控件

原型依据：[UI][ui] 的 `body.enterprise`、`.card`、`.data-toolbar` 与 `[data-batch]`；[CSS][css] 的 `:root`、`.card`、`button`、`button:disabled`、`:focus-visible`、`.pill.good` 和 `.pill.wait`；[JS][js] 的 `selection()` 控制批量按钮禁用与文案。

颜色、字体、边框、圆角和间距读取实际 CSS：例如基础 `--accent` 为 `#175e4e`、`--radius` 为 `12px`，而按钮另有 `8px` 圆角。不要把一个 token 当成所有组件共用的值。页面使用系统字体栈，图标为页面中的字符；该页没有自定义字体或图标库资源。

## 筛选、选择与空状态

原型依据：[UI][ui] 的 `[data-search]`、`[data-status-filter]`、`[data-request]`、`[data-select-all]`、`[data-empty]`、`[data-count]`；[CSS][css] 的 `[hidden]`、`.empty-state`、`.table-foot`；[JS][js] 中 `enterprise-data` 分支的 `filter()`、`selection()` 及 `input/change` 事件。

复现场景：输入不存在的关键词，观察列表空状态和数量，再清除关键词。`filter()` 会隐藏不匹配行并取消隐藏行的选择；全选只作用于可见行。部分选择通过 `indeterminate` 表示，没有选择时禁用批量操作。不得把隐藏行仍参与批量操作写成等价实现。

## 详情弹层与焦点

原型依据：[UI][ui] 的 `[data-request-detail]`、`dialog#request-detail`、`[data-close-dialog]` 和 `aria-labelledby`；[CSS][css] 的 `dialog`、`dialog::backdrop`、`.detail-grid`、`:focus-visible`；[JS][js] 的 `[data-open-dialog]` 点击绑定、`dialogTrigger`、`close` 事件和 `[data-request-detail]` 数据填充。

复现场景：打开任一行的 Review，核对标题、申请人、金额和状态；用关闭按钮返回，检查焦点回到触发按钮。这里使用原生 `showModal()` 模态对话框，不是右侧抽屉。Escape、Tab 与焦点约束依赖原生 dialog 行为，须在目标浏览器实际检查，不能仅凭源码引用宣称通过。

## 成功、失败与重试反馈

原型依据：[UI][ui] 的 `[data-batch]`、`[data-failure]`、`[data-feedback]` 和 `[data-state-label]`；[CSS][css] 的 `.notice`、`.notice.error`、`.pill.good`；[JS][js] 的 `[data-batch]` 点击处理、失败分支、`chosen.forEach` 与末尾 `filter()`。

复现场景：选择申请，开启失败模拟并点击批量批准。失败时保留选择并显示错误；关闭模拟后重试，状态变为 approved、选择清除、反馈恢复成功样式，列表按当前筛选重新计算。`role="status"` 与 `aria-live="polite"` 位于反馈节点。该流程是同步内存模拟，没有实际网络等待、超时或服务端权限验证。

## 响应式与减少动态效果

原型依据：[UI][ui] 的 `.enterprise-shell`、`.app-sidebar nav`、表格行与 `.grid-3`；[CSS][css] 的 `@media(max-width:1000px)`、`@media(max-width:760px)`、`@media(prefers-reduced-motion:reduce)` 及其中对应选择器；JS 不适用：这些适配由 CSS 完成。

1000px 及以下侧栏宽度改为 180px；760px 及以下导航转为顶部横排，申请行改为网格，概览仍为三列。减少动态效果时缩短过渡并取消按钮按压位移。检查各断点两侧和 reduced-motion 设置下的实际显示，不将“响应式”泛化为任意移动端布局。

## 边界与待补证据

原型依据：[UI][ui] 的预览说明与 `[data-failure]`；[CSS][css] 的 `:root` 设置 `color-scheme:light`；[JS][js] 的文件说明及同步批量操作。没有据此证明深色主题、真实请求的加载/超时、权限拒绝或持久化恢复；若项目要求这些效果，先补充对应原型状态及版本，再在各节引用，不能标为已确认。

业务鉴权、API 协议和持久化实现不由这个 UI 样例决定，属于此例的“不适用”范围；实际项目应引用其独立规格。示例中的布局、样式和交互引用也不能替代生产页面的实现验证。

[ui]: https://github.com/NAMEWTA/Speculo/blob/16704dab5083d25b5f7f3dd3568b0270b49c9531/template/workflows/specdev/specdev-p-prototype/design-library/templates/enterprise-data.html
[css]: https://github.com/NAMEWTA/Speculo/blob/16704dab5083d25b5f7f3dd3568b0270b49c9531/template/workflows/specdev/specdev-p-prototype/design-library/templates/assets/prototypes.css
[js]: https://github.com/NAMEWTA/Speculo/blob/16704dab5083d25b5f7f3dd3568b0270b49c9531/template/workflows/specdev/specdev-p-prototype/design-library/templates/assets/prototypes.js
