---
id: dev/grill-with-docs
category: dev
name: Grill With Docs
description: 结合项目术语、CONTEXT 与 ADR 对方案进行领域澄清和决策压力测试
keywords: [grill, context, adr, 术语, 决策]
---

# Grill With Docs 工作流执行指引

本工作流用于在 PRD 或实现前澄清领域语言、识别决策分支，并把已确认的上下文沉淀为当前 change 的可追踪产物。领域拷问、CONTEXT 格式和 ADR 判断规则已内置在本 workflow 目录中。

## 内置指引

### 何时使用

当 dev workflow 需要把用户方案与现有领域模型、术语表、ADR 或代码现实交叉验证时使用。

### 输入

- 用户提出的计划、需求、设计或变更意图
- `.speculo/.config/RULES.md` 和用户明确指出的项目规则、设计约束或长期文档
- 仓库中的 `CONTEXT.md`、`CONTEXT-MAP.md`、`docs/adr/` 和相关代码
- 当前 change 目录：`.speculo/dev/<change>/`

### 输出

- `.speculo/dev/<change>/context-map.md`
- `.speculo/dev/<change>/decision-log.md`
- 已确认的术语、决策、开放问题和 ADR 候选
- 需要用户进一步决策的问题，每次只问一个

### 执行原则

针对计划的每个方面不断向用户提问，直到达成共识。沿着设计树的每条分支逐一展开，逐个解决决策之间的依赖关系。对于每个问题，给出推荐答案。

每次只问一个问题，等待用户对当前问题的反馈后再继续。如果某个问题可以通过探索代码库来回答，就直接探索代码库。

需要格式约定时读取同目录 `CONTEXT-FORMAT.md` 或 `ADR-FORMAT.md`。项目 `CONTEXT.md` 或 ADR 的创建、修改必须符合本 workflow 的用户确认策略；未确认内容只记录到当前 change 的 `decision-log.md`。

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
- `embedded_guides` (array) — 包含 `grill-with-docs`
- `context_paths` (array) — 已读取的 CONTEXT、ADR、代码或配置路径
- `decision_status` (open | resolved | blocked) — 决策澄清状态
- `adr_candidates` (array) — ADR 候选清单

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- phase 完成后更新 `updated_at`、产物路径和扩展字段。
- 本 workflow 完成后不自动完成 change；默认移交 `../02-prd/02-prd.md` 或按用户要求停止。
