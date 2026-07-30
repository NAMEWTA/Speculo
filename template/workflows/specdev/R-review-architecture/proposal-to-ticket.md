# 架构提案转 Ticket

本规则由 `<Path>{roots.workflows}/specdev/R-review-architecture/R-review-architecture.md</Path>` 在候选被用户接受后加载。

- 只有有代码证据、具体收益和用户接受的提案才生成 Ticket。
- Prefactor Ticket 必须指出解除的后续阻碍、受益 Ticket 或行为，以及独立验证。
- 修改公共接口、schema、数据或大范围调用方时使用 Deep，并采用 expand → migrate → observe → contract。
- 架构报告中的项目路径只是审查证据；生成 Ticket 时重新确认当前项目路径和所有权。
- 不把“清理整个模块”写成单一 Ticket；按可验证安全落点拆分。
- 任何会改变外部行为或验收合同的提案先修订 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`。
- 任何会改变已接受架构决策的提案先更新 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`。
