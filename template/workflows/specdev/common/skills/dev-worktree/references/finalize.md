# 集成与清理 Ticket Worktree

## Lead 集成

1. 确认记录为 `review`，读取 Worker Evidence，实际修改未越过路径契约。
2. 在目标集成基线上应用变更并运行受影响的定向与回归验证。
3. 仅当变更影响用户界面交互时，由 Lead 运行验收所需的最小 E2E；Worker 只提供场景和预期结果。
4. 验证通过后将记录更新为 `integrated`；冲突或失败时设为 `blocked` 并保留 worktree。

## 清理

1. 取得用户对删除 worktree 和分支的授权。
2. 从主工作树或平台管理入口移除已集成 worktree。
3. 确认 worktree 不再注册后删除对应分支，并将状态更新为 `removed`。

PR 或暂缓集成时保留 worktree。清理失败时停止；仅在用户明确要求时使用强制删除。
