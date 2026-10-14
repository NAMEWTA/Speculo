# P-prototype 设计库

本目录是 P-prototype 的静态设计参考层。它帮助 UI 原型先按任务、对象、密度和平台选择结构，再选择视觉表达；它不拥有运行时状态，不替代项目现有设计系统，也不授权修改生产代码。

首版提供 **12 个功能模板**（保留原 8 个 HTML 样板，新增企业数据、营销转化、交易服务、品牌编辑 4 个）与 **10 份独立视觉参考**。功能模板和上游参考是两种清单；一次调用仍按 P 的默认 3/最多 4 个候选交付，不把库的数量当成交付数量。

- 机器可读入口：[catalog v1](catalog.json)，结构为 [catalog schema](catalog.schema.json)；所有本地路径相对本目录。
- 用户选择入口：[离线设计库](gallery.html)，支持任务/平台筛选、打开原型和形成组合草案；不写入项目状态。
- 生成候选前读取 [组合协议](composition.md)，先确定主任务骨架与项目继承，再选主视觉和明确的辅助区域。
- 来源核查按 catalog 中的 guide → document 定位；[新增上游 provenance](upstream/awesome-design-md/provenance.json) 保存完整 revision、SHA-256 与许可。

研究快照固定在 commit `49b565913c52f4867456e609696625157f19b930`。快照是证据与可运行样板，不在原型过程中原地修改；需要复用时，把所需 HTML/CSS/JS/图片和 attribution 复制到当前 change 的设计包。

## 渐进披露入口

| 当前问题 | 读取 | 读完应得到 |
|---|---|---|
| 先决定信息架构、密度和组件边界 | `<Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/foundations.md</Path>` | 一个主布局范式、密度档和设计系统边界 |
| 在十二种功能模板中选择起点 | `<Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/style-index.md</Path>` | 一个主模板、项目继承与受控视觉组合 |
| 寻找相似产品及其真实模式 | `<Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/product-pattern-index.md</Path>` | 对应项目、可借鉴模式和一手研究路径 |
| 定义浅色/深色、语义 token、字号与层级 | `<Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/color-and-theme.md</Path>` | 可实现的主题与密度假设 |
| 设计导航、表格、表单、反馈或危险操作 | `<Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/interaction-patterns.md</Path>` | 完整状态和验证动作 |
| 需要窄屏、触屏、桌面/Web/移动重排 | `<Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/responsive-and-platforms.md</Path>` | 每个平台的任务职责和断点行为 |
| 需要引用、复制资产或判断证据强度/许可 | `<Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/research-provenance.md</Path>` | 可追溯来源、复用边界和 attribution |

## 使用顺序

1. 检测现有项目或明确新产品设想，并列出核心对象、最常见的 3-5 个任务、目标输入设备和最坏数据状态。
2. 读取 foundations，选择一个主布局范式。不要先按品牌色、圆角或流行风格选择页面。
3. 从 catalog/style-index 定位匹配 recipe 与 visual guide，按功能推荐 2-4 个结构不同的候选，并为每个候选生成独立 comparison HTML；无偏好时自主推荐组合，最终确认仍针对真实 HTML。
4. 读取 product-pattern-index，只深入与当前对象、任务或平台相似的项目研究；星标不构成设计质量或许可结论。
5. 只加载当前问题涉及的 theme、interaction 或 responsive 文件。精确值必须能回到 snapshot 中的 token、CSS 或研究证据。
6. 复制样板时保留相对目录关系和所需 attribution；把 demo 名称、权限、Git、同步与审批状态替换为原型自己的假数据，不把演示逻辑当作真实业务逻辑。
7. 用真实极端数据、键盘、目标宽度和浅/深主题验证。选择、拒绝理由和最终源码进入设计系统主文档，设计库本身保持不变。

## 快照入口

- 总报告：`<Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/research-snapshot/report/OPEN_SOURCE_UI_RESEARCH_2026.md</Path>`
- 八种风格总览：`<Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/research-snapshot/ui-gallery/index.html</Path>`
- 样板使用说明：`<Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/research-snapshot/ui-gallery/README.md</Path>`
- 结构化项目数据：`<Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/research-snapshot/data/projects.json</Path>` 与 `<Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/research-snapshot/data/extended-projects.json</Path>`
- 综合 token：`<Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/research-snapshot/reference/design-tokens.css</Path>`

## 完成门

- 选择理由落在任务模型、信息密度、输入设备和状态复杂度，而不是“看起来像”；
- 一个布局范式和一个主风格已明确，所有新增 token 都有语义角色；
- loading、empty、no-results、error、offline、read-only、permission 与长文本按适用性逐项处理；
- 窄屏改变任务流而非压缩桌面多栏；
- 引用与复制均可回到固定 commit、研究文件和 attribution。
