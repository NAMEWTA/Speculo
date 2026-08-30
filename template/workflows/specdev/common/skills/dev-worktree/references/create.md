# Create Or Restore Worktree

## Ticket 前置条件

- Ticket Ready，项目根是有效 Git repository，父分支和 `base_sha` 可解析；
- implementation commit 与 local candidate integration/父分支更新已授权；
- workspace、implementation、integration owner 唯一；integration owner 必须为 Lead；
- `specdev-worktree/` 已由 Speculo init 加入项目 `.gitignore`；
- 目标 branch/worktree 不覆盖现有用户 workspace，路径合同无冲突。

## 创建 Ticket 来源 worktree

1. 重读父分支 HEAD、工作树、现有 worktrees 与 refs；父 HEAD 与计划基线不一致时由 Lead决定更新 `base_sha` 或阻塞；
2. 固定 branch `speculo/<change>/<ticket-id>` 与 locator `specdev-worktree/<ticket-id>`；
3. 确认目标 branch/path 不存在，或其实际记录精确匹配当前 Ticket；
4. 从 `base_sha` 创建 Git worktree，不复用其他 Ticket 目录；
5. 在来源 worktree 读取项目 Agent 指令、依赖、构建与路径合同；
6. 安装实际需要的依赖，运行最小非 E2E 基线；
7. Lead 写入 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`，状态为 `active`。

初始记录：

```json
{
  "ticket_id": "T-01",
  "owner": "lead",
  "implementation_owner": "lead-or-dynamic-agent",
  "integration_owner": "lead",
  "provider": "git",
  "base_sha": "<immutable-sha>",
  "parent_branch": "<parent-branch>",
  "branch": "speculo/<change>/T-01",
  "workspace_ref": "specdev-worktree/T-01",
  "source_checkpoint": null,
  "integration": {
    "status": "pending",
    "parent_before_sha": null,
    "source_sha": null,
    "candidate_sha": null,
    "candidate_branch": null,
    "candidate_workspace_ref": null,
    "result_sha": null,
    "method": null,
    "conflict_paths": [],
    "verification": "pending",
    "e2e": {"required": false, "status": "not-required", "evidence": null},
    "evidence": "<Path>{roots.state}/specdev/changes/<change>/evidence/T-01.md</Path>",
    "attempts": 0
  },
  "status": "active",
  "updated_at": "<ISO-8601>"
}
```

`e2e.required` 与 Ticket/Goal Plan disposition 一致；required 时初始 status 为 `pending`。

## 恢复

恢复时核对 repository、branch、locator、`base_sha`、实际 HEAD、dirty 状态和 owner。状态记录与 Git 不一致、branch 被其他 worktree 占用或出现越界修改时停止；Lead 写 blocker，不重建覆盖。

进入 `review` 前必须由 implementation owner 创建最终 commit；Lead 重读 branch tip、diff 与 `git status`，把精确 SHA 写入 `source_checkpoint`。

**完成标准**：来源 worktree 可定位且唯一；基线、记录与 Git 一致；source 检查不含 E2E；失败时保留现场。
