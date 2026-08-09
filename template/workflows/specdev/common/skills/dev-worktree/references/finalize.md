# 集成与清理工作项 Worktree

## 集成

仅生产 Ticket 进入本段；一次性原型不得合入生产分支。

1. integration owner 确认记录为 `review`、`terminal_action=integrate`，读取 implementation owner 的 Evidence，并验证实际修改未越过 writable/shared owner 合同。`source_checkpoint` 必须是不可变 commit，且与记录 branch 当前 tip 一致、从 `base_sha` 可达。
2. 确认目标 checkout 正位于 `parent_branch`、index 与项目 working tree 干净，并把当前 HEAD 固定为 `parent_before_sha`。目标不干净、父分支不匹配、其他记录已在同一父分支 `integrating` 或 HEAD 在集成期间变化时停止，不覆盖用户工作。
3. 将记录原子更新为 `integrating`，设置 `integration.status=running`、`parent_before_sha`、`source_sha` 并递增 `attempts`。中断恢复时先核对记录、Git `MERGE_HEAD` 和当前 HEAD，不重复开始第二次集成。
4. 恢复已有 `integrating` 记录时只进入一个分支：HEAD 仍等于 `parent_before_sha` 且没有 `MERGE_HEAD` 时恢复同一次尝试；HEAD 已等于 `source_checkpoint`、没有 `MERGE_HEAD` 且 `parent_before_sha` 可达来源时，将其视为已完成但尚未落状态的 fast-forward；`MERGE_HEAD` 等于 `source_checkpoint` 时恢复未完成 merge。其他 HEAD、来源或 merge 状态漂移一律设为 `blocked`，不修改 Git 现场。
5. 若 `parent_before_sha` 是 `source_checkpoint` 的祖先，先在来源 workspace 运行 Ticket 定向验证、受影响回归、项目 typecheck/lint/build 和适用最小 E2E，再从目标 checkout 执行 `git merge --ff-only <source_checkpoint>`。重读目标 HEAD、tree 和 Evidence，确认 HEAD 精确等于 `source_checkpoint` 后，记录 `method=fast-forward`、`result_sha=source_checkpoint`、空 `conflict_paths`、验证命令与结果、`verification=passed`、Evidence 和 `integration.status=passed`，再把 worktree 状态更新为 `integrated`。这是 fast-forward 的终态，不继续执行 merge-commit 步骤。
6. 若双方已分叉，从干净目标 checkout 执行 `git merge --no-ff --no-commit <source_checkpoint>`。出现冲突时加载 `<Path>{roots.workflows}/specdev/I-implement/merge-conflict-protocol.md</Path>`，并将本记录作为持久授权来源；不为 `git add`、继续 merge 或集成提交重复请求确认。
7. 在未提交的合并结果上运行 Ticket 定向验证、受影响回归、项目 typecheck/lint/build 和适用最小 E2E。可由既有意图机械修正的失败最多处理 3 轮；不得放宽断言、删除检查或引入未批准行为。
8. 验证通过后完成一次集成专用 merge commit，重读 HEAD、parents、tree、diff 和 Evidence，确认父分支为第一 parent、`source_checkpoint` 为第二 parent，记录 `method=merge-commit`、`result_sha`、conflict paths、`verification=passed`、Evidence 与 `integration.status=passed`，再把 worktree 状态更新为 `integrated`。
9. 冲突需要新产品/架构/安全/迁移决定、修改越过授权路径、验证无法通过、目标状态漂移或提交 hook 无法安全完成时，执行 `git merge --abort`（仅限本流程从干净目标开始的 merge），设置 worktree 与 integration 为 `blocked`，记录最小失败、已通过行为和恢复条件，并保留来源 worktree。

Fast-forward 路径的 `result_sha` 等于 `source_checkpoint`；merge-commit 路径必须保持父分支为第一 parent、来源 checkpoint 为第二 parent。任何成功结果都必须能从记录和 Evidence 复核。

## 清理

1. 取得用户对删除 worktree 和分支的授权。
2. Git provider 从 project root 解析 `specdev-worktree/<work-item-id>`，重验无路径逃逸且与 `git worktree list --porcelain` 的记录一致，再从主工作树移除；native/external 通过对应 provider 管理入口移除。
3. 确认 worktree 不再注册且工作项目录不存在后删除对应分支。Ticket 将状态更新为 `removed`；原型把 `cleanup_status` 更新为 `clean`。保留项目根 `specdev-worktree/` 统一目录及 `.gitignore` 条目。

PR、`terminal_action=retain` 或暂缓集成时保留 worktree。成功集成也不自动清理。清理失败时停止；仅在用户明确要求时使用强制删除。
