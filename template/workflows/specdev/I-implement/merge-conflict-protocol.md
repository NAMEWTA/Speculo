# Merge / Rebase Conflict Protocol

只在 `git status` 证明仓库正处于 merge 或 rebase 冲突时加载。普通集成设计冲突继续按 deviation/upstream owner 处理。

## 流程

1. 读取 Git 状态、操作类型、冲突文件、base/ours/theirs commit、当前 Ticket/Evidence，以及是否存在匹配的 `terminal_action=integrate` worktree 记录。
2. 追溯双方意图：commit message、冻结的 source、Spec、Ticket、ADR、测试和调用者。二者缺失时不凭代码表面猜测产品行为。
3. 逐 conflict hunk 写出双方意图、共同约束和建议结果。只合并既有意图；需要发明新行为或改变上层合同则停止并登记 deviation。
4. 在获授权可写范围内解决文本，运行受影响测试、typecheck、lint 和项目要求的验证。能从既有权威唯一推导的冲突直接处理，不把“发生冲突”本身升级为人工确认。
5. 若当前 merge 来自匹配记录的本地集成，`terminal_action=integrate` 已授权 `git add`、继续 merge 和一次集成专用 commit；验证通过后直接完成，不逐动作请求确认。其他 merge/rebase 仍分别取得 Git 副作用授权；没有授权时保存分析、剩余文件和精确恢复命令。
6. 需要发明新产品行为、改变 Spec/ADR、安全/迁移决定、越过路径 owner 或无法保持双方既有意图时停止；由从干净目标开始的自动集成执行 `git merge --abort`，记录 blocker 并保留来源 worktree。普通冲突现场不擅自 abort。
7. 重读 Git 状态、parents 和 diff，确认无 marker、无未声明路径、双方要求及测试仍成立。

## 完成标准

- 每个 hunk 的结果可追溯到双方意图；
- 新产品决定没有藏在冲突解决中；
- 项目验证有命令、退出码和关键输出；
- Git 副作用来自逐动作授权，或来自可核对 worktree 记录中的持久本地集成授权；
- 完成或暂停状态可以从 Evidence 和 Git 状态恢复。
