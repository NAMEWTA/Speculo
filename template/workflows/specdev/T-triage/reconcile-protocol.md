# Reconcile Protocol

仅在 Triage `mode=reconcile` 时加载。目标是把本地完成结果最小化投影到来源 Issue，并关闭它。

## 1. 本地完成硬门

按 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>` 重验：change 为 completed、全部计划内 Ticket 已完成或批准取消、Evidence 与 Gate 齐全、验证通过、无未批准 deviation。任一项失败时停止，不准备远程写入。

`<Path>{roots.state}/specdev/changes/{change}/source.md</Path>` 必须指向仍可定位的 open GitHub Issue，且 `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>` 的 `external_action` 为 `pending-close` 或 `close-failed`。其他来源使用 `not-applicable`。

## 2. 准备关闭计划

从本地 Evidence 生成简短评论：完成结果、关键验证、可公开的 commit/PR URL、残余风险或后续工作。不得发布 state Path、机器路径、秘密、内部日志或未核对声明。

向用户展示准确 repo、Issue 编号、评论全文、close reason 和将执行的动作。只有本次明确确认后才继续；拒绝或暂不执行时零远程写入。用户明确放弃关闭可将状态置为 `waived`。

## 3. 幂等执行

调用 `<Path>{roots.skills}/github-npm-ops/SKILL.md</Path>` 的 `issue-comment-close`，marker 固定为 `specdev:<change>:completion`。执行前重读 Issue 与评论：

- 已关闭且 marker 存在：按已完成恢复；
- marker 存在但 Issue 仍 open：只重试 close；
- marker 不存在：评论成功后再 close；
- 任一步失败：记录已完成步骤、错误和下一重试动作，状态为 `close-failed`。

成功后重读远程状态，只有观察到 closed 才写 `external_action: closed`。

## 完成标准

- 本地完成先于远程动作；
- 用户看见并批准了准确写入计划；
- 重试不会重复评论；
- 外部失败不改写本地完成事实；
- closed、close-failed 或 waived 与证据一致。
