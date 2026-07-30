# Goal Plan 规划模式与输入门禁

本文件由 `<Path>{roots.workflows}/specdev/P-goal-plan/P-goal-plan.md</Path>` 在上游验证和模式选择时加载。

## 1. 必需输入门禁

- [ ] `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` 设置 `ready_for_tickets: true`，或存在用户明确批准的等价权威目标。
- [ ] `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 与全部 Ticket 一致。
- [ ] 所有计划执行的 Ticket 设置 `ready: true`。
- [ ] Ticket ID、具体 `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>` 和 Map 行一致。
- [ ] `blocked_by` 引用存在，DAG 无环。
- [ ] Spec 验收合同全部 covered，或 deferred 项有批准、原因和后续归属。
- [ ] 可能并行的 Ticket 项目写路径不相交，或已有 shared owner 与排序方案。
- [ ] Deep Ticket 具备迁移、兼容、监控、回滚、收缩条件和批准点。
- [ ] Ticket 与 Spec、ADR、代码事实不存在未处理冲突。

## 2. 硬停止

出现以下任一情况时停止：

- 任一计划内 Ticket 未 Ready；
- DAG 有环、缺失引用或依赖仅代表偏好；
- 合同 uncovered 且未批准 deferred；
- 并行候选写路径相交且无 owner 或顺序；
- Ticket 改写了 Spec 的外部行为、范围或验收；
- Ticket 与 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 的已接受决策冲突；
- Deep Ticket 缺少关键迁移或恢复信息；
- 当前代码事实使 Ticket 的核心行为、接口或验证不可执行；
- 必需外部合同或参考权威不可获得。

按 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>` 和 `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>` 返回真正拥有该决策的工件。

## 3. 可组合模式

### coordination

适用于多 Wave、扇出/汇合、shared path 或 Lead/Subagent。重点是 DAG、owner、Evidence 返回、集成和状态同步。

### migration

适用于 expand-contract、数据迁移、协议迁移或兼容窗口。重点是扩展、分批迁移、收缩条件、数据核对、监控和回滚。

### high-assurance

适用于安全、隐私、资金、数据完整性、法规或不可逆操作。重点是独立审查、人工批准、Evidence 完整性和失败恢复。

### reference-conformance

适用于外部合同、标准、官方实现或指定兼容行为。重点是来源版本、符合性矩阵和冲突裁决。

### release-coordination

适用于发布窗口、跨团队依赖、部署顺序或运营交接。重点是环境前置条件、Gate、观察期和回退。

模式可以组合。仅有线性低风险 Ticket 时不应为了形式生成重型 Goal Plan。

## 4. 模式摘要

写入 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` 前形成：

```text
modes=<mode-list>
tickets=<count>
critical_path=<ticket-list>
parallel_capacity=<n>
shared_owners=<owner-map>
gates=<gate-list>
hard_stops=<none-or-list>
adopted_assumptions=<low-impact-only>
```
