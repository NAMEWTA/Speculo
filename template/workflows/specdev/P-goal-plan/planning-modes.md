# Goal Plan 规划模式与输入门禁

规划模式描述 Goal Plan 需要额外解决的工程问题，不再表示 Agent 或 workspace topology。Lead-directed、每 Ticket worktree 和 candidate-merge 是所有新 Goal Plan 的固定合同。

## 1. 输入门禁

开始规划前穷尽检查：

- Spec `ready_for_tickets: true`，或上游工件已等价覆盖范围、合同与验收；
- Tickets Map 与全部 Ticket 存在、Ready、DAG 无环；
- 每个验收合同被 Ticket 覆盖；
- writable/shared path 有唯一 owner，Wave 候选无写冲突；
- config schema v4，`max_implementation_agents` 为 `1..3`；
- 父分支可定位，implementation commit 与本地 integration 已获授权；
- Deep Ticket 的迁移、兼容、监控、恢复和不可逆批准点完整。
- Ticket 与 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`、`<Path>{roots.state}/specdev/adr/</Path>`、`<Path>{roots.state}/specdev/context/</Path>` 和当前代码事实不存在未处理冲突；
- 项目声明的验证命令真实存在，并能观察目标行为；不可运行项有替代证据或明确 blocker；
- 当前源码基线、父分支、工作区状态和现有用户改动已经实测；
- 外部合同、标准、参考实现或依赖版本已经固定，不使用浮动的“最新”描述。

缺失上游事实返回其 owner；非 v4 Goal Plan 必须按当前合同重新规划，不能只修改版本号。

## 2. 可组合模式

- `migration`：存在 expand-contract、数据/协议迁移、兼容窗口或收缩条件；
- `high-assurance`：涉及安全、隐私、资金、数据完整性、法规、关键基础设施、不可逆操作或高事故半径；
- `reference-conformance`：必须逐项符合外部标准、协议、设计或参考实现；
- `release-coordination`：存在发布窗口、跨团队依赖、外部批准、阶段部署、观察期、运营交接或远程 reconcile。

没有适用模式时 `modes: []`。模式只增加对应 Gate、证据和恢复，不改变 Lead、worktree 或集成基本合同。

## 3. 固定执行拓扑

- `orchestration: lead-directed`；
- `ticket_workspace_policy: required`；
- `integration_gate: candidate-merge`；
- `implementation_agent_limit` 不大于 config，也不大于 `3`；
- Lead 不计入 implementation subagent 数量；
- review/research/test-observation agent 无 SpecDev 固定数字上限，但必须保持只读且不竞争同一可变环境；
- provider 与派单在执行期决定，不成为 Goal Plan 的静态枚举。

## 4. Ready 停止条件

存在以下任一情况时 `ready_for_execution: false`：

- Lead locator 无法恢复；
- 本地 commit 或 candidate integration 未授权；
- Ticket 无法建立独立 worktree 或父分支不明确；
- shared path 没有唯一 owner；
- E2E 是否需要会改变验收结论但尚未确定；
- 项目验证命令不能执行或无法观察目标行为，且没有批准的替代证据；
- 当前源码/工作区基线未实测，或外部合同版本仍然浮动；
- Ticket 与 Spec、ADR、`<Path>{roots.state}/specdev/adr/</Path>`、`<Path>{roots.state}/specdev/context/</Path>` 或代码事实存在未处理冲突；
- 迁移、发布、不可逆动作或恢复存在高影响未知项；
- 实现 agent 上限超过 `3`。

**完成标准**：所有固定字段、适用模式、授权、Lead、父分支和阻塞均可验证；没有替代编排模型或空占位。
