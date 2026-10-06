# 已选架构候选的设计与转票

用户选定一个候选后读取；保持审查报告和 change 内决策同步，不修改生产代码。

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
