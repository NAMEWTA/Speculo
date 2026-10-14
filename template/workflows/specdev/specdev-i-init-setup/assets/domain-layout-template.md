# 领域文档布局

## 按当前问题定位

1. 永久领域上下文：`<Path>{roots.state}/specdev/context/</Path>`
2. 永久架构决策：`<Path>{roots.state}/specdev/adr/</Path>`
3. 当前领域上下文：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
4. 当前架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
5. 当前 Spec：`<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
6. 当前 Ticket 目录：`<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
7. 当前 Goal Plan：`<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
8. 当前设计日志：`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`

UI 范围先按 scope/规则 ID 定位 <Path>{roots.state}/specdev/design/</Path>，再读取 <Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path> 固定的 baseline revision 与批准原型；不展开无关设计规则。

## 职责

- `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`：当前 bounded context 的项目规范术语和 `_Avoid_` 同义词；不保存代码导航或 change 历史。
- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`：当前 change 已接受、被替代或废弃的架构决策。
- <Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>：当前 change 的已批准视觉/交互合同，P 拥有；原型包只拥有源码和证据。
- <Path>{roots.state}/specdev/design/DESIGN.md</Path>：A 网关拥有的项目设计基线；仅在批准的首次发布时创建，不预造空目录。
- `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`：设计讨论轨迹，不作为当前架构的最终权威。
- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`：用户问题、外部行为、范围与验收合同。
- `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`：单个垂直切片的执行契约。
- `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`：跨 Ticket 的门禁、调度和治理。

change 完成后，只有仍真实、跨 change 有用且有实现证据的规范术语、合格 ADR 或可复用设计规则才可由 A 提升。首次设计 approved-intent 基线在 HTML 集中确认后经 A 设计网关发布，不能宣称已实现；具体遵循 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path>。

当前工程事实按主题读取 <Path>{roots.state}/docs/README.md</Path> 的负责正文导航；缺失不阻塞普通 Work，只有明确请求才建立基线。
