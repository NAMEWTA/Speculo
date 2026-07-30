# Ticket 拆分规则

本文件由 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>` 在草拟切片时加载，并受 `<Path>{roots.workflows}/specdev/common/rules/planning-principles.md</Path>` 约束。

## 好的垂直切片

- 从稳定入口到可观察结果形成闭环；
- 包含该行为所需的最小 schema、接口、交互与测试组合；
- 完成后仓库处于可验证状态；
- 与其他切片有实质行为差异；
- 可以由一个全新上下文完成；
- 不需要执行者重新决定外部行为或公共契约。

## 拆分信号

出现任一情况应拆分：

- 包含两个可独立发布或验证的用户行为；
- 需要多个不同领域或架构决策；
- 预计超出单一上下文；
- `writable_paths` 过宽且可通过接缝隔离；
- 验证必须等到不相关工作完成；
- 一个部分高风险、另一部分低风险；
- 一个部分改变共享契约，其他部分只是消费者迁移。

## 合并信号

出现任一情况应合并：

- 两个 Ticket 单独完成都没有可观察价值或安全准备价值；
- 只是按技术层水平分割；
- 验收、代码范围和证据高度重叠；
- 依赖边只是人为交接，没有真实前置产物；
- 拆分后每个 Ticket 都需要重复相同关键上下文和同一不可分割验证。

## 特殊模式

### Prefactor

必须说明解除的具体阻碍、后续受益 Ticket 和独立验证。不能只写“清理代码”。

### Expand-contract

先扩展兼容层，再分批迁移，最后收缩。每批应保持绿色；不能保持绿色时必须有隔离集成分支与最终集成 Gate。

### Research spike

未知足以阻止决策时，进入 `<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>`。调查 Ticket 只回答决策问题，不顺手实现产品代码。

### Shared contract

先由单一 owner Ticket 修改共享契约并形成稳定证据，再扇出消费者 Ticket。共享路径规则见 `<Path>{roots.workflows}/specdev/common/rules/path-ownership.md</Path>`。

### Bug fix

已确认根因时，以 `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>` 的修复契约为依据；根因未知时先运行 `<Path>{roots.workflows}/specdev/D-diagnose-bugs/D-diagnose-bugs.md</Path>`。
