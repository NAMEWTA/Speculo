# Implementation Input Readiness

## 创建前硬门

对每个用户指定成员穷尽检查：

1. change 位于 active namespace，状态不是 archived，且没有另一个未完成父实现 owner；
2. Ready Spec 使用当前 schema，`status: ready` 且 `ready_for_tickets: true`；
3. Tickets Map 使用当前 schema，状态为 ready、in_progress 或 completed；
4. Ticket 目录非空，Ticket ID/文件名唯一，全部内部 dependency 可解析且无环；
5. 每个非终态 Ticket 决策完备、`ready: true`、路径/验证/验收完整，状态为 ready；
6. done Ticket 有 Evidence 与完成 workspace 记录，cancelled Ticket 有权威理由；
7. Spec 合同全部 covered 或有用户批准的 deferred；
8. 没有未裁决的行为、接口、数据、兼容、安全、范围、迁移或验收问题；
9. 当前代码与 Ticket 的入口、路径和验证接缝没有已知漂移。

任一成员失败时，返回按 change 分组的缺口和真正 owning Work，不创建父目录、全局 active entry、Map 或 Plan。父 Work 不调用这些 owning Works。

## 恢复状态

父 change 创建后，Ticket 可以进入 in_progress、review、done、cancelled，或因执行事实进入 blocked/deviated。blocked/deviated 必须让父 Plan 同步为 blocked 并记录恢复 owner；这不是放宽创建前 Ready 门。

## 已完成成员

全部 Ticket 已 done/cancelled 且 change 已 completed 的成员可以作为 satisfied baseline，参与 dependency 判断但不进入 frontier或占用 agent 配额。用户只选择已完成成员且没有待实现 Ticket 时停止，因为不存在实现编排目标。
