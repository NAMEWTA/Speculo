# Execution Preflight

## Ticket 硬检查

- [ ] Ticket frontmatter 可解析，`ready: true`，`status: ready`。
- [ ] 所有 `blocked_by` Ticket 为 done 且 Evidence 存在。
- [ ] Spec、ADR、Ticket 与 Goal Plan 无冲突；旧 Goal Plan schema 必须重跑 P-goal-plan。
- [ ] Goal Plan（若存在）为 `lead-directed`，workspace/integration 策略为 `current/direct-parent` 或 `required/candidate-merge`，Lead 可恢复，implementation/integration 上限不超过 config 与平台能力。
- [ ] 当前代码入口、接口、路径和父分支仍与 Ticket 假设一致。
- [ ] writable/shared paths 有唯一 owner；current 模式的 Ticket 顺序已固定且没有其他 active implementation writer。
- [ ] implementation commit 与当前策略对应的 direct-parent 或 local candidate integration/父分支更新已授权；push/PR/remote/deploy 等保持独立。
- [ ] required 模式的 dev-worktree 记录 schema v6，`base_sha`、父分支、owners、branch、`workspace_ref`、integration 与 E2E disposition 完整；current 模式的 current workspace 记录使用 `workspace_ref: current`、`branch: parent_branch` 和 direct-parent integration。
- [ ] implementation subagent 若被派遣，Packet 绑定唯一 Ticket workspace 或 current workspace/checkpoint；subagent 不写 SpecDev 状态。
- [ ] current 模式 source 检查在 current workspace 且不宣称 E2E；required 模式 source 检查明确为非 E2E，required E2E 有 parent-candidate 场景与预期。
- [ ] 验证命令/环境可用，关键静默失败风险有受控反向验证。
- [ ] Deep Ticket 批准点已满足。
- [ ] 若属于父 Implementation Map：父 revision 与 Plan source revision 一致，组合 Ticket 在 tasks/frontier 中，dependency Gate 已满足，serialization lock 可用，派单未重复，workspace 策略一致，全部成员 active implementation 数未超过父上限。

## Direct Spec 硬检查

- [ ] 用户明确批准 Direct Spec；单一行为、局部、低风险、可逆且无需并行/Ticket DAG。
- [ ] current workspace 只有一个项目与 SpecDev 写入 owner。
- [ ] 目标、IN/OUT、可写范围、不变量、验证与验收完整。
- [ ] 实施前 Git checkpoint、dirty 状态和现有用户改动已记录，不覆盖无关改动。
- [ ] 非 E2E、适用回归与 E2E 验证环境可执行；E2E owner 固定为 Lead。
- [ ] implementation commit 授权状态明确；未授权时不提交，并在轻量合同与 Evidence 中记录交付状态。

## 失效分类

- **stale-navigation**：导航过时但契约仍有效；更新导航继续。
- **local-implementation**：局部实现调整不改变契约；记录后继续。
- **ticket-invalid**：范围、接口、依赖、验证或路径合同失效；停止并修 Ticket。
- **spec-invalid / adr-conflict**：返回对应上游 owner。
- **checkpoint-drift**：current/来源/父分支/派单 checkpoint 漂移；由 Lead 重建执行记录或 required 模式的 worktree/candidate。
- **workspace-contract-invalid**：缺少父分支、owner、locator、implementation/source/适用 result 字段或授权；停止并修状态/计划。
- **workspace-strategy-invalid**：Goal Plan 的 workspace/integration 组合非法，或 current 模式出现并发 implementation writer；停止并修状态/计划。
- **delivery-unverified**：候选、provider 声明或附件不能独立核对；保持 unverified。
- **e2e-owner-invalid**：required 模式 E2E 被安排在 source worktree，或任一模式不是 Lead owner；停止并修 Ticket/Goal Plan。
- **direct-parent-invalid**：current 模式的 Ticket commit、父 HEAD、验证或 Evidence 不一致；保留最后可信 commit 并阻塞当前 Ticket。
- **parent-plan-stale**：父 Implementation Map revision、成员 Ticket、serialization、workspace 策略、全局实现配额或 repository/ref 已变化；停止当前派单并返回 O-orchestrate-implementation 重算。
