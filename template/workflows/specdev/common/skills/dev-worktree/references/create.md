# 创建或恢复 Ticket Worktree

## 前置

- Ticket `ready: true`，依赖完成，写路径无冲突。
- `<Path>{roots.state}/specdev/config.json</Path>` 中 `git.worktree_for_parallel: true`。
- Lead 已固定所有并行 Ticket 共用的 `base_sha`。

## 创建

1. 若 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `worktrees` 已有该 Ticket 的 `active` 或 `review` 记录，解析 `workspace_ref` 并验证分支、`base_sha` 和工作区状态；一致则恢复。
2. 否则优先调用平台原生 worktree 能力；不可用时从 `base_sha` 执行 `git worktree add -b <ticket-branch> <physical-path> <base-sha>`。物理路径必须位于主工作树之外。
3. 分支使用 `speculo/<change>/<ticket-id>`；现有分支或目标路径未能匹配记录时停止。
4. 安装项目所需依赖，运行最小基线检查。E2E 不属于 Worker 基线。
5. 写入 `worktrees`：

```json
{
  "ticket_id": "T-01",
  "owner": "<worker>",
  "provider": "native",
  "base_sha": "<sha>",
  "branch": "speculo/<change>/T-01",
  "workspace_ref": "<provider-opaque-or-project-relative-ref>",
  "status": "active",
  "updated_at": "<ISO-8601>"
}
```

完成条件：工作区可定位、基线可用、状态记录与实际分支一致。失败时设为 `blocked` 并保留现场。
