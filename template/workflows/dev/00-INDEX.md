---
id: dev/index
category: dev
name: Dev Workflow Index
description: 开发工作流导航、状态汇报与下一步推荐入口
keywords: [dev, 开发, workflow, index, 状态]
---

# Dev Workflow Index

> ⚠️ **持久化铁律：本文件及所有 dev workflow 的全部产物，必须且只能写入 `speculo/.speculo/dev/<change>/`。绝对禁止写入项目根目录的 `.speculo/`、`temp/` 或其他任何非规范位置。**

本文件是 dev 分类的导航入口。进入时先读取 `speculo/.speculo/dev-status.json`，再按其中 active change 读取 `speculo/.speculo/dev/<change>/.status.json`，根据用户意图推荐下一步。

> **命名铁律：** 所有 change 目录必须为 `YYYY-MM-DD-<kebab-name>`（例：`2026-06-12-user-auth`）。不符合此格式的目录视为 `malformed`，仅汇报不自动操作。

## 入口别名

| 别名 | 入口 | 用途 |
|------|------|------|
| `dev/01` | `01-grill-with-docs/01-grill-with-docs.md` | 领域术语、CONTEXT、ADR 与方案拷问 |
| `dev/02` | `02-prd/02-prd.md` | zoom-out 全景理解与 PRD 综合 |
| `dev/03` | `03-tdd/03-tdd.md` | 垂直切片 TDD 实现 |
| `dev/04` | `04-finalize/04-finalize.md` | 完成前验证、状态收尾与归档 |
| `dev/I` | `I-to-issues/I-to-issues.md` | 垂直切片 issue 分解，可嵌入其他 dev workflow，也可独立进入 |
| `dev/H` | `H-diagnose/H-diagnose.md` | hotfix / bug / 性能回退诊断，零依赖，可独立进入 |
| `dev/R` | `R-review/R-review.md` | Spec / Engineering / Standards 三维度 diff 审查，零依赖，可独立进入 |
| `dev/D` | `D-docs-sync/D-docs-sync.md` | 基于 git diff 同步 README、CHANGELOG、AGENTS 等对外文档 |

## 进入协议

1. 若用户未指定 change，扫描 `speculo/.speculo/dev-status.json` 和 `speculo/.speculo/dev/*/.status.json`，列出 active changes。
   - **命名校验**：扫描时仅处理符合 `YYYY-MM-DD-<kebab-name>` 格式的目录。不符合的目录标记为 `malformed`，单独列出路径并提示用户修复或手动清理，不自动删除或重命名。
2. 若只有一个 active change，默认继续该 change；若有多个 active change，要求用户选择。
3. 若没有 active change，按用户意图创建新的 change 目录，**目录名必须为 `YYYY-MM-DD-<kebab-name>`**（使用当前日期，`<kebab-name>` 从用户意图提取），并初始化 `.status.json` 与 `speculo/.speculo/dev-status.json`。
4. 推荐入口时优先使用用户显式别名；没有别名时按执行模式推荐。
5. 执行任何 workflow 前，读取该 workflow 入口文件、阶段文件、模板和被调用 skill wrapper。
6. **Worktree 隔离（可选，默认 off）**：仅当用户**显式请求**隔离时，新 change 在 `dev/01` 的 Phase 0 经 `../../skills/worktree-isolation/SKILL.md` 建立隔离分支 `speculo/dev/<change>` 与 `.worktree/<change>/` 工作树，并把 `base_branch`、`change_branch` 记入 `.status.json`。扫描 active changes 时，对 `worktree_enabled` 为真者可结合 `git worktree list` 核对工作树是否存在。

## 执行模式

- `full`：`dev/01` -> `dev/02` -> `dev/I` -> `dev/03` -> `dev/04`。
- `planning-only`：`dev/01` -> `dev/02` -> `dev/I`，不进入实现。
- `implementation-only`：已有 PRD、issue 或明确任务时，从 `dev/03` 开始。
- `hotfix`：Bug、异常、性能回退时，从 `dev/H` 开始（零依赖，无需上游工作流产物）；修复阶段可嵌入 `dev/03` 的 TDD 回归循环。
- `review`：已有 fixed point 或用户要求审查时，从 `dev/R` 开始（零依赖，无需上游工作流产物）。
- `finalize`：实现完成、需要完成前验证与状态收尾归档时，从 `dev/04` 开始。
- `docs-sync`：需要基于 git 差异刷新对外文档时，从 `dev/D` 开始。

> **独立入口说明：** `dev/H`、`dev/I`、`dev/R` 三个横向工作流均为零硬依赖设计。用户可直接从任一入口进入，无需预先执行 `dev/01`、`dev/02` 等主线工作流。当同 change 目录下缺少上游产物时，各工作流会自行通过代码库探索（git 考古、grep 搜索、文档扫描）采集所需上下文，仅在代码库无法确定的决策点上询问用户。

## 状态汇报

输出 dev 状态时至少包含：

- active change 数量与每个 change 的 `current_phase`
- malformed 目录清单（不符合 `YYYY-MM-DD-<kebab-name>` 格式的目录）
- 最近更新的 change，按 `updated_at` 倒序
- `phase_history` 最后一项为 `blocked` 或 `updated_at` 超过 14 天未变化的 change
- worktree 模式 change 额外汇报 `base_branch` / `change_branch` / `worktree_status`
- 推荐下一步入口和原因

## 完成与状态更新

- 所有 dev workflow 必须维护同一 change 的 `.status.json`。
- 进入 phase 时更新 `current_phase`，并在 `phase_history` 追加 `in-progress` 记录。
- phase 完成时写入 `completed_at` 和 `status: completed`。
- 只有完成当前 change 的最终交付边界时，才把 `change_status` 置为 `completed`。
