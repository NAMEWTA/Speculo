---
id: dev/index
category: dev
name: Dev Workflow Index
description: 开发工作流导航、状态汇报与下一步推荐入口
keywords: [dev, 开发, workflow, index, 状态]
---

# Dev Workflow Index

本文件是 dev 分类的导航入口。进入时先读取 `../../.speculo/dev-status.json`，再按其中 active change 读取 `../../.speculo/dev/<change>/.status.json`，根据用户意图推荐下一步。

## 入口别名

| 别名 | 入口 | 用途 |
|------|------|------|
| `dev/01` | `01-grill-with-docs/01-grill-with-docs.md` | 领域术语、CONTEXT、ADR 与方案拷问 |
| `dev/02` | `02-prd/02-prd.md` | zoom-out 全景理解与 PRD 综合 |
| `dev/03` | `03-tdd/03-tdd.md` | 垂直切片 TDD 实现 |
| `dev/I` | `I-to-issues/I-to-issues.md` | 垂直切片 issue 分解，可嵌入其他 dev workflow |
| `dev/H` | `H-diagnose/H-diagnose.md` | hotfix / bug / 性能回退诊断 |
| `dev/R` | `R-review/R-review.md` | Standards / Spec 双维度 diff 审查 |
| `dev/D` | `D-docs-sync/D-docs-sync.md` | 基于 git diff 同步 README、CHANGELOG、AGENTS 等对外文档 |

## 进入协议

1. 若用户未指定 change，扫描 `../../.speculo/dev-status.json` 和 `../../.speculo/dev/*/.status.json`，列出 active changes。
2. 若只有一个 active change，默认继续该 change；若有多个 active change，要求用户选择。
3. 若没有 active change，按用户意图创建新的 change 目录，并初始化 `.status.json` 与 `../../.speculo/dev-status.json`。
4. 推荐入口时优先使用用户显式别名；没有别名时按执行模式推荐。
5. 执行任何 workflow 前，读取该 workflow 入口文件、阶段文件、模板和被调用 skill wrapper。

## 执行模式

- `full`：`dev/01` -> `dev/02` -> `dev/I` -> `dev/03`。
- `planning-only`：`dev/01` -> `dev/02` -> `dev/I`，不进入实现。
- `implementation-only`：已有 PRD、issue 或明确任务时，从 `dev/03` 开始。
- `hotfix`：Bug、异常、性能回退时，从 `dev/H` 开始；修复阶段可嵌入 `dev/03` 的 TDD 回归循环。
- `review`：已有 fixed point 或用户要求审查时，从 `dev/R` 开始。
- `docs-sync`：需要基于 git 差异刷新对外文档时，从 `dev/D` 开始。

## 状态汇报

输出 dev 状态时至少包含：

- active change 数量与每个 change 的 `current_phase`
- 最近更新的 change，按 `updated_at` 倒序
- `phase_history` 最后一项为 `blocked` 或 `updated_at` 超过 14 天未变化的 change
- 推荐下一步入口和原因

## 完成与状态更新

- 所有 dev workflow 必须维护同一 change 的 `.status.json`。
- 进入 phase 时更新 `current_phase`，并在 `phase_history` 追加 `in-progress` 记录。
- phase 完成时写入 `completed_at` 和 `status: completed`。
- 只有完成当前 change 的最终交付边界时，才把 `change_status` 置为 `completed`。
