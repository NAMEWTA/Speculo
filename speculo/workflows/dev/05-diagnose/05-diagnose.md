---
id: dev/diagnose
category: dev
name: Diagnose Hotfix
description: 针对 Bug、异常和性能回退执行反馈循环驱动的诊断与修复
keywords: [diagnose, hotfix, bug, debug, performance, 回归]
---

# Diagnose Hotfix 工作流执行指引

本工作流是 `dev/H` 入口，用于处理 Bug、异常、测试失败和性能回退。核心能力来自 `../../../skills/diagnose/SKILL.md`。

## 阶段

### 1. Diagnose Loop — 反馈循环与假设
- 规范：`diagnose-loop.md`
- 模板：`../_templates/diagnosis-template.md`
- 产物：`diagnosis.md`
- 完成准则：
  - 已建立可信反馈循环，或记录无法建立的原因与所需材料
  - 已记录复现、3-5 个排序假设和插桩结果
  - `diagnosis.md` 无残留 `[TODO:]`

### 2. Fix Regression — 修复与回归
- 规范：`diagnose-fix.md`
- 模板：`../_templates/regression-template.md`
- 产物：`regression.md`
- 完成准则：
  - 已在正确接缝添加或说明无法添加回归测试
  - 原始反馈循环已重新验证
  - `regression.md` 无残留 `[TODO:]`

## 依赖

- 软依赖：无
- 硬依赖：无

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `dev_entry` (string) — 固定为 `dev/H`
- `source_skills` (array) — 包含 `diagnose`
- `feedback_loop` (none | weak | trusted | blocked) — 反馈循环状态
- `hypothesis_status` (open | testing | confirmed | rejected | blocked) — 假设状态
- `regression_test` (added | not-possible | not-needed | blocked) — 回归测试状态
- `debug_artifacts` (array) — 临时脚本、日志标记或 trace 路径

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 若需要 TDD 实现修复，可嵌入 `../03-tdd/03-tdd.md` 的 Slice Loop。
- 修复验证完成后可把 `change_status` 置为 `completed`，或移交后续 review/handoff。
