# Change Completion

本规则是 change 从 active/blocked 转为 completed 的唯一合同，并由 Implement、Goal Plan、Triage、Status 与 Archive 共同读取。

## 完成门

一个 change 只有同时满足以下条件才能设置 `change_status: completed`：

1. 所有计划内 Ticket 为 `done`，或有明确批准理由的 `cancelled`；无 Ticket 的 Direct Spec/非实现流程有等价的验收清单。
2. 每个完成行为有 Evidence，全部 Spec 验收合同和适用 Goal Gate 可定位。
3. 项目级验证通过；既有或环境失败已分类、接受并记录风险。
4. 迁移、发布、监控、回滚和不可逆批准已完成或明确不适用。
5. 没有未批准 deviation、未处置 blocker 或伪装成通过的 `unverified` 声明。
6. Ticket、Map、Goal Plan、Evidence、源码 checkpoint 和 change 状态一致。

## 转换 Owner

- Goal Plan 含完整 `## Delegated Execution Addendum`：Lead 在独立验收并关闭最后一个 Gate 后拥有完成转换。
- Goal Plan 不含委派附录，或无 Goal Plan 的 Ticket/Direct Spec 实现：最后一个计划内 Implement 在最后一项验收通过后拥有完成转换。
- 非实现型终点：最后一个拥有最终验收工件的 Work 使用本规则完成转换。

Owner 原子更新 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `change_status`、`completed_at`、`updated_at` 和 `current_work`，然后重读验证。全局 `<Path>{roots.state}/specdev/status.json</Path>` 继续只保存 active 索引，不复制完成详情。

## 远程来源与归档

远程动作不参与本地完成判定。完成后若 `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>` 的 `external_action` 为 `pending-close` 或 `close-failed`，下一路线是 Triage reconcile；`closed`、`waived` 或 `not-applicable` 才允许 Archive 移动 change。归档后工件只读，不在归档目录补写远程结果。

## 完成标准

- 完成声明可以从本地工件和实际验证重建；
- 当前 change 只有一个条件命中的转换 owner；
- 远程失败不会把 completed 改回 active；
- Archive 不接收尚未 reconcile 或 waive 的远程来源。
