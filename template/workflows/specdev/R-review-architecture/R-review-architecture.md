---
id: specdev/review-architecture
type: workflow-entry
workflow: specdev
name: 架构审查
description: 从用户指定范围或 Git 热点扫描代码库中的结构性坏味道、代码 judo 机会和维护性风险，以中文 Markdown 记录高置信候选，并对用户选择的一个方案运行设计树访谈。
keywords: [架构审查, 维护性, 浅模块, 深模块, 局部性, 杠杆, 接缝, code-judo]
---

# 架构审查

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

本 work 以热核级维护性标准审查当前范围：先找会让 module 变浅的结构性坏味道，再找能删掉复杂性的 `code-judo` 机会，再找真正值得深化的 seam。行为正确不构成通过；如果存在更简单的路径，就优先把复杂性删掉，而不是搬家。

本 work 只审查、呈现和访谈，不直接修改产品代码。报告阶段只产出 Markdown 决策记录，不生成 HTML。

本 work 的候选筛选、排序和删除测试见 `<Path>{roots.workflows}/specdev/R-review-architecture/review-rubric.md</Path>`。审查语言必须使用 module、interface、depth、seam、adapter、leverage、locality。

激活时读取 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`，按当前步骤定位输入和证据。

## 输入与产物

按存在情况读取：

- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- `<Path>{roots.state}/specdev/adr/</Path>`
- `<Path>{roots.state}/specdev/context/</Path>`
- 当前代码、测试、依赖和 Git 历史。

产物：

- `<Path>{roots.state}/specdev/changes/{change}/architecture-review.md</Path>`

每个候选都必须说明：files、structural problem、code-judo move、deleted complexity、dependency class、strength、ADR conflict、interview state 和 user conclusion。文件若因为本次变化接近或超过 1k lines，必须显式标注 decomposition pressure，不得默默吞掉。

## 流程

### 1. 探索

**先找结构压力，再找方案。** YAGNI 仍然成立，但只有真正的代码压力才值得写入报告。

- 用户指明 module、子系统或痛点时直接采用，跳过热点推断；
- 否则翻阅足够长的 `git log --oneline`，找出反复出现的 files、call sites 和 test surfaces；
- 变更散落、没有明确热点时才扩大搜索范围；
- 只接受能通过删除测试的候选：删掉该 module 后，复杂性应集中或消失，而不是换一个地方继续蔓延；
- 逐项应用 `<Path>{roots.workflows}/specdev/R-review-architecture/review-rubric.md</Path>` 的结构压力、删除测试与排序规则；
- 先读取项目领域词汇及当前区域 ADR；探索真实调用和测试表面，过滤仅 rearrange complexity 的提案。

对每个怀疑对象应用删除测试。候选必须有真实路径、调用或测试证据，并说明不做的实际后果。与业务目标、近期变化压力、测试改善或风险降低无关的候选过滤掉。若没有任何候选通过这条线，明确写出“没有高置信候选”，不要为了填表而硬造一个。

**完成标准**：审查范围、排除范围、领域/ADR 输入和每个候选的 code pressure 均可追踪；没有把行为正确但结构平庸的地方当成通过。

### 2. 生成 Markdown 报告

使用 `<Path>{roots.workflows}/specdev/R-review-architecture/architecture-review-template.md</Path>` 写入 Markdown 决策记录。

每个候选以高置信 finding 的顺序展示，而不是按文件顺序排列。每个候选包含：

- **文件**——涉及的 files 和 modules；
- **问题**——当前架构造成的摩擦；
- **代码 judo**——保留行为但删掉什么复杂性；
- **收益**——用 locality、leverage、depth 和测试改善解释；
- **删除测试**——删掉这个 module 后复杂性是否真的消失；
- **前后对比**——用文本图示或 Mermaid 记录 shallow 与 deep；
- **建议强度**——`Strong | Worth exploring | Speculative`；
- **依赖类别**——`in-process | local-substitutable | ports & adapters | mock`；
- **ADR 冲突**——只在摩擦真实到值得重审时显示警告。

报告以“最佳推荐”结束；若没有高置信候选，就明确写 `无高置信候选`。此时**不提出 interface**，只询问用户想探索哪一个候选，或者为何没有候选。

**完成标准**：每个候选字段完整、最佳推荐唯一或明确为空，Markdown 已原子写入并重读。

### 3. 访谈与转票

用户选定候选后读取 `<Path>{roots.workflows}/specdev/R-review-architecture/references/selected-design.md</Path>`，完成完整 frontier 访谈及接受方案的 Ticket 交接。保持原有设计共识与报告完成条件，不以移出过程替代门禁。

## 完成标准

- 范围来自用户方向或 Git 热点，未进行无边界扫描；
- 每个候选通过删除测试并有真实代码压力；
- 领域使用 CONTEXT 词汇，架构严格使用共享词汇；
- Markdown 决策记录可重读；
- 每个候选有前后对比、强度、收益和 ADR 冲突处理；
- 报告阶段没有提前设计 interface；
- 用户选择的一个候选完成完整 frontier 访谈；
- 接受项进入 Ticket 治理，没有直接修改产品代码；
- 没有把结构性弱候选包装成最佳推荐。
