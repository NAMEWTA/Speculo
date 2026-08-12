# Candidate Merge And Parent Integration

仅由 Lead/integration owner 对状态为 `review` 的 Ticket 调用。

## 1. 接收 source checkpoint

1. 核对 Ticket、Goal Plan、Evidence 目标、owner 与本地 integration 授权；
2. 验证来源 worktree clean，branch tip 精确等于 `source_checkpoint`，commit 从 `base_sha` 可达；
3. 审计实际 diff 未越过 writable/shared owner 合同；
4. 确认 source-worktree 必跑非 E2E 检查已执行，且没有把 E2E 自报为通过；
5. 重读父分支 checkout clean、HEAD 与 remote/本地约定，记录 `parent_before_sha`。

失败时保持 `review`/`blocked`，不开始候选合并。

## 2. 建立 parent-candidate checkout

1. 使用 branch `speculo/integration/<change>/<ticket-id>` 和 locator `specdev-worktree/.integration/<ticket-id>`，从最新 `parent_before_sha` 建立 Lead-owned integration worktree；
2. 如果父 SHA 是 source checkpoint 的祖先，在 candidate checkout 执行 `git merge --ff-only <source_checkpoint>`，`method=fast-forward`；
3. 否则执行 `git merge --no-ff --no-commit <source_checkpoint>`；
4. 冲突按 `<Path>{roots.workflows}/specdev/I-implement/merge-conflict-protocol.md</Path>` 处理。需要新产品决定时执行 `git merge --abort`，记录 blocker 并返回来源 worktree；
5. 对分叉结果创建一次 Lead-owned candidate merge commit，`method=merge-commit`；
6. 记录 candidate branch/locator、`candidate_sha`、`source_sha`、冲突路径与 attempts，worktree 状态改为 `integrating`、integration 状态改为 `candidate`。

重试前从最新父分支重建 candidate branch/worktree；旧 candidate SHA 保存在 Evidence。候选生命周期的重建/回收包含在 local candidate integration 授权中。

## 3. 在候选父状态验证

在 candidate checkout 运行：

- Ticket 受影响集成与回归；
- 项目要求的 typecheck/lint/build 或其他父状态检查；
- 仅当 Ticket/Goal Plan `e2e.required=true` 时运行对应 E2E。

每条命令记录运行环境 `parent-candidate`、退出码与摘要。E2E required 未运行或失败时 integration `verification=failed`、`status=failed`；父分支保持 `parent_before_sha`。机械修正次数不得超过 Goal Plan 快照的 `integration_attempt_limit`；不得放宽断言、删除检查或发明行为。

## 4. 推进父分支

全部 required 检查通过后：

1. 重读父分支 HEAD；不等于 `parent_before_sha` 时将 candidate 标记 `stale`，不推进父分支并从步骤 2 重建；
2. 在父分支 checkout 执行 `git merge --ff-only <candidate_sha>`；候选 merge commit 本身已以父 SHA 为第一祖先，因此不再创建第二个 merge commit；
3. 重读父 HEAD、tree 与 ancestor 关系，确认 HEAD 精确等于 candidate SHA 且包含 source checkpoint；
4. 写入 `result_sha=candidate_sha`、`verification=passed`、E2E 最终状态和 Evidence；
5. integration/status 改为 `passed`/`integrated`，再由 Lead 标记 Ticket Done。

## 5. 失败、清理与恢复

- candidate 检查失败：父分支不动，Ticket 回 `in_progress` 或 `blocked`，来源 worktree 保留；
- 父 HEAD 漂移：旧 candidate 记 `stale`，完整重建并重跑；
- 成功后可按 candidate integration 授权回收 transient integration worktree/branch；来源 branch/worktree 不自动清理。获得独立 cleanup 授权并清理后，只将生命周期状态改为 `removed`，完整保留已经通过的集成与 E2E 证据；
- push、PR、remote merge、deploy、migration 和生产动作仍需各自授权。

**完成标准**：passed 时父 HEAD=result/candidate SHA 且包含 source commit；failed/stale 时父 HEAD 仍为开始该轮记录的父状态或更新后的外部事实，没有本轮候选污染。
