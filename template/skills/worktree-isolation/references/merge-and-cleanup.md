# 合并回收与清理

archive-and-consolidate 验证通过后，把 change 分支合并回原分支并清理 worktree。由 `../../../commands/archive-and-consolidate.md` 在隔离模式下调用。**全程破坏性，须先列计划、经用户确认。**

## 前置

- `verification_status: verified`（未通过不得合并）
- change 的最终产物（`completion-verification.md`、`completion-summary.md` 等）已在 `change_branch` 上提交
- 读取 `base_branch`、`change_branch`、`worktree_path`

## 步骤

1. **列计划并确认**：展示将要合并的分支、目标 base、待删除的分支与工作树，等待用户明确确认。未确认只输出计划，不动手。
2. **合并回 base**：

   ```bash
   git switch <base_branch>
   git merge --no-ff speculo/<workflow>/<change>
   ```

   - 合并冲突 → **停止**，报告冲突文件，交回用户解决，不强推、不 `--force`。
   - 合并成功 → 置 `worktree_status: merged`。合并后 base 分支已包含代码与 `speculo/.speculo/<workflow>/changes/<change>/` 产物。
3. **清理工作树与分支**：

   ```bash
   git worktree remove .worktree/<change>
   git branch -d speculo/<workflow>/<change>
   ```

   - 完成后置 `worktree_status: removed`。
4. **移交归档**：清理后归档在 base 分支进行（change 目录已随合并到达 base），由调用方 `archive-and-consolidate` 的归档阶段执行。

## 失败处理

- 合并失败：保留 worktree 与分支，报告冲突，不清理。
- `git worktree remove` 失败（工作树有未提交改动）：报告并停止，不 `--force`，除非用户明确要求。
- 不回滚已成功的合并，除非用户明确要求。

## 边界

- `verification_status` 非 `verified` 不合并。
- 未获用户确认不执行任何合并 / 删除 / 移除。
- 不自行选择持久化目录；`worktree_status` 由调用方写入 `speculo/.speculo/<workflow>/changes/<change>/.status.json`。
