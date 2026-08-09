## Isolated Workspace Addendum

只在 `workspace_strategy: worktree` 或 `workspace_strategy: mixed` 时加入。它独立于 Agent Team：单会话和 Lead Team 都可加载本附录。

### Workspace Decision

| 字段 | 值 |
|---|---|
| Strategy | worktree / mixed |
| Trigger | parallel-write / protect-local-state / disposable-experiment / background-resume / provider-requirement / user-requested |
| Current-workspace writer | `<primary-session-or-lead>` |
| Integration serialization | 每次只允许一个 integration owner 修改目标父分支 |

### Per-Ticket Workspace Allocation

| Ticket | Trigger and evidence | Implementation owner | Integration owner | Provider | Base SHA | Parent branch | Branch / workspace ref | Terminal action |
|---|---|---|---|---|---|---|---|---|
| T-01 | `<allowed-trigger>: <observed-fact>` | `<owner>` | `<owner>` | git / native / external | `<immutable-sha>` | `<parent-branch>` | `<branch>` / `<portable-locator>` | integrate / retain |

### Local Integration Authorization

`terminal_action=integrate` 持久授权 integration owner 执行本 Ticket 的本地 fast-forward，或在分叉时完成 `git add`、`git merge --continue` 和一次集成专用 merge commit。普通实现提交、push、PR、远端 merge、部署、迁移以及删除 branch/worktree 不从该授权继承。

来源 checkpoint、路径审计和验证通过后才可从 `review` 进入 `integrating`。集成成功写入 result SHA 与 Evidence；失败时中止正在进行的 merge、保留来源 workspace，并记录 blocker 和恢复条件。
