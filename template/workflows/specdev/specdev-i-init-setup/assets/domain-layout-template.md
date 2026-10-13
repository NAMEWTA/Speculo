# 领域文档布局

## 读取顺序

1. 永久领域上下文：`<Path>{roots.state}/specdev/context/</Path>`
2. 永久架构决策：`<Path>{roots.state}/specdev/adr/</Path>`
3. 当前领域上下文：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
4. 当前架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
5. 当前 Spec：`<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
6. 当前 Ticket 目录：`<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
7. 当前 Goal Plan：`<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
8. 当前设计日志：`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`

## 职责

- `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`：当前 bounded context 的项目规范术语和 `_Avoid_` 同义词；不保存代码导航或 change 历史。
- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`：当前 change 已接受、被替代或废弃的架构决策。
- `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`：设计讨论轨迹，不作为当前架构的最终权威。
- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`：用户问题、外部行为、范围与验收合同。
- `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`：单个垂直切片的执行契约。
- `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`：跨 Ticket 的门禁、调度和治理。

change 完成后，只有仍真实、跨 change 有用且有实现证据的规范术语或符合三项准入条件的 ADR 才能提升到永久目录。
