# 执行方式与工作区

I 开始实现、P 安排执行和 dev-worktree 创建/恢复时读取。规格、执行方式、工作区独立选择；共同的工具选择与交接协议见 <Path>{roots.references}/coordination/coordination-contract.md</Path>。

## 输入和选择

- 获批完整 Spec 可直接进入 I；`ready_for_tickets: true` 继续表示规格已就绪，不要求真的拆票。多个行为、公共接口、迁移或高风险不单独构成强制拆票理由，相应设计、批准、验证和恢复门必须完整。
- README 替代独立 Spec 仍限原轻量边界。用户要求独立 Spec/Ticket/Goal 时按要求交付；缺产品决定不能用执行策略补造。
- 独立调度、依赖 DAG 或逐票追踪确有需要才使用 T；跨任务 Gate、跨 change 或用户要求总控时使用 P。已有 Ticket/父实现不能通过转称 Direct Spec 绕过未完成责任；先由原 owner 处置活动执行和证据，再改路由。
- 没有明确执行方式时，按当前宿主正常执行，App、CLI 等均可；工作区默认 `current`。明确指定 CLI 交互、Herdr 等方式时按选择执行；复用已有明确选择，不逐层重问。只读 C 冻结原候选，不创建实现工作区。
- 已有父 Implementation Plan 的 workspace/Gate/上限优先约束子任务；子 Goal 不得放宽。无父计划使用已有 Goal；无 Goal 时由当前 I owner 在原 Evidence 的执行上下文记录方式、workspace 策略、Lead、路径、验证、原授权来源和恢复依据，不创建 Goal。
- 无 Goal 的实现单元默认串行，集成尝试上限为 3；有明确项目约定时记录其来源并复用更严格上限。有效计划、实际存在的执行限制和平台能力取共同上限。不为这些默认值创建 config。

## 工作区

`current` 在当前工作副本执行；同一时刻只有一个代码 writer，包括 Lead、原生 subagent/team 和 Herdr 执行者。派出实现任务后 Lead 等待写入结束再接收，测试、审查不读正在漂移的候选。只读任务可以并行。Ticket 继续 direct-parent 验收；Direct Spec 保留实施前/最终 checkpoint、dirty 状态与提交授权，未授权不提交，不伪造已集成。

`required` 对每个独立实现单元创建 source worktree；无票时整个 Direct Spec change 就是一个单元。使用 <Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path> 的 source → parent-candidate → parent 流程，Lead 拥有集成、适用 E2E 与正式证据。创建前核对实现 commit 和本地集成授权；来源清理仍单独授权。worktree 不构成沙箱或执行锁。

## 记录与恢复

Ticket 沿用原 Evidence；无票使用 <Path>{roots.state}/specdev/changes/{change}/evidence/direct-spec.md</Path>，其中 `Workspace Execution Record` 的 Direct Spec 记录用 `purpose: direct-spec`、`change` 与 `integration_attempt_limit` 代替 `ticket_id`，其余 workspace/integration 字段沿用现有合同。不允许两种执行记录并存。

新建 Direct Spec required 必须记录真实执行对象；current 可以保留原 checkpoint 证据而不制造集成记录，历史无记录 current Evidence 仍可读取。使用结构化 current 记录时必须满足同一 commit/direct-parent 完成门。无论模式，完整 Spec 的完成需要逐 AC 的 Acceptance Verification 与实际双轴审查；未完成或未验证不能标 completed。

恢复先核对原 Evidence、实际 writer、Git、候选和权限；未知结果先查询，失败候选不推进父分支。重复同一 blocker 无新证据或达到尝试上限时暂停，Lead 记录下一轮实质变化后才能重试。取消、归档不能抹掉活动 worktree 或未决 candidate。

Direct Spec 整体取消时，原 owner 先按 change-completion 记录真实取消决定、已停止 writer、依赖及 checkpoint/candidate 的保留或交接；这些条件满足后才把本单元记录 status 改为 cancelled。此状态仅适用于 Direct Spec，不表示集成通过或授予清理权限；不能用于 completed。Ticket 状态格式不变。
