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
- workspace strategy 为 worktree/mixed，但任一隔离 Ticket 缺少允许的 trigger、父分支、integration owner、可恢复 locator 或结束动作；
- `lead-team + current` 中存在 `worker-write`，或 current workspace 出现多个项目/状态写入 owner；
- 用户要求的远程或生产动作没有逐动作授权。

按 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>` 和 `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>` 返回真正拥有该决策的工件。

## 3. 可组合规划模式

- **coordination**：多 Wave、扇出/汇合或 shared path；重点是 DAG、owner、Evidence 返回、集成和状态同步。
- **migration**：expand-contract、数据或协议迁移；重点是扩展、分批迁移、收缩条件、数据核对、监控和回滚。
- **high-assurance**：安全、隐私、资金、数据完整性、法规或不可逆操作；重点是独立审查、人工批准、Evidence 完整性和失败恢复。
- **reference-conformance**：外部合同、标准、官方实现或指定兼容行为；重点是来源版本、符合性矩阵和冲突裁决。
- **release-coordination**：发布窗口、跨团队依赖、部署顺序或运营交接；重点是环境前置条件、Gate、观察期和回退。

模式可以组合。仅有线性低风险 Ticket 时不应为了形式生成重型 Goal Plan。

## 4. 锁定正交执行维度

规划模式描述为什么需要跨 Ticket 治理，不决定协作或工作区方式。每份新 Goal Plan 都必须分别记录：

- `coordination_mode: single-session | lead-team`；
- `workspace_strategy: current | worktree | mixed`。

`single-session` 是默认协作方式：主会话拥有全部项目和 SpecDev 状态写入，只读探索、日志分析、测试观察和审查 Agent 可以返回结论，但不得成为第二写入者。只有用户明确要求或确认严格角色分派时才能使用 `lead-team`；不得根据 Ticket 数量、并行机会或平台能力静默启用。

Workspace 按 Ticket 判断，允许触发只有：`parallel-write`、`protect-local-state`、`disposable-experiment`、`background-resume`、`provider-requirement`、`user-requested`。每个触发必须引用实测事实；Agent Team、Ticket 数量、只读并行、顺序写入或泛化的“更安全”都不是触发条件。全部 Ticket 使用当前工作区时为 `current`；全部项目写入位于隔离 workspace 时为 `worktree`；两者并存时为 `mixed`。

四种组合均合法，但约束不同：

| Coordination | Workspace | 写入约束 |
|---|---|---|
| single-session | current | 主会话唯一写入 |
| single-session | worktree/mixed | 主会话管理并集成隔离写入 |
| lead-team | current | Lead 唯一写入，Worker 只读 |
| lead-team | worktree/mixed | `worker-write` 每项绑定独立 workspace，Lead 默认承担 integration owner |

选择 Lead Team 后固定 Lead、provider、repository、不可变 `base_sha` 或等价基线、源码交付方式、`max_correction_rounds` 和逐动作授权。选择 worktree/mixed 后固定每项的 trigger、workspace owner、integration owner、父分支、locator、来源 checkpoint 策略和结束动作。认证秘密和机器绝对路径不得进入 Goal Plan。

## 5. 规划摘要

写入前形成核心摘要：

```text
modes=<mode-list>
coordination_mode=single-session|lead-team
workspace_strategy=current|worktree|mixed
tickets=<count>
critical_path=<ticket-list>
parallel_capacity=<n>
shared_owners=<owner-map>
gates=<gate-list>
authorization=<action-summary>
hard_stops=<none-or-list>
adopted_assumptions=<low-impact-only>
```

Lead Team 额外形成 `execution_model`、`lead`、`provider`、`checkpoint`、`source_delivery`、`max_correction_rounds` 和 locator；worktree/mixed 额外形成逐 Ticket workspace allocation。两类字段分别只进入各自附录。

**完成标准**：规划 modes、coordination mode 与 workspace strategy 互不代替；single-session 没有委派痕迹；current 没有隔离安排；所有条件分支的源码、交付、权限和恢复字段都有可验证值。
