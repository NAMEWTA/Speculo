---
id: specdev/review-architecture
type: workflow-entry
workflow: specdev
name: 架构审查
description: 从用户指定范围或 Git 热点扫描代码库的深化机会，以持久化可视化 HTML 呈现候选，并对用户选择的一个方案运行设计树访谈。
keywords: [architecture, review, module, interface, depth, seam, adapter, leverage, locality, HTML]
---

# 改善代码库架构

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

揭示架构摩擦，提出**深化机会**——将 shallow module 转变为 deep module 的重构。目标是可测试性和 AI 可导航性。

本 work 基于项目领域模型，并建立在共享设计词汇之上：

- 读取 `<Path>{roots.workflows}/specdev/common/rules/codebase-design.md</Path>`，在每个建议中严格使用 module、interface、depth、seam、adapter、leverage、locality，不滑向含义更松散的替代词。
- 当前 change 与永久 CONTEXT 中的领域语言为好的 seam 提供名称；ADR 记录本 work 不应重新争论的决定。

本 work 只审查、呈现和访谈，不直接修改产品代码。

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
- `<Path>{roots.state}/specdev/changes/{change}/architecture-review.html</Path>`
- 系统临时目录中名称为 architecture-review-&lt;timestamp&gt;.html 的打开副本。

## 流程

### 1. 探索

**扫描前先划定范围——YAGNI。** 深化一个模块的价值在于让未来变更更容易，因此特别关注近期发生过变更的部分。

- 用户指明模块、子系统或痛点时直接采用，跳过热点推断；
- 否则翻阅足够长的 `git log --oneline`，找出反复出现的文件和位置；
- 变更散落、没有明确热点时才扩大搜索范围。

首先阅读项目领域词汇和接触区域的 ADR。然后有机探索代码库，注意在哪里遇到摩擦：

- 理解一个概念是否需要在多个小模块间反复跳跃；
- 哪些模块是 shallow，interface 几乎与实现一样复杂；
- 哪些纯函数仅为可测试性抽出，bug 却藏在缺少 locality 的调用方式中；
- 哪些紧密耦合模块在 seam 泄漏；
- 哪些区域未经测试，或难以通过当前 interface 测试。

对每个怀疑对象应用删除测试。候选必须有真实路径、调用或测试证据，并说明不做的实际后果。与业务目标、近期变化压力、测试改善或风险降低无关的候选过滤掉。

**完成标准**：审查范围、排除范围、领域/ADR 输入和每个候选的代码压力均可追踪。

### 2. 生成 Markdown 与 HTML 报告

使用 `<Path>{roots.workflows}/specdev/R-review-architecture/architecture-review-template.md</Path>` 写入 Markdown 决策记录。

加载 `<Path>{roots.workflows}/specdev/R-review-architecture/architecture-report-contract.md</Path>` 和 `<Path>{roots.workflows}/specdev/R-review-architecture/architecture-review-report-template.html</Path>`，写入持久化 HTML。报告使用 Tailwind CDN 布局、Mermaid CDN 表达调用/依赖/序列，并混合手写 CSS/SVG 呈现质量图、横截面和调用图坍缩。

每个候选包含：

- **文件**——涉及的文件和 modules；
- **问题**——当前架构造成的摩擦；
- **解决方案**——简明描述会发生什么；
- **收益**——用 locality、leverage 和测试改善解释；
- **前后对比图**——并排展示 shallow 与 deep；
- **建议强度**——`Strong | Worth exploring | Speculative`；
- **依赖类别**——`in-process | local-substitutable | ports & adapters | mock`；
- **ADR 冲突**——只在摩擦真实到值得重审时显示警告。

报告以“最佳推荐”结束。此时**不提出 interface**，只询问用户想探索哪一个候选。

**完成标准**：每个候选字段完整、图表承担主要关系、最佳推荐唯一，Markdown 与 HTML 已原子写入并重读。

### 3. 持久化并打开报告

从 `$TMPDIR` 解析临时目录，回退 `/tmp`，Windows 使用 `%TEMP%`。把持久化 HTML 复制到全新的 architecture-review-&lt;timestamp&gt;.html，再用平台命令打开：Linux `xdg-open`、macOS `open`、Windows `start`。

打开失败不删除任一文件；向用户返回 state 主件和临时副本的绝对路径，以及失败命令。敏感值和机器路径不写回持久化报告。

**完成标准**：持久化主件可重读；临时副本名称唯一；打开成功或失败证据已报告。

### 4. 访谈用户选择的一个候选

用户选择候选后，调用 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`，用完整 frontier 遍历约束、依赖、deep module 形状、seam 后面的内容和保留测试。

决策结晶时保持领域模型同步：

- 新概念加入 change CONTEXT；永久 CONTEXT 不存在时延迟到归档提升；
- 模糊术语当场精炼；
- 用户的选择同时难以逆转、没有上下文会令人惊讶且来自真实权衡时，询问是否记录 ADR；任一条件不满足就留在 LOG/Ticket，不制造 ADR；
- 替代 interface 需要探索时使用 `<Path>{roots.workflows}/specdev/I-implement/design-it-twice.md</Path>`。

将选择、访谈状态与结论同步到 Markdown/HTML；每次运行只访谈用户选择的候选，不批量迫使用户决定所有卡片。

**完成标准**：被选候选的设计树达到共识或明确 blocked；领域词汇、LOG、ADR 和审查报告一致。

### 5. 转化为执行工作

只有被接受且有具体变更压力的提案进入 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`。加载 `<Path>{roots.workflows}/specdev/R-review-architecture/proposal-to-ticket.md</Path>`，按 Prefactor、Standard 或 Deep/expand-contract 建立 Ready 治理。

## 完成标准

- 范围来自用户方向或 Git 热点，未进行无边界扫描；
- 每个候选通过删除测试并有真实代码压力；
- 领域使用 CONTEXT 词汇，架构严格使用共享词汇；
- 持久化 Markdown/HTML 与临时打开副本均可定位；
- 每个候选有 Before/After、强度、收益和 ADR 冲突处理；
- 报告阶段没有提前设计 interface；
- 用户选择的一个候选完成完整 frontier 访谈；
- 接受项进入 Ticket 治理，没有直接修改产品代码。

## 子文件引用

- 共享设计规则：`<Path>{roots.workflows}/specdev/common/rules/codebase-design.md</Path>`
- Markdown 模板：`<Path>{roots.workflows}/specdev/R-review-architecture/architecture-review-template.md</Path>`
- HTML 报告合同：`<Path>{roots.workflows}/specdev/R-review-architecture/architecture-report-contract.md</Path>`
- HTML 模板：`<Path>{roots.workflows}/specdev/R-review-architecture/architecture-review-report-template.html</Path>`
- 提案转 Ticket：`<Path>{roots.workflows}/specdev/R-review-architecture/proposal-to-ticket.md</Path>`
