# 集成与清理工作项 Worktree

## 集成

仅生产 Ticket 进入本段；一次性原型不得合入生产分支。

1. workspace owner 确认记录为 `review`，读取 implementation owner 的 Evidence，实际修改未越过路径契约。
2. 在目标集成基线上应用变更并运行受影响的定向与回归验证。
3. 仅当变更影响用户界面交互时，由当前集成 owner 运行验收所需的最小 E2E；委派执行中 implementation owner 只提供场景和预期结果，Lead 负责运行。
4. 验证通过后将记录更新为 `integrated`；冲突或失败时设为 `blocked` 并保留 worktree。

## 清理

1. 取得用户对删除 worktree 和分支的授权。
2. Git provider 从 project root 解析 `specdev-worktree/<work-item-id>`，重验无路径逃逸且与 `git worktree list --porcelain` 的记录一致，再从主工作树移除；native/external 通过对应 provider 管理入口移除。
3. 确认 worktree 不再注册且工作项目录不存在后删除对应分支。Ticket 将状态更新为 `removed`；原型把 `cleanup_status` 更新为 `clean`。保留项目根 `specdev-worktree/` 统一目录及 `.gitignore` 条目。

PR 或暂缓集成时保留 worktree。清理失败时停止；仅在用户明确要求时使用强制删除。
