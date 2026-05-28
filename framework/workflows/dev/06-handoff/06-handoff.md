---
id: dev/handoff
category: dev
name: 交接工作流
description: 评审通过后向 doc/ops 衔接、准备归档
keywords: [handoff, 交接, 归档, 发版准备]
---

# 交接工作流执行指引

本工作流是 dev 链路的收尾胶水：把"评审已通过的代码改动"机械地交接给 `doc/02-changelog` 写 changelog、向 `ops/01-release` 准备发版前置、并把本 change 标为可归档。

本工作流**不引入新代码改动**；任何"再补一点"都必须回 `../03-implement/` 完成。

AI 进入本工作流时的前置动作：

1. 读 `../../../.speculo/dev-status.json` 锁定目标 change。
2. 读同 change 的 `.status.json`，确认 `code_review_decision` 与 `security_review_decision` 同时为"通过"或"通过-小修+已签字"。
3. 读 `prd.md` / `implement.md` / `review-code.md`，准备交接清单。
4. 检查 `doc/02-changelog` 是否有针对本 change 的 changelog 条目；若无，提示用户先跑 doc 工作流。

## 阶段

### 1. Handoff — 交接清单
- 规范：`handoff-changelog.md`
- 模板：`../_templates/handoff-template.md`
- 产物：`handoff.md`
- 完成准则：
  - `handoff.md` 三章节（向 doc 的交接 / 向 ops 的交接 / 归档准备）填写完成，无残留 `[TODO:]`
  - "向 doc 的交接"段列出本 change 在 `CHANGELOG.md` 或 `doc/02-changelog` 产物中的位置
  - "向 ops 的交接"段确认 `prereq_checklist_passed` 五项前置在 dev 侧已就绪（与 `ops/01-release` 期望对齐）
  - "归档准备"段列出本 change 待归档目录路径与归档时机（通常是发版成功 + 观测窗口结束后）

## 依赖

- 软依赖（建议先做）：`../05-review/`（同一 change 下，评审已通过）
- 硬依赖：无（但若评审未通过，本工作流的完成准则无法满足，会被自动阻挡）

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `handoff_to_doc` (boolean) — 是否已向 doc/02-changelog 交接
- `handoff_to_ops` (boolean) — 是否已确认 ops 前置就绪
- `archive_ready` (boolean) — 是否可由 `commands/archive.md` 触发归档（需 ops 工作流完成才置 true，本 phase 仅置 false 占位）

## 完成与状态更新

- 进入 Handoff 时：`current_phase` 置 `handoff`；`phase_history` 追加。
- Handoff 完成：写入 `handoff_to_doc=true` 与 `handoff_to_ops=true`；置 phase `completed`；`archive_ready` 暂置 false（待 ops 完成后由 ops 工作流置 true）。
- 若本 change 是仅 dev 范围（不发版不部署，如纯内部重构）：可直接把 `archive_ready` 置 true。
- 完成后：`current_phase` 移交 `../../ops/01-release/`（如需发版）或 `null`（如仅内部交付）。
