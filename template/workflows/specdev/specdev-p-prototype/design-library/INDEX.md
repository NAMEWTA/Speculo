# 设计资料入口

这是一组按需使用的设计方法、来源材料与可运行样例。先理解项目任务和现有设计，再选有关参考；无需把整个资料库载入上下文。

| 当前问题 | 打开什么 |
| --- | --- |
| 页面结构、对象和信息密度怎么选 | [布局与信息基础](foundations.md) |
| 多个参考怎样组合成一致方案 | [组合方法](composition.md) |
| 色彩、层级、字体与主题 | [色彩与主题](color-and-theme.md) |
| 导航、表格、编辑、反馈等交互 | [交互模式](interaction-patterns.md) |
| 桌面、移动、Web 与跨端任务差异 | [响应式与平台](responsive-and-platforms.md) |
| 需要比较视觉方向 | [视觉参考](style-index.md) |
| 需要按任务选可运行样例 | [产品模式与 12 个样例](product-pattern-index.md)、[本地画廊](gallery.html) |
| 需要查研究依据、原始来源或许可 | [来源与使用边界](research-provenance.md) |
| 把已选原型写入 DESIGN 并交给实施 | [逐节引用原型证据](../references/design-evidence.md)、[真实源码引用示例](../references/design-evidence-example.md) |

## 使用方式

优先复用项目已有被认可的导航、组件和 tokens。没有基线时，用主要用户任务选布局，再选密度、视觉语言、交互和平台适配；不要把一个品牌的营销页当作复杂工作台的完整规范。

HTML 样例可直接打开，也可在本目录运行 `python -m http.server 8765` 后访问本地 `gallery.html`。它们使用本地资源，数据与操作为示意；打开页面观察真实行为，不能仅由文件存在推断可用。

设计结果维护在项目已有长期位置或项目根 `.agents/speculo/.speculo/knowledge/design/`。按需复制实际代码与素材，保留来源许可；无需复制这整座资料库进每次交付，也不要求写另一份同义 DESIGN 文档。

需要设计说明时，各部分直接引用本次已确认原型的 UI、CSS、JS 位置及固定版本，说明意图和边界。资料库样例提供候选，不自动成为项目已确认设计；采用后保留实际来源，不能只凭文字描述重新生成另一种效果。
