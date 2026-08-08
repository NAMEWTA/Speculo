# Goal Plan 规划模式与输入门禁

本文件由 `<Path>{roots.workflows}/specdev/P-goal-plan/P-goal-plan.md</Path>` 在上游验证和角色分支确认时加载。

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
- [ ] 项目声明的验证命令真实存在且能观察目标行为；不可运行项有替代证据或明确 blocker。
- [ ] 当前源码基线、工作区状态和外部合同版本已实测，而非使用浮动的“最新”描述。

## 2. 硬停止

出现以下任一情况时停止：

- 任一计划内 Ticket 未 Ready；
- DAG 有环、缺失引用或依赖仅代表偏好；
- 合同 uncovered 且未批准 deferred；
- 并行候选写路径相交且无 owner 或顺序；
- Ticket 改写了 Spec 的外部行为、范围或验收；
- Ticket 与 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 的已接受决定冲突；
- Deep Ticket 缺少关键迁移或恢复信息；
- 当前代码事实使 Ticket 的核心行为、接口或验证不可执行；
- 必需外部合同或参考权威不可获得；
- 已选择委派，但 Lead、checkpoint、可恢复 locator 或交付通道无法建立；
- 用户要求的远程或生产动作没有逐动作授权。

按 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>` 和 `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>` 返回真正拥有该决策的工件。

## 3. 可组合规划模式

- **coordination**：多 Wave、扇出/汇合或 shared path；重点是 DAG、owner、Evidence 返回、集成和状态同步。
- **migration**：expand-contract、数据或协议迁移；重点是扩展、分批迁移、收缩条件、数据核对、监控和回滚。
- **high-assurance**：安全、隐私、资金、数据完整性、法规或不可逆操作；重点是独立审查、人工批准、Evidence 完整性和失败恢复。
- **reference-conformance**：外部合同、标准、官方实现或指定兼容行为；重点是来源版本、符合性矩阵和冲突裁决。
- **release-coordination**：发布窗口、跨团队依赖、部署顺序或运营交接；重点是环境前置条件、Gate、观察期和回退。

模式可以组合。仅有线性低风险 Ticket 时不应为了形式生成重型 Goal Plan。

## 4. 每次确认角色分支

规划模式描述为什么需要跨 Ticket 治理，不决定是否启用 Lead/subagent。每次运行 P 都向用户提供两个选择：

- **普通 Goal Plan**：由实现者按核心计划推进，不创建严格角色、交付通道或派单合同；最终产物不记录一个名为 direct 的模式。
- **委派 Goal Plan**：启用唯一 Lead 与 `native-subagent` 或 `external-web-subagent`，并加载委派协议。

不得根据 Ticket 数量、并行机会或平台能力静默启用委派。选择普通分支后，AI 自适应决定核心计划的适用细节，不把本次角色选择写入 frontmatter，也不在正文生成空章节或“不适用”说明。

选择委派后才固定：Lead、provider、repository/branch、不可变 `base_sha` 或等价基线、源码交付方式、`max_correction_rounds` 和逐动作授权。认证秘密和机器绝对路径不得进入 Goal Plan。

## 5. 规划摘要

写入前形成核心摘要：

```text
modes=<mode-list>
tickets=<count>
critical_path=<ticket-list>
parallel_capacity=<n>
shared_owners=<owner-map>
gates=<gate-list>
authorization=<action-summary>
hard_stops=<none-or-list>
adopted_assumptions=<low-impact-only>
```

委派分支额外形成 `execution_model`、`lead`、`provider`、`checkpoint`、`source_delivery`、`max_correction_rounds` 和 locator；这些字段只进入委派附录。

**完成标准**：规划 modes 与角色选择互不代替；普通计划没有委派痕迹；委派计划的源码、交付、权限和恢复字段都有可验证值。
