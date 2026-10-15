# Execution Preflight

先按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 解析有效执行选择；用户选择 Herdr 时先完成其项目 Skill 接入与环境检查。无 Goal 不构成阻塞，不能用另一个 CLI 或工作区替换用户固定选择。

## Ticket 硬检查

- [ ] Ticket frontmatter 可解析，`ready: true`，`status: ready`。
- [ ] Tickets Map 已完整读取，包含总体实施背景和项目 Skill 读取矩阵；当前 Ticket 被 `ALL` 或自身 ID 覆盖。
- [ ] 当前 Ticket 映射的项目 Skill 路径均为真实存在的项目根相对入口文件，Lead 已读取入口并完整展开命中的 Skill；实现执行者 Packet 包含 Map 与同一最低必读集合。
- [ ] 项目 Agent 指令或当前实现范围没有触发矩阵外的未读项目 Skill；发现新匹配项时由 Lead 更新 Map、重新运行 tickets 校验后再恢复项目写入。
- [ ] 所有 `blocked_by` Ticket 为 done 且 Evidence 存在。
- [ ] UI Ticket 的 design_ref revision/digest/pages/acceptance 与已批准 change DESIGN 一致，prototype/基线引用未漂移；实际 UI 文件范围不能通过省略 ui_change 绕过。
- [ ] Spec、ADR、Ticket 与 Goal Plan 无冲突；旧 Goal Plan schema 必须重跑 P-goal-plan。
- [ ] Goal Plan（若存在）为 `lead-directed`，workspace/integration 策略为 `current/direct-parent` 或 `required/candidate-merge`，Lead 可恢复，implementation/integration 上限有 Execution Policy Source 来源，存在有效 config 时不超过其上限及平台能力。
- [ ] 当前代码入口、接口、路径和父分支仍与 Ticket 假设一致。
- [ ] writable/shared paths 有唯一 owner；current 模式的 Ticket 顺序已固定且没有其他 active implementation writer。
- [ ] implementation commit 与当前策略对应的 direct-parent 或 local candidate integration/父分支更新已授权；push/PR/remote/deploy 等保持独立。
- [ ] required 模式的 原 Ticket Evidence 的 Workspace Execution Record，`base_sha`、父分支、owners、branch、`workspace_ref`、integration 与 E2E disposition 完整；current 模式的 current workspace 记录使用 `workspace_ref: current`、`branch: parent_branch` 和 direct-parent integration。
- [ ] 实现执行者 若被派遣，Packet 绑定唯一 Ticket workspace 或 current workspace/checkpoint；任务执行者 不写 SpecDev 状态。
- [ ] current 模式 source 检查在 current workspace 且不宣称 E2E；required 模式 source 检查明确为非 E2E，required E2E 有 parent-candidate 场景与预期。
- [ ] 验证命令/环境可用，关键静默失败风险有受控反向验证。
- [ ] Deep Ticket 批准点已满足。
- [ ] 若属于父 Implementation Map：父 revision 与 Plan source revision 一致，组合 Ticket 在 tasks/frontier 中，dependency Gate 已满足，serialization lock 可用，派单未重复，workspace 策略一致，全部成员 active implementation 数未超过父上限。

## Direct Spec 硬检查

- [ ] 用户已授权按当前规格实现；独立 Spec 已就绪（ready_for_tickets=true），目标、行为、风险门与验收完整；README 替代规格时仍满足轻量边界。不要求单一行为或低风险，确需独立调度/依赖 DAG 才拆票。
- [ ] current 工作副本只有一个代码 writer（Lead 或获派执行者）；required 以整个 change 为单元，真实 workspace、Lead/实现/integration owner 及路径唯一。SpecDev 正式工件只由 Lead 写入。
- [ ] 目标、IN/OUT、可写范围、不变量、验证与验收完整。
- [ ] Direct Spec 涉及 UI 时读取批准 DESIGN 并冻结版本、页面/状态与原型摘要；无 UI 不要求此项。
- [ ] 实施前 Git checkpoint、dirty 状态和现有用户改动已记录，不覆盖无关改动。
- [ ] 已读取命中的项目 Skill；非 E2E、适用回归与 E2E 环境可执行，E2E owner 为 Lead。required 的 source 只运行非 E2E，候选检查在 parent-candidate。
- [ ] implementation commit 授权状态明确；current 未授权时不提交，在原 Evidence 记录交付状态；required 创建前必须有实现 commit 和 local candidate integration/父分支更新授权。

- [ ] required 的 Direct Spec Execution Record 使用 purpose/change 身份、真实 source/candidate locator 和正整数 integration_attempt_limit；恢复时原记录与 Git 一致，不存在未处置 Ticket 执行。

## 失效分类

- **stale-navigation**：导航过时但契约仍有效；更新导航继续。
- **local-implementation**：局部实现调整不改变契约；记录后继续。
- **ticket-invalid**：范围、接口、依赖、验证或路径合同失效；停止并修 Ticket。
- **map-context-stale**：总体实施背景、项目 Skill 矩阵、Ticket 覆盖或 Skill 路径失效；停止项目写入并返回 T-tickets 更新 Map。
- **design-invalid / design-drift**：UI 批准缺失、revision/digest/原型/基线不一致或页面合同失效；停止受影响实现并返回 P-prototype，不能由 I 改写 DESIGN 消除偏差。
- **spec-invalid / adr-conflict**：返回对应上游 owner。
- **checkpoint-drift**：current/来源/父分支/派单 checkpoint 漂移；由 Lead 重建执行记录或 required 模式的 worktree/candidate。
- **workspace-contract-invalid**：缺少父分支、owner、locator、implementation/source/适用 result 字段或授权；停止并修状态/计划。
- **workspace-strategy-invalid**：Goal Plan 的 workspace/integration 组合非法，或 current 模式出现并发 implementation writer；停止并修状态/计划。
- **delivery-unverified**：候选、provider 声明或附件不能独立核对；保持 unverified。
- **e2e-owner-invalid**：required 模式 E2E 被安排在 source worktree，或任一模式不是 Lead owner；停止并修 Ticket/Goal Plan。
- **direct-parent-invalid**：current 模式的 Ticket commit、父 HEAD、验证或 Evidence 不一致；保留最后可信 commit 并阻塞当前 Ticket。
- **parent-plan-stale**：父 Implementation Map revision、成员 Ticket、serialization、workspace 策略、全局实现配额或 repository/ref 已变化；停止当前派单并返回 P-goal-plan 重算。

## 验证范围与失败保证

冻结本票真实消费者、配置/构建入口、适用文档与验证命令；不把 DSH 命令当项目事实。只复用输入和环境仍有效的证据；失败副作用未知时按 <Path>{roots.workflows}/specdev/common/rules/error-handling.md</Path> 暂停依赖工作，恢复前沿原 owner 核实，不重放未决动作。
