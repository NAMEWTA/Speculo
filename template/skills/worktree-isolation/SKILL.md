---
id: worktree-isolation
type: skill
name: Worktree Isolation
description: 在独立 git worktree 中创建、审查、合并和清理 Speculo workflow change。
---

# Worktree Isolation

仅在用户明确要求 worktree 隔离时调用；调用方提供 runtime context 和当前 change。

## 状态字段

`worktree_enabled`、`base_branch`、`change_branch`、`worktree_path`、`worktree_status` 由调用方写入当前 change `.status.json`。

## 流程

1. 确认 git 仓库、工作区状态和 `speculo/.speculo/` 跟踪策略；任一条件不满足时返回不可隔离原因。完成标准：创建前状态和降级选择清晰。
2. 固定 `change_branch=speculo/<workflow>/<change>`、`worktree_path=.worktree/<change>`，读取 `references/create-worktree.md`。完成标准：分支、工作树和返回状态均真实存在。
3. 所有代码和 change 产物在该工作树推进；review 时读取 `references/audit-branch-tree.md`。完成标准：审查覆盖 `base..change_branch` 全部 commit。
4. Finalize 时读取 `references/merge-and-cleanup.md`，展示合并、删分支和删 worktree 计划并等待确认。完成标准：变更已进入 base、工作树/分支状态与 `.status.json` 一致，或明确 blocked。

破坏性 git 动作逐项确认；冲突时停止并返回现状，不强推。
