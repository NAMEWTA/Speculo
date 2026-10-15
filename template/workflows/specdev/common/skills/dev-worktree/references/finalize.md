# Candidate Merge And Parent Integration

仅由 Lead/integration owner 对处于 review 的 Ticket 或 Direct Spec 执行单元调用。Ticket 状态来自原票；Direct Spec 状态来自原 Evidence 的 Workspace Execution Record。unit-id 为真实 Ticket ID 或 direct-spec。

## 1. 接收 source checkpoint

1. 核对获批 Spec/Ready Ticket、实际存在的计划、Evidence 目标、owner 与本地 integration 授权；
2. 验证来源 worktree clean，branch tip 精确等于 `source_checkpoint`，commit 从 `base_sha` 可达；
3. 审计实际 diff 未越过 writable/shared owner 合同；
4. 确认 source-worktree 必跑非 E2E 检查已执行，且没有把 E2E 自报为通过；
5. 重读父分支 checkout clean、HEAD 与 remote/本地约定，记录 `parent_before_sha`。

建立新 candidate 前先比较原记录 `attempts` 与有效 Plan 或无 Goal 执行合同的 `integration_attempt_limit`。若前一轮尚未通过且当前 attempts 已达到上限，不创建或重建 candidate、不增加 attempts；保留 source workspace、旧 candidate 与失败记录，将执行记录及已有 Ticket 标为 `blocked`，向有效 Lead 返回 `integration-attempt-limit`。

其他预检失败时保持 `review`/`blocked`，不开始候选合并。

## 2. 建立 parent-candidate checkout

1. 使用 branch `speculo/integration/<change>/<unit-id>` 和 locator `specdev-worktree/.integration/<change>/<unit-id>`，从最新 `parent_before_sha` 建立 Lead-owned integration worktree；
2. 如果父 SHA 是 source checkpoint 的祖先，在 candidate checkout 执行 `git merge --ff-only <source_checkpoint>`，`method=fast-forward`；
3. 否则执行 `git merge --no-ff --no-commit <source_checkpoint>`；
4. 冲突按 `<Path>{roots.workflows}/specdev/specdev-i-implement/references/merge-conflict-protocol.md</Path>` 处理。需要新产品决定时执行 `git merge --abort`，记录 blocker 并返回来源 worktree；
5. 对分叉结果创建一次 Lead-owned candidate merge commit，`method=merge-commit`；
6. 记录 candidate branch/locator、`candidate_sha`、实际 Git tree SHA `candidate_tree_sha`、`source_sha`、冲突路径与 attempts，worktree 状态改为 `integrating`、integration 状态改为 `candidate`。

重试前从最新父分支重建 candidate branch/worktree；旧 candidate SHA 保存在 Evidence。候选生命周期的重建/回收包含在 local candidate integration 授权中。

## 3. 在候选父状态验证

在 candidate checkout 运行：

- 当前实现单元受影响集成与回归；
- 项目要求的 typecheck/lint/build 或其他父状态检查；
- 仅当 Spec/Ticket/有效执行合同 `e2e.required=true` 时运行对应 E2E。

每条命令记录运行环境 `parent-candidate`、退出码与摘要。E2E required 未运行或失败时 integration `verification=failed`、`status=failed`；父分支保持 `parent_before_sha`。当本轮失败使 attempts 达到有效执行合同的 `integration_attempt_limit` 时，保存本轮失败并返回 Lead 复盘；不得继续机械修正、放宽断言、删除检查或发明行为。上限是 Lead 复盘触发点，不是永久禁止恢复。

候选的代码、规范或相关配置与已审输入不同，尤其发生合并或冲突修正时，按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/review-evidence.md</Path> 在此实际 candidate 上完成独立双轴审查。修正合并冲突的 Lead/Agent 也属于实现者；两轴通过前不得推进。完全相同的输入沿原证据复用门核对，不以 source 检查代替 candidate 审查。

## 4. 推进父分支

全部 required 检查通过后：

1. 重读父分支 HEAD；不等于 `parent_before_sha` 时将 candidate 标记 `stale`，不推进父分支并从步骤 2 重建；
2. 在父分支 checkout 执行 `git merge --ff-only <candidate_sha>`；候选 merge commit 本身已以父 SHA 为第一祖先，因此不再创建第二个 merge commit；
3. 重读父 HEAD、tree 与 ancestor 关系，确认 HEAD 精确等于 candidate SHA 且包含 source checkpoint；
4. 写入 `result_sha=candidate_sha`、`verification=passed`、full_suite/E2E 最终状态、`promotion_status=applied` 和 Evidence；
5. integration/status 改为 `passed`/`integrated`，再由 Lead 标记 Ticket Done 或在 Direct Spec 全部 AC 通过后完成 change。

## 5. 失败、清理与恢复

- candidate 检查失败：父分支不动，已有 Ticket 回 `in_progress` 或 `blocked`，来源 worktree 保留；
- 达到 integration attempt 上限：保留全部 source/candidate checkpoint 与失败记录，等待 Lead 在原 Evidence 写明共同失败模式、最可能原因、下一轮改变和下一 owner/路由；只有形成有实质变化的新 Dispatch Packet 后，Lead 才可将当前执行记录 `attempts` 重置为 `0` 并重新进入 finalize；
- 父 HEAD 漂移：旧 candidate 记 `stale`，完整重建并重跑；
- 成功后可按 candidate integration 授权回收 transient integration worktree/branch；来源 branch/worktree 不自动清理。获得独立 cleanup 授权并清理后，只将生命周期状态改为 `removed`，完整保留已经通过的集成与 E2E 证据；
- push、PR、remote merge、deploy、migration 和生产动作仍需各自授权。

**完成标准**：passed 时父 HEAD=result/candidate SHA 且包含 source commit；failed/stale 时父 HEAD 仍为开始该轮记录的父状态或更新后的外部事实，没有本轮候选污染。
