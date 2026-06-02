---
id: dev/prd
category: dev
name: PRD
description: 通过 zoom-out 全景理解与 to-prd 综合产出开发 PRD
keywords: [prd, zoom-out, 需求, 计划]
---

# PRD 工作流执行指引

本工作流用于把已知上下文综合为 Speculo change 内的 PRD。核心能力来自 `../../../skills/zoom-out/SKILL.md` 与 `../../../skills/to-prd/SKILL.md`。

## 阶段

### 1. Zoom Out — 全景理解
- 规范：`prd-zoom-out.md`
- 模板：`../_templates/prd-overview-template.md`
- 产物：`overview.md`
- 完成准则：
  - 已说明相关模块、调用者、边界和未知点
  - `overview.md` 无残留 `[TODO:]`

### 2. PRD Synthesis — PRD 综合
- 规范：`prd-synthesis.md`
- 模板：`../_templates/prd-template.md`
- 产物：`prd.md`
- 完成准则：
  - PRD 包含问题、方案、用户故事、实现决策、测试决策、范围边界
  - 已确认模块候选和测试目标
  - `prd.md` 无残留 `[TODO:]`

## 依赖

- 软依赖：`../01-grill-with-docs/01-grill-with-docs.md`，scope: same-change
- 硬依赖：无

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `dev_entry` (string) — 固定为 `dev/02`
- `source_skills` (array) — 包含 `zoom-out`、`to-prd`
- `prd_slug` (string) — PRD 短 slug
- `module_candidates` (array) — 候选模块或边界
- `test_targets` (array) — 用户确认的测试目标
- `issue_tracker_mode` (disabled | local-only | publish-requested | published) — issue tracker 使用状态

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 默认把 PRD 写入当前 change 的 `prd.md`；不默认写 `docs/plan/`。
- 本 workflow 完成后不自动完成 change；默认移交 `../04-to-issues/04-to-issues.md` 或 `../03-tdd/03-tdd.md`。
