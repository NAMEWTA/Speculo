# 创建或恢复 Ticket Worktree

## 前置

- Ticket `ready: true`，依赖完成，写路径无冲突。
- `<Path>{roots.state}/specdev/config.json</Path>` 中 `git.worktree_for_parallel: true`。
- Lead 已固定所有并行 Ticket 共用的 `base_sha`。

## 创建

1. 从 Speculo 工作区声明的 `path_base: project-root` 解析 `<project-root>`。若记录的 provider 为 `git`，要求 `workspace_ref` 精确为 `specdev-worktree/<ticket-id>`，拼接后仍位于 project root，且 `specdev-worktree/` 不是逃逸到外部的符号链接。
2. 若 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `worktrees` 已有该 Ticket 的 `active` 或 `review` 记录：Git provider 必须在 `git worktree list --porcelain` 中匹配固定路径、分支与 `base_sha`；native/external 由对应 provider 解析 opaque locator。一致则恢复，任一不一致停止。
3. 否则优先调用平台原生 worktree 能力。使用 native/external 时保存 provider 返回的可迁移 locator；不可用时进入 Git fallback。
4. Git fallback 前确认项目根 `.gitignore` 已包含 `specdev-worktree/` 或等价根模式。缺失时停止并提示重新运行当前版本 `speculo init`，不在本 Skill 内修改 `.gitignore`。
5. Git fallback 固定 `physical_path = <project-root>/specdev-worktree/<ticket-id>`、`workspace_ref = specdev-worktree/<ticket-id>`，从 `base_sha` 执行 `git worktree add -b <ticket-branch> <physical-path> <base-sha>`。已存在但未与同一记录和 Git 注册匹配的目标路径一律阻塞。
6. 分支使用 `speculo/<change>/<ticket-id>`；现有分支未能匹配记录时停止。
7. 安装项目所需依赖，运行最小基线检查。E2E 不属于 Worker 基线。
8. 写入 `worktrees`：

```json
{
  "ticket_id": "T-01",
  "owner": "<worker>",
  "provider": "git",
  "base_sha": "<sha>",
  "branch": "speculo/<change>/T-01",
  "workspace_ref": "specdev-worktree/T-01",
  "status": "active",
  "updated_at": "<ISO-8601>"
}
```

native/external provider 将示例中的 provider 与 `workspace_ref` 换为对应可迁移 locator，不套用 Git 物理路径。

完成条件：工作区可定位、基线可用、状态记录与实际 provider、分支和 checkpoint 一致；Git provider 的引用与 Ticket ID 完全一致。失败时设为 `blocked` 并保留现场。
