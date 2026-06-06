# Finalize & Archive Phase

本阶段把通过验证的 change 收尾并归档。**归档是破坏性目录移动，必须先列清单、经用户确认才执行。**

## 输入

- `.speculo/dev/<change>/completion-verification.md`，且 `verification_status: verified`
- 当前 change 的 `.status.json`
- 顶层索引 `.speculo/dev-status.json`

## 产物

- `.speculo/dev/<change>/completion-summary.md`，由 `../_templates/completion-summary-template.md` 填写
- 归档动作：change 目录移动到 `.speculo/archive/dev/<YYYY-MM>/<change>/`

## 填写引导

### 前置门控

1. 确认 `verification_status: verified`。若为 `blocked`，**停止**，不收尾、不归档，回到验证或修复。
   - **Worktree 模式**：本阶段前应已完成 `04-finalize.md` 的 Phase 2 Merge Back & Cleanup（`worktree_status: removed`），change 目录已随合并到达 `base_branch`，归档在 base 分支上对该目录执行。若 `worktree_status` 仍非 `removed`，先回 Phase 2 合并清理，再进入归档。

### 状态收尾

2. 写 `completion-summary.md`：交付边界、关键变更、验证证据指针（指向 `completion-verification.md`）、遗留事项。
3. 把当前 change `.status.json` 的 `change_status` 置为 `completed`。
4. 如有可沉淀经验，在用户或项目规则允许时追加到 `.speculo/.config/LESSONS.md`。

### 归档（破坏性，需确认）

本步与 `../../../commands/archive.md` 共用同一安全契约；此处作用域仅限**当前单个 change**：

5. 列出归档计划：源路径 `.speculo/dev/<change>/`、目标路径 `.speculo/archive/dev/<YYYY-MM>/<change>/`、`updated_at`、最后 phase、是否仍在 `dev-status.json` 的 `active[]`。
6. 向用户展示计划并等待明确确认。**没有确认时只输出计划，不移动目录、不改索引。**
7. 若目标归档路径已存在，标记冲突并停止，不覆盖。
8. 用户确认后执行：
   - 创建 `.speculo/archive/dev/<YYYY-MM>/`
   - 移动 change 目录到 `.speculo/archive/dev/<YYYY-MM>/<change>/`
   - 从 `.speculo/dev-status.json` 的 `active[]` 删除该 change
   - 把（已随目录移动的）`.status.json` 的 `change_status` 置为 `archived`，写 `archived: true`、`archive_path`
9. 若移动失败，停止后续动作，报告已完成与未完成项；不要回滚已成功的移动，除非用户明确要求。

## 边界

- `verification_status` 非 `verified` 时不得归档。
- 未获用户确认时不执行任何破坏性移动或索引修改。
- 不覆盖已存在的归档目标。
- 批量归档多个 change 时改用 `../../../commands/archive.md`。

## 完成准则

- `completion-summary.md` 无残留 `[TODO:]`
- change 目录已位于 `.speculo/archive/dev/<YYYY-MM>/<change>/`
- `.speculo/dev-status.json` 的 `active[]` 已移除该 change
- `.status.json` 的 `change_status: archived`，`archived: true`，`archive_path` 已写入
