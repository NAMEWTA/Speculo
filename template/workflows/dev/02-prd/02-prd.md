---
id: dev/prd
category: dev
name: PRD
description: 通过 zoom-out 全景理解与 to-prd 综合产出开发 PRD
keywords: [prd, zoom-out, 需求, 计划]
---

# PRD 工作流执行指引

本工作流用于把已知上下文综合为当前 Speculo change 内的 overview 和 PRD。zoom-out 全景理解与 PRD 综合能力已内置在本 workflow 目录中。

> **目录命名：** `<change>` 必须为 `YYYY-MM-DD-<kebab-name>`（例：`2026-06-12-user-auth`）。产物写入 `speculo/.speculo/dev/<change>/`。

## 内置指引

### Zoom Out

当 agent 对某段代码或业务区域不熟悉，需要先建立全局视角再继续 PRD、设计、诊断或实现时使用。用项目领域术语表给出相关模块、调用者、关键边界、上下游依赖和需要进一步确认的问题。

### PRD Synthesis

当 dev workflow 已完成足够上下文探索，需要把当前对话和代码理解沉淀成 PRD 时使用。不要重复访谈已明确的信息；综合当前对话、代码库事实、领域术语、ADR、模块候选和测试目标。

PRD 综合统一使用 `speculo/.speculo/.config/context/CONTEXT.md` 的通用语言；若 PRD 引入或锐化了 CONTEXT 中尚不存在的领域术语，按横向工作流 `../M-domain-modeling/M-domain-modeling.md` 主动沉淀（用户确认后写入 `.config/context/`），不要让术语只活在 PRD 里。

PRD 只写入 `speculo/.speculo/dev/<change>/prd.md`，overview 只写入 `speculo/.speculo/dev/<change>/overview.md`。不写项目根下的任意规划文档，不默认发布外部 issue。只有 tracker 已配置且用户明确要求时，才进入外部发布动作。

（`<change>` 格式：`YYYY-MM-DD-<kebab-name>`）

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
- `embedded_guides` (array) — 包含 `zoom-out`、`to-prd`
- `prd_slug` (string) — PRD 短 slug
- `module_candidates` (array) — 候选模块或边界
- `test_targets` (array) — 用户确认的测试目标
- `issue_tracker_mode` (disabled | local-only | publish-requested | published) — issue tracker 使用状态

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 默认把 PRD 写入当前 change 的 `prd.md`；不默认写项目根下的任意规划文档。
- 本 workflow 完成后不自动完成 change；默认移交 `../I-to-issues/I-to-issues.md` 或 `../03-tdd/03-tdd.md`。
