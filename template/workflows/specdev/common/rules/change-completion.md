# Change Completion

本规则是 change 从 active/blocked 转为 completed 的唯一合同。

## 完成门

一个 change 只有同时满足以下条件才能 completed：

1. 所有计划内 Ticket 为 done，或因权威事实无需改动而记录为 cancelled；Direct Spec/非实现流程有等价验收。
2. required Ticket 有 source commit、passed candidate、父分支 result SHA，且父分支包含 source commit；current Ticket 有 implementation commit、passed direct-parent 验证和父分支 result SHA；对应 workspace 记录均为完成状态。
3. 每个行为有 Lead Evidence，全部 Spec 合同与 Goal Gate 可定位。
4. current Ticket 的 current-workspace 检查/回归和适用 E2E，或 required Ticket 的 source-worktree 非 E2E 检查、parent-candidate 集成/回归和 required E2E 已通过；not-required 有理由。
5. 迁移、发布、监控、恢复和不可逆批准已完成或明确不适用。
6. 没有未批准 deviation、blocker、unverified、活动 candidate 或未集成 source checkpoint。
7. Ticket、Map、Goal Plan、Evidence、change status 与实际 Git 一致。

Evidence-only Done 和 empty commit 不满足完成门。

父实现 change 还必须满足 `<Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path>`：全部成员 completed，Implementation Map 与 Implementation Plan completed 且 revision 一致，跨 change 全套验证通过，`<Path>{roots.state}/specdev/changes/{change}/evidence/implementation-orchestration.md</Path>` 完整，没有活动派单、candidate、serialization lock 或未裁决冲突。父完成不自动归档或移动任何成员。

## 转换 Owner

- 有 Goal Plan：其唯一 Lead 在关闭最后 Gate 后拥有转换；
- 无 Goal Plan 的 Ticket/Direct Spec：当前 I-implement 主会话 owner 拥有转换；
- 非实现型终点：最终验收工件 owner 使用本规则。
- 父实现 change：Implementation Plan 的唯一 Lead 在全部成员与 aggregate gate 关闭后拥有转换。

Owner 原子更新 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `change_status`、`completed_at`、`updated_at` 和 `current_work`，然后重读。全局 status 只维护 active/archived 索引。

## 远程来源与归档

远程动作不参与本地完成判定。Triage 为 `pending-close`/`close-failed` 时先 reconcile；`closed`、`waived` 或 `not-applicable` 才允许 Archive。归档后工件只读。

**完成标准**：完成声明可由本地工件、Git 与验证重建；只有一个 owner 命中；失败 candidate 不污染父分支。
