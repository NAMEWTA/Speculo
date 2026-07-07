---
id: dev/tdd
category: dev
name: TDD Implementation
description: 按垂直切片执行红绿重构，实现功能或回归修复
keywords: [tdd, implement, red-green-refactor, 实现, 测试]
---

# TDD Implementation 工作流执行指引

本工作流用于把 PRD、issue、诊断结论或用户明确任务实现为经过验证的代码变更。TDD 细节见同目录 phase 文件；设计词汇统一引用 `../../../vendor/codebase-design/SKILL.md`。

> **产物目录：** `speculo/.speculo/dev/<change>/tdd/<phase-id>/`。`<change>` 必须为 `YYYY-MM-DD-<kebab-name>`。

## 阶段

| Phase | id | agent | 规范 | 模板 | 产物 |
|-------|-----|-------|------|------|------|
| 1. TDD Plan | `tdd-plan` | `agents/tdd-plan-agent.md` | `tdd-plan.md` | `../_templates/tdd-plan-template.md` | `tdd/<phase-id>/tdd-plan.md` |
| 2. Slice Loop | `slice-loop` | `agents/tdd-implement-agent.md` | `tdd-loop.md` | `../_templates/tdd-log-template.md` | `tdd/<phase-id>/implementation-log.md` |
| 3. Finish | `tdd-finish` | `agents/tdd-finish-agent.md` | `tdd-finish.md` | `../_templates/tdd-verification-template.md` | `tdd/<phase-id>/verification.md` |

### 1. TDD Plan — 行为与接口计划
- id：`tdd-plan`
- 完成准则：公共接口与测试优先级已确认；`tdd-plan.md` 无残留 `[TODO:]`

### 2. Slice Loop — 红绿重构循环
- id：`slice-loop`
- 完成准则：每切片有 RED/GREEN/REFACTOR 记录；`implementation-log.md` 无残留 `[TODO:]`

### 3. Finish — 验证与收尾
- id：`tdd-finish`
- 完成准则：验证已运行；slices 状态已翻转（若有）；`verification.md` 无残留 `[TODO:]`

slices 消费契约、Git 基线、XML 阶段状态见 `tdd-plan.md` 与 `tdd-finish.md`。

## 依赖

- 软依赖：`../02-prd/02-prd.md` 或 `../I-to-issues/I-to-issues.md`，scope: same-change
- 硬依赖：无

## 状态扩展字段

- `dev_entry` (string) — 固定为 `dev/03`
- `tdd_phase_id` (string)
- `slice_source` (prd | issues | diagnosis | user-request)
- `red_green_refactor_cycles` (array)
- `verification_commands` (array)
- `implementation_status` (planned | in-progress | verified | blocked)

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- Finish 验证通过后把 slices 中该阶段 `status` 由 `未开始` 置为 `已实现`（无 slices 则跳过）。
- 全部实现边界完成并验证后，移交 `../04-finalize/04-finalize.md` 或 `../R-review/R-review.md`；不得自行写入 `change_status: completed`。
