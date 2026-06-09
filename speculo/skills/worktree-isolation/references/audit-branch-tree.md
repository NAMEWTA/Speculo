# 审查 change 分支树

worktree 模式下，review 必须覆盖 change 分支相对 base 的**全部 commit**，而不只是工作区 diff。调用方：`dev/R` review 的 setup 阶段。

## 输入

- change 的 `.status.json`：`base_branch`、`change_branch`、`worktree_status`
- 当前 git 仓库

## 步骤

1. 读取 `base_branch` 与 `change_branch`。worktree 模式下 fixed point 默认取 `base_branch`，无需另问用户（用户另行指定时以用户为准）。
2. 列出分支树全部 commit：

   ```bash
   git log <base_branch>..<change_branch> --oneline
   ```

3. 取全量 diff 作为审查范围：

   ```bash
   git diff <base_branch>...<change_branch>
   ```

4. 按 commit 数与 diff 规模定分批策略；**每个 commit 都要纳入审查范围**，不得只看最新工作区状态。
5. 把 fixed point（= `base_branch`）、diff 命令、commit 列表交给调用方写入 `review_fixed_point`、`review_diff_command` 等字段。

## 边界

- 不替换用户显式指定的 fixed point。
- 不遗漏任何 commit；clean-review 声明须确认已覆盖 `base..change_branch` 全部 commit。
- 不自行选择持久化目录；审查字段由调用方写入 `.speculo/<cat>/<change>/.status.json`。
