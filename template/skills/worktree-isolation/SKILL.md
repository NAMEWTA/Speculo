---
id: worktree-isolation
type: skill
name: Worktree Isolation
description: 在独立 git worktree 中隔离推进一个 change 的原子能力；当 dev workflow 需要为某个 change 建立隔离分支与 .worktree/ 工作树、审查整条 change 分支树的全部 commit、或在收尾时把分支合并回原分支并清理时使用。默认不启用，仅在用户显式请求隔离时由调用方读取。
---

# Worktree Isolation

## 何时使用

当 dev workflow 需要把一个 change 与原分支**物理隔离**地推进时使用。三个典型触发：

- **建立隔离环境**（grill / change 创建）：为当前 change 新建独立分支与 `.worktree/<change>/` 工作树，代码与所有 Speculo 产物都落在 change 分支上，不污染原分支。
- **审查整条分支树**（review）：审查必须覆盖 change 分支相对原分支的**全部 commit**，而不只是工作区 diff。
- **合并回收**（finalize）：收尾验证通过后，把 change 分支合并回原分支，并清理 worktree 与分支。

**默认不启用。** 只有用户**显式请求**隔离（“用 worktree / 隔离这个 change”）时，调用方才读取并执行本 skill；未请求时调用方完全不加载本 skill，既有流程零行为变化。

## 输入

- 当前 git 仓库与**当前分支**（启用隔离时即记为 base 分支）
- 当前 change 目录名（`YYYY-MM-DD-<kebab>`）与其分类 `<cat>`（dev | doc | person | ops）
- 用户的隔离意图（是否显式请求）
- 仓库 `.gitignore`

本 skill 自带全部隔离程序，**不外读仓库 `docs/`**。

## 输出

- git 状态变更：隔离分支、`.worktree/<change>/` 工作树、合并与清理结果
- **供调用方持久化的状态字段集**（本 skill 不自行选择持久化目录，由调用方 workflow 写入同一 change 的 `.status.json`）：

  | 字段 | 类型 | 含义 |
  |------|------|------|
  | `worktree_enabled` | bool | 是否启用隔离 |
  | `base_branch` | string | 原分支（启用隔离时的当前分支） |
  | `change_branch` | string | 隔离分支，固定 `speculo/<cat>/<change>` |
  | `worktree_path` | string | 工作树路径，固定 `.worktree/<change>` |
  | `worktree_status` | string | created \| active \| merged \| removed |

- 可归档摘要：base / change 分支、worktree 路径、合并与清理结论、残留风险

## 执行步骤

1. **判定可隔离性**：确认 (a) 在 git 仓库内，(b) 工作区干净或变更可接受，(c) 目标项目 `speculo/.speculo/` 被 git 跟踪（产物需随分支合并）。任一不满足 → **不创建**，向调用方报告原因并降级为非 worktree 模式。
2. **命名**：base = 当前分支；`change_branch = speculo/<cat>/<change>`；`worktree_path = .worktree/<change>`。
3. **创建**：见 `references/create-worktree.md`。完成后返回 `base_branch / change_branch / worktree_path` 与 `worktree_status: active` 供调用方写入。
4. **隔离推进**：此后该 change 的全部工作（代码 + `speculo/.speculo/<cat>/<change>/` 产物）都在 `worktree_path` 内、`change_branch` 上进行。
5. **审查全树**（review 时）：见 `references/audit-branch-tree.md`，覆盖 `base..change_branch` 的每个 commit。
6. **合并回收**（finalize 时）：见 `references/merge-and-cleanup.md`，合并回 base、删分支、删 worktree。

**破坏性步骤**（合并、删分支、删 worktree）必须先列计划、经用户确认再执行；合并冲突即停、不强推。

## 渐进披露

- `references/create-worktree.md`：建立隔离分支与 `.worktree/` 工作树时读取（grill / change 创建）。
- `references/audit-branch-tree.md`：审查 change 分支树相对 base 的全部 commit 时读取（review）。
- `references/merge-and-cleanup.md`：把 change 分支合并回原分支并清理时读取（finalize）。
