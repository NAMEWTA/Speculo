# Goal Plan 规划模式与输入门禁

规划模式描述 Goal Plan 需要额外解决的工程问题。Goal Plan 创建时单独询问 Ticket 是否开启 worktree，默认使用当前 workspace；worktree 与 direct-parent/candidate-merge 由该次 Goal Plan 固定。

本文件定义单 change 的规划与全局执行门。多 change 父编排创建仍要求成员全员 Ready，遵守 `<Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path>`。

## 1. 输入门禁

开始规划前穷尽检查：

- Spec `ready_for_tickets: true`，或上游工件已等价覆盖范围、合同与验收；
- Tickets Map 与全部计划内 Ticket 存在，范围、合同覆盖、DAG 和所有权完整，DAG 无环；Map Ready 表示结构就绪，不要求所有未来 Ticket 同时 Ready；
- 等待真实上游产物的未来 Ticket 保持 `status: draft`、`ready: false`，在未决问题中记录缺口、生产者 Ticket、所需证据和 DoR 重审条件；不编造版本、路径或验证入口；
- 每个验收合同被 Ticket 覆盖；
- writable/shared path 有唯一 owner，Wave 候选无写冲突；
- config schema v5，`max_implementation_agents` 与 `max_integration_attempts` 为正整数；UI 设计候选范围读取 planning 配置；
- 父分支可定位，implementation commit 与本地 integration 的授权状态已记录；`plan` 可以列出待批准项并保持 `ready_for_execution: false`；
- 待执行 Deep Ticket 的迁移、兼容、监控、恢复和不可逆批准点完整。
- Ticket 与 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`、`<Path>{roots.state}/specdev/adr/</Path>`、`<Path>{roots.state}/specdev/context/</Path>` 和当前代码事实不存在未处理冲突；
- 项目声明的验证命令真实存在，并能观察目标行为；不可运行项有替代证据或明确 blocker；
- 当前源码基线、父分支、工作区状态和现有用户改动已经实测；
- 外部合同、标准、参考实现或依赖版本已经固定，不使用浮动的“最新”描述。

影响整体范围、DAG、合同覆盖或所有权的上游事实缺失时返回其 owner。已定位到未来 Ticket 的局部缺口只阻塞该票及其依赖闭包，不阻塞独立 Ready 生产者。非 v6 Goal Plan 必须按当前合同重新规划，不能只修改版本号。

## 2. 可组合模式

- `migration`：存在 expand-contract、数据/协议迁移、兼容窗口或收缩条件；
- `high-assurance`：涉及安全、隐私、资金、数据完整性、法规、关键基础设施、不可逆操作或高事故半径；
- `reference-conformance`：必须逐项符合外部标准、协议、设计或参考实现；
- `release-coordination`：存在发布窗口、跨团队依赖、外部批准、阶段部署、观察期、运营交接或远程 reconcile。

没有适用模式时 `modes: []`。模式只增加对应 Gate、证据和恢复，不改变 Lead、worktree 或集成基本合同。

## 3. Goal Plan 工作区选择

- 创建 Goal Plan 时询问“是否开启 worktree 开发？”，默认 `否`；
- 用户选择 `否` 时写入 `ticket_workspace_policy: current` 与 `integration_gate: direct-parent`；
- 用户选择 `是` 时写入 `ticket_workspace_policy: required` 与 `integration_gate: candidate-merge`；
- 该选择只作用于当前 Goal Plan，不读取或修改全局配置；
- `current` 模式下所有 Ticket 必须串行，并持有唯一 implementation writer 锁；
- `required` 模式继续使用每 Ticket source worktree 和 Lead-owned candidate integration；
- `orchestration` 固定为 `lead-directed`；implementation agent 与 integration attempt 上限读取 config，并可在本计划中进一步降低。

## 4. Ready 停止条件

Goal 全局执行门与 Ticket DoR 分开判断。以下任一全局条件未满足时 `ready_for_execution: false`；局部 Ticket 的缺口、资源冲突或未通过 DoR 由逐票检查阻塞对应依赖闭包，不升级成全员停止：

- Goal Plan 工作区选择未记录；
- `current` 模式下 Ticket 无法串行排序或当前 workspace 不是唯一项目写入 owner；
- `required` 模式下 Ticket 无法建立独立 worktree 或父分支不明确；
- 当前模式所需的 implementation commit 或 direct-parent/candidate integration 授权缺失；
- shared path 没有唯一 owner；
- E2E 是否需要会改变验收结论但尚未确定；
- 整体目标的验证命令不能执行或无法观察目标行为，且没有批准的替代证据；
- 当前源码/工作区基线未实测，或外部合同版本仍然浮动；
- 影响整体目标的 Ticket 与 Spec、ADR、`<Path>{roots.state}/specdev/adr/</Path>`、`<Path>{roots.state}/specdev/context/</Path>` 或代码事实冲突未处理；
- 整体迁移、发布、不可逆动作或恢复存在高影响未知项；
- 实现 agent 或 integration attempt 上限超过 config 或平台能力。

全局门通过后仍只调度自身 Ready、依赖成功完成、owner 明确且资源/并发条件满足的 Ticket。上游 done 不自动修改消费者 Ready；Lead 回读真实产物，按 `<Path>{roots.workflows}/specdev/T-tickets/ticket-readiness.md</Path>` 重审后才能更新该票。frontier 为空且仍有未完成票时报告精确缺口与重审条件。

## 5. 固定执行拓扑

- `orchestration: lead-directed`；
- `ticket_workspace_policy: current | required`；
- `integration_gate: direct-parent | candidate-merge`；
- `current` 与 `direct-parent` 必须成对；`required` 与 `candidate-merge` 必须成对；
- `implementation_agent_limit` 不大于 config 与平台能力；`integration_attempt_limit` 不大于 config；current 模式保持单 writer 串行安全不变量；
- Lead 不计入 implementation subagent 数量；
- review/research/test-observation agent 无 SpecDev 固定数字上限，但必须保持只读且不竞争同一可变环境；
- provider 与派单在执行期决定，不成为 Goal Plan 的静态枚举。

**完成标准**：所有固定字段、适用模式、授权、Lead、父分支和阻塞均可验证；没有替代编排模型或空占位。
