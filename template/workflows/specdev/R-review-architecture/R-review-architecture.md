---
id: specdev/review-architecture
type: workflow-entry
workflow: specdev
name: 架构审查
description: 扫描与目标相关的代码区域，识别浅模块、接缝泄漏和局部性问题，以可视化报告呈现候选方案，并通过逐项访谈转化为可执行决策。
keywords: [architecture, review, module depth, seams, locality, HTML, refactor]
---

# 架构审查

本 work 保留并强化三项核心能力：从真实代码压力识别深层化机会、输出可视化 HTML 审查报告、与用户逐项访谈候选方案。它不以“更优雅”为由制造无目标重构，也不直接修改产品代码。

## 输入与产物

按存在情况读取：

- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- `<Path>{roots.state}/specdev/adr/</Path>`
- `<Path>{roots.state}/specdev/context/</Path>`
- 当前代码、测试、依赖、近期变更和缺陷事实。

产物：

- 决策记录：`<Path>{roots.state}/specdev/changes/{change}/architecture-review.md</Path>`
- 可视化报告：`<Path>{roots.state}/specdev/changes/{change}/architecture-review.html</Path>`

模板：

- `<Path>{roots.workflows}/specdev/R-review-architecture/architecture-review-template.md</Path>`
- `<Path>{roots.workflows}/specdev/R-review-architecture/architecture-review-report-template.html</Path>`

## 流程

### 1. 明确审查压力与范围

记录触发审查的业务目标、近期变更、缺陷、维护成本、性能或风险，不做无边界全仓巡检。明确：审查入口、相关调用路径、不审查范围和成功标准。

用户明确要求全仓架构扫描时，可以扩展范围，但仍按领域、模块或调用链分批，避免在单次上下文中生成无证据的泛化结论。

### 2. 建立当前结构地图

只读探索目标区域：

- 模块及其公共接口；
- 信息隐藏与调用者负担；
- 接缝、适配器和依赖类别；
- 数据、控制和错误流；
- 时间耦合、共享状态和跨目录跳转；
- 测试接缝与变更热点；
- 近期缺陷、重复 workaround 和高频共同修改路径。

使用：

- `<Path>{roots.workflows}/specdev/I-implement/codebase-design-glossary.md</Path>`
- `<Path>{roots.workflows}/specdev/I-implement/deepening.md</Path>`

外部技术或模式不清楚时使用 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`。

### 3. 识别候选深层化机会

候选至少属于一种机制：

- 浅模块把复杂性推给调用者；
- 接缝泄漏导致多处了解同一协议或状态；
- 局部性差导致一个行为修改跨越过多路径；
- 依赖方向或生命周期不清导致测试与替换困难；
- 时间耦合、共享状态或错误语义造成事故半径；
- 缺少真正适配器导致 Mock 代替设计；
- 宽重构压力需要 expand-contract。

每个候选必须有项目路径、调用或测试证据，并说明“不做”的实际后果。没有用户或工程收益、近期变化压力或风险降低的候选直接过滤。

### 4. 设计替代方案

每个保留候选至少比较：

- 保持现状；
- 最小深层化方案；
- 一个具有实质差异的替代方案。

比较调用者复杂度、接口稳定性、迁移、兼容、测试、回滚、路径影响和事故半径。局部接口存在多个可行设计时，可使用 `<Path>{roots.workflows}/specdev/I-implement/design-it-twice.md</Path>`。

### 5. 生成 Markdown 与 HTML 报告

使用 `<Path>{roots.workflows}/specdev/R-review-architecture/architecture-review-template.md</Path>` 写入 `<Path>{roots.state}/specdev/changes/{change}/architecture-review.md</Path>`。

使用 `<Path>{roots.workflows}/specdev/R-review-architecture/architecture-review-report-template.html</Path>` 写入 `<Path>{roots.state}/specdev/changes/{change}/architecture-review.html</Path>`。HTML 应包含：

- 审查范围与结构地图；
- 候选卡片和严重度；
- 证据路径；
- 方案对比；
- 影响与迁移图；
- 接受、延后、拒绝状态；
- 指向 Markdown 决策记录的完整状态路径文本。

不得依赖外部 CDN；报告应可作为单文件本地打开。

### 6. 逐项访谈候选

按价值与风险排序，一次只讨论一个候选：

1. 说明证据和问题机制；
2. 给出推荐方案与理由；
3. 展示至少一个替代方案和保持现状的后果；
4. 询问用户接受、调整、延后或拒绝；
5. 将结论写回 `<Path>{roots.state}/specdev/changes/{change}/architecture-review.md</Path>` 和 `<Path>{roots.state}/specdev/changes/{change}/architecture-review.html</Path>`；
6. 架构级决定同步到 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`，讨论轨迹同步到 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`。

不得一次抛出所有问题要求用户批量选择。

### 7. 转化为执行工作

只有被接受且有具体变更压力的提案才进入执行。加载 `<Path>{roots.workflows}/specdev/R-review-architecture/proposal-to-ticket.md</Path>`：

- 可独立降低后续实现难度的改进生成 Prefactor Ticket；
- 常规垂直迁移生成 Standard Ticket；
- 公共契约、数据、宽迁移或高风险改动生成 Deep Ticket 与 expand-contract；
- 进入 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>` 完成正式拆分和 Ready 门禁。

## 完成标准

- 审查压力、范围和不审查范围明确；
- 每个候选有代码事实、行为影响和不做后果；
- 保留候选有至少两个实质方案与权衡；
- Markdown 和无外部依赖的 HTML 报告均已生成；
- 用户已逐项给出接受、调整、延后或拒绝结论；
- 接受的架构决定已同步到 ADR；
- 执行建议已转入 Ticket 治理，而不是直接修改代码。

## 子文件引用

- Markdown 模板：`<Path>{roots.workflows}/specdev/R-review-architecture/architecture-review-template.md</Path>`
- HTML 模板：`<Path>{roots.workflows}/specdev/R-review-architecture/architecture-review-report-template.html</Path>`
- 提案转 Ticket：`<Path>{roots.workflows}/specdev/R-review-architecture/proposal-to-ticket.md</Path>`
