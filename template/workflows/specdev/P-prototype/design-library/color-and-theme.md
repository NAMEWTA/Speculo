# 色彩、主题与视觉层级

视觉系统先定义角色，再选择色值。固定快照中的 `<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/reference/design-tokens.css</Path>` 是跨项目综合起点，不是任何单一产品的 token 复制品。

## 最小语义集合

```text
canvas
surface-1 / surface-2 / surface-3 / overlay
text-primary / text-secondary / text-tertiary / text-disabled
border-subtle / border-default / border-strong
accent / accent-hover / accent-subtle / accent-contrast
success / warning / danger / info (+ subtle variants)
hover / selected / pressed / focus-ring / scrim
```

业务组件消费语义角色，不直接写 `#fff`、`black` 或任意透明度。品牌 accent 只服务主要动作、选中和链接；状态色必须同时配图标、文本或形状。数据可视化色板、Git diff、syntax highlight 和业务状态分别建组，不复用 UI accent 充当所有含义。

## 浅色与深色

- 两种主题一起设计，不把深色简单反相。深色 overlay 往往比基础表面更亮，边框和语义色需要重新分配明度与对比。
- 分别检查正文、次要文字、图标、边框、focus ring 和状态，而不只检查按钮。
- 中性色保持低 chroma，避免所有表面都带强品牌倾向。
- 用户切换主题时保持布局、选择、输入和面板尺寸；主题改变不应触发内容重排。
- 高对比需求不能只靠增加饱和度，应重新检查边界、文字与焦点。

## 字体和密度

| 角色 | 字号/行高起点 |
|---|---|
| 坐标、元数据、辅助标签 | 11-12px / 16px；不承载长文本、错误原因或主要操作 |
| 表格、侧栏、紧凑控件 | 13px / 18-20px |
| 默认 UI 正文与表单 | 14px / 20px |
| 内容正文 | 15-16px / 24-26px |
| 小节/弹窗标题 | 16-18px / 22-26px |
| 页面标题 | 20-24px / 28-32px |

工具界面不使用营销页级大标题。数字表格可启用 tabular numerals，代码/SQL/ID 使用 mono；中英文混排单独验证 CJK 回退和行高。不使用负字距挤压 UI，长名称通过布局、换行或中间截断处理。

| 密度 | 控件高度 | 表格行高 | 典型任务 |
|---|---:|---:|---|
| Compact | 28px | 32px | SQL、日志、开发工具 |
| Default | 32-36px | 36-40px | CRM、项目管理、后台 |
| Comfortable | 40px | 44-48px | 文档、协作、低频表单 |
| Touch | 44-48px | 48-52px | 移动与触屏 |

## 圆角、边框与阴影

- 2-4px：代码块、表格小元素、密集工具按钮。
- 4-6px：输入、按钮、菜单项、紧凑面板。
- 6-8px：普通卡片、popover、较大控件。
- 8-12px：dialog、sheet、移动大容器；移动样板可因触屏语言使用更大值。
- pill：状态徽标、分段选择滑块或真正胶囊语义，不用于所有按钮。

同一视觉层只保留 2-3 个主圆角。常驻页面分区、侧栏、表格和检查器用 1px 边框或背景差建立层级，不用浮卡阴影；popover/menu 使用清晰边框和中等阴影；dialog 使用 scrim 与较大阴影；focus ring 独立于层级阴影。hover、selected、pressed 必须是不同 token。

## 原型验证

- 浅色、深色、200% 缩放和常见色觉差异下，文本与状态仍可区分；
- 页面没有绕过 token 的随机颜色、圆角和阴影；
- 状态不只依赖颜色；
- 最长名称、中文、数字和错误文案不会撑坏控件；
- reduced motion 时 token 中的 UI duration 降为零或对应交互停止非必要动画。

八种具体 `.theme-*` 实现在 `<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/styles/pages.css</Path>`，综合 token 的使用约束在 `<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/reference/USAGE.md</Path>`。
