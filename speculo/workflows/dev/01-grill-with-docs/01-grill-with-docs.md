---
id: dev/grill-with-docs
category: dev
name: Grill With Docs
description: 结合项目术语、CONTEXT 与 ADR 对方案进行领域澄清和决策压力测试
keywords: [grill, context, adr, 术语, 决策]
---

# Grill With Docs 工作流执行指引

本工作流用于在 PRD 或实现前澄清领域语言、识别决策分支，并把已确认的上下文沉淀为可追踪产物。核心能力来自 `../../../skills/grill-with-docs/SKILL.md`。

## 阶段

### 1. Context Scan — 上下文扫描
- 规范：`grill-context-scan.md`
- 模板：`../_templates/grill-context-map-template.md`
- 产物：`context-map.md`
- 完成准则：
  - 已记录相关术语表、ADR、代码区域和缺口
  - `context-map.md` 无残留 `[TODO:]`

### 2. Decision Grill — 决策拷问
- 规范：`grill-decision.md`
- 模板：`../_templates/grill-decision-log-template.md`
- 产物：`decision-log.md`
- 完成准则：
  - 关键决策均有结论、推荐答案或开放问题
  - 需要写入项目 `CONTEXT.md` 或 ADR 的内容已获用户确认，或记录为候选
  - `decision-log.md` 无残留 `[TODO:]`

## 依赖

- 软依赖：无
- 硬依赖：无

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `dev_entry` (string) — 固定为 `dev/01`
- `source_skills` (array) — 包含 `grill-with-docs`
- `context_paths` (array) — 已读取的 CONTEXT、ADR、代码或配置路径
- `decision_status` (open | resolved | blocked) — 决策澄清状态
- `adr_candidates` (array) — ADR 候选清单

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- phase 完成后更新 `updated_at`、产物路径和扩展字段。
- 本 workflow 完成后不自动完成 change；默认移交 `../02-prd/02-prd.md` 或按用户要求停止。
