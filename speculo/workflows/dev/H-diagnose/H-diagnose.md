---
id: dev/H-diagnose
category: dev
name: Diagnose Hotfix
description: 针对 Bug、异常和性能回退执行反馈循环驱动的诊断与修复
keywords: [diagnose, hotfix, bug, debug, performance, 回归]
---

# Diagnose Hotfix 工作流执行指引

本工作流是 `dev/H` 入口，用于处理 Bug、异常、测试失败和性能回退。诊断循环指引已内置在本 workflow 目录中。

## 内置指引

### 何时使用

当用户报告 Bug、异常、测试失败、性能回退，或 dev workflow 进入 `dev/H` hotfix/diagnose 路径时使用。

### 输入

- 用户描述的失败现象、日志、复现步骤或性能症状
- 当前 change 目录：`.speculo/dev/<change>/`（`<change>` 必须为 `YYYY-MM-DD-<kebab-name>`，例：`2026-06-12-fix-login-bug`）
- 可运行的测试、脚本、服务或其他反馈循环

### 输出

- `.speculo/dev/<change>/diagnosis.md`
- `.speculo/dev/<change>/regression.md`
- 诊断记录、假设列表、插桩结果、修复与回归验证结论
- 若缺少可信反馈循环，输出已尝试方法和需要用户提供的材料

（`<change>` 格式：`YYYY-MM-DD-<kebab-name>`）

### 执行原则

完整诊断循环为：复现 -> 最小化 -> 假设 -> 插桩 -> 修复 -> 回归测试。仅在明确合理时才跳过阶段。

反馈循环是核心。必须优先建立快速、确定、可信、可由 agent 运行的通过/失败信号。没有可信反馈循环时，不进入假设阶段；记录已尝试方法和需要用户提供的材料。

详细诊断纪律在同目录 `diagnose-guide.md`。必须由人类操作才能复现时，按 `scripts/hitl-loop.template.sh` 建立结构化 HITL 循环。

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
- `embedded_guides` (array) — 包含 `diagnose`
- `feedback_loop` (none | weak | trusted | blocked) — 反馈循环状态
- `hypothesis_status` (open | testing | confirmed | rejected | blocked) — 假设状态
- `regression_test` (added | not-possible | not-needed | blocked) — 回归测试状态
- `debug_artifacts` (array) — 临时脚本、日志标记或 trace 路径

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 若需要 TDD 实现修复，可嵌入 `../03-tdd/03-tdd.md` 的 Slice Loop。
- 修复验证完成后可把 `change_status` 置为 `completed`，或移交后续 review/handoff。
