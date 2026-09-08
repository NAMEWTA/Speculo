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

## 读取范围

1. 先读取 `<Path>{roots.workflows}/specdev/README.md</Path>` 与当前 Work 的状态入口。
2. 再读取 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`、`<Path>{roots.workflows}/specdev/common/rules/codebase-design.md</Path>` 和 `<Path>{roots.workflows}/specdev/common/rules/evidence-and-verification.md</Path>`，按当前分支、状态和关键词定位最小相关工件。
3. 只在本 Work 明确要求恢复、冲突、执行安全或归档证据时扩展为全量读取；缺少匹配证据或 owner/gateway 时停止受影响分支。
4. 用户指定范围优先于 Git 热点；若未指定，则从最近 churn、重复编辑和报错/回归轨迹中找出最值得审查的 module。

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
- 优先挑出结构性回归、重复 special cases、wrong-layer logic、thin wrappers、identity abstractions、type boundary drift、sequential orchestration 和 file-size/decomposition pressure；
- 如果一个更 canonical 的 helper 已经存在，优先复用它；如果 proposal 只是 rearrange complexity，不算候选。

首先阅读项目领域词汇和接触区域的 ADR。然后有机探索 codebase，注意哪里会让 maintenance knowledge 分散：

- 哪些 module 是 shallow，interface 几乎与 implementation 一样复杂；
- 哪些 seam 正在 leak；
- 哪些纯函数只是为了可测试性被拆出，但 bug 实际藏在缺少 locality 的调用方式中；
- 哪些模块因为 ad-hoc conditionals、mode flags 或 one-off branches 变得更 spaghetti；
- 哪些区域正在把 feature logic 泄漏进 shared path 或 canonical helper 之外；
- 哪些结构已经逼近或超过 1k lines，应该先 decomposition 再 review；
- 哪些 orchestration 本可以并行或更 atomic，却被无谓串行化。

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

### 3. 访谈用户选择的一个候选

用户选择候选后，调用 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`，用完整 frontier 遍历约束、依赖、deep module 形状、seam 后面的内容和保留测试。

决策结晶时保持领域模型同步：

- 新概念加入 change CONTEXT；永久 CONTEXT 不存在时延迟到归档提升；
- 模糊术语当场精炼；
- 用户的选择同时难以逆转、没有上下文会令人惊讶且来自真实权衡时，询问是否记录 ADR；任一条件不满足就留在 LOG/Ticket，不制造 ADR；
- 替代 interface 需要探索时使用 `<Path>{roots.workflows}/specdev/I-implement/design-it-twice.md</Path>`；
- 如果候选最终只是把复杂性搬家，而不是删掉它，在访谈中直接回退，不把它升级成 Ticket。

将选择、访谈状态与结论同步到 Markdown；每次运行只访谈用户选择的候选，不批量迫使用户决定所有卡片。

**完成标准**：被选候选的设计树达到共识或明确 blocked；领域词汇、LOG、ADR 和审查报告一致。

### 4. 转化为执行工作

只有被接受且有具体变更压力的提案进入 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`。加载 `<Path>{roots.workflows}/specdev/R-review-architecture/proposal-to-ticket.md</Path>`，按 Prefactor、Standard 或 Deep/expand-contract 建立 Ready 治理；只有能删除复杂性的提案才继续，纯重排和 thin wrapper 不进入 Ticket。

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

## 子文件引用

- 共享设计规则：`<Path>{roots.workflows}/specdev/common/rules/codebase-design.md</Path>`
- 证据与验证：`<Path>{roots.workflows}/specdev/common/rules/evidence-and-verification.md</Path>`
- 审查准则：`<Path>{roots.workflows}/specdev/R-review-architecture/review-rubric.md</Path>`
- Markdown 模板：`<Path>{roots.workflows}/specdev/R-review-architecture/architecture-review-template.md</Path>`
- 提案转 Ticket：`<Path>{roots.workflows}/specdev/R-review-architecture/proposal-to-ticket.md</Path>`
