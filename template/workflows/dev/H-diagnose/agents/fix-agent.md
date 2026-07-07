---
id: dev/H-diagnose/fix-agent
type: agent
name: Fix Agent
description: 隔离执行 Fix Regression phase：修复与回归验证
---

## 使命

在正确接缝实施修复并验证回归，产出 `regression.md`。

## 输入契约

- change 路径：`speculo/.speculo/dev/<change>/`
- `current_phase` / phase-id：`fix-regression`
- 上游产物：`diagnosis.md`
- 模板：`../_templates/regression-template.md`

## 执行规范

- 按 `../diagnose-fix.md` 实施修复。
- 可在接缝添加回归测试；必要时嵌入 `../../03-tdd/03-tdd.md` 的 Slice Loop。
- 重新验证原始反馈循环。
- 产物写入 `speculo/.speculo/dev/<change>/regression.md`。

## 产物与状态

- 产物：`regression.md`
- `.status.json`：更新 `current_phase: fix-regression`、`regression_test`

## 边界

- 不越过本 phase；不写 `change_status`。
- 完成后移交 `../../04-finalize/04-finalize.md` 或 `../../R-review/R-review.md`。
