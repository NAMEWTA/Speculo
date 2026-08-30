# 八种可运行 UI 风格

八个页面都是独立静态 HTML，使用 `<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/styles/</Path>` 的共享样式、`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/scripts/gallery.js</Path>` 和本地 Lucide。先按任务与平台选风格，不按颜色选；页面是原型起点，不是生产组件库。

| ID | 风格与入口 | 适用任务 | 主要研究参考 | 样板中的结构与视觉签名 |
|---|---|---|---|---|
| 01 | 高密度 IDE：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/01-dense-ide.html</Path>` | IDE、数据库、API、日志工具 | cdesktop、DBeaver、DBX | 工具轨 + 230px explorer + tabs/editor + review panel + status bar；橙色小面积 accent，2/3/4px 圆角，12px 级代码密度 |
| 02 | 单色桌面控制台：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/02-monochrome-console.html</Path>` | Agent 管理台、本地开发控制台 | Opcode | 252px 侧栏 + 控制台/分析内容；近黑多层表面、浅中性 accent，4/8/12px 圆角，状态与图表依赖层级而非品牌铺色 |
| 03 | 柔和个人 AI 桌面：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/03-soft-personal-ai.html</Path>` | 个人 AI 助手、消费级桌面工具 | CodePilot、TOKENICODE | 264px 会话/项目栏 + 对话 + 360px 上下文；暖中性、克制阴影、8/12/16px 圆角，浅深主题与 context meter |
| 04 | 响应式 Web 工作台：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/04-responsive-web.html</Path>` | 自托管 Web UI、PWA、多设备访问 | CloudCLI | 260px 会话栏 + transcript/tools + 350px preview；蓝色动作 accent、4/6/8px 圆角；窄屏使用 drawer、底部导航与安全区，而非压缩三栏 |
| 05 | 移动监督与审批：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/05-mobile-supervisor.html</Path>` | 通知、审批、远程监督、follow-up | Happy | 最大 390px 的移动任务流；15px UI 字号、44px 级触控目标、紫色 tonal palette、12/18/22px 圆角；审批结果必须可见 |
| 06 | 多端 Agent 工作区：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/06-cross-platform-workspace.html</Path>` | 跨桌面/Web/移动的 Agent 工作区 | Paseo | 54px 工作区轨 + 250px Agent/会话栏 + tabbed workspace + 330px 工具栏；zinc 中性表面、绿色 accent、4/6/8px 圆角，关注等待审批状态 |
| 07 | Local-first 内容编辑器：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/07-local-first-content.html</Path>` | 笔记、知识库、local-first 编辑 | Notesnook、Joplin、Outline | 214px 全局栏 + 300px 内容列表 + 无框正文；暖纸面、锈色 accent、4/6/8px 圆角，正文宽度与阅读节奏优先 |
| 08 | 媒体优先个人应用：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/08-media-first.html</Path>` | 相册、资产库、视觉内容应用 | Immich | 224px 导航 + 自适应媒体网格 + 上传状态；深色低干扰 chrome、蓝色 accent、4/8/10px 圆角，真实图片和媒体本体是第一信号 |

## 选择规则

1. 先匹配用户的主要任务、目标输入设备和信息密度。
2. 按配置生成 2-4 个功能候选；候选必须在布局、信息层级或主要操作入口上不同，最终再收束为一个主风格或边界明确的组合。
3. 保留共享基础中的 keyboard focus、reduced motion、safe area、drawer/sheet 和稳定尺寸约束。
4. 先改 `.theme-*` 的语义变量，再改局部组件；不要在业务节点散落 hex、任意圆角或单次间距。
5. 保留布局职责，替换 demo 数据与状态。示例中的 Git、权限、同步、审批和上传只是交互演示。

## 复用定位

- 风格总览：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/index.html</Path>`
- 共享原语与响应式基线：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/styles/base.css</Path>`
- 八种主题与页面实现：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/styles/pages.css</Path>`
- 主题、密度、drawer、tab 与演示交互：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/scripts/gallery.js</Path>`
- Playwright 行为检查：`<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/tests/gallery.spec.js</Path>`

所有页面可直接用浏览器打开。只有重复执行 Playwright 时才在复制出的 change 设计包安装依赖；不要在研究快照内生成 `node_modules` 或 `test-results`。
