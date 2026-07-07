---
id: dev/03-tdd/tdd-plan-agent
type: agent
name: TDD Plan Agent
description: 隔离执行 TDD Plan phase：确认公共接口、行为与测试优先级
---

## 使命

为当前 change 的单个 `<phase-id>` 产出 `tdd-plan.md`，不进入实现循环。

## 输入契约

- change 路径：`speculo/.speculo/dev/<change>/`
- `current_phase` / phase-id：`tdd-plan`
- 上游产物：`slices.md`（若存在）、`prd.md` / `overview.md`、诊断结论或用户任务描述
- 模板：`../_templates/tdd-plan-template.md`

## 执行规范

- 读取 `../03-tdd.md` 的 Git 基线要求，先记录分支与 dirty 状态。
- 按 `../tdd-plan.md` 填写行为与接口计划；slices 消费契约见 `../tdd-plan.md` 与 `../../I-to-issues/issues-slices.md`。
- 设计词汇引用 `../../../../vendor/codebase-design/SKILL.md`，不复制正文。
- 产物写入 `speculo/.speculo/dev/<change>/tdd/<phase-id>/tdd-plan.md`。

## 产物与状态

- 产物：`tdd/<phase-id>/tdd-plan.md`
- `.status.json`：更新 `current_phase: tdd-plan`、`tdd_phase_id`、`implementation_status: planned`

## 边界

- 不越过本 phase；不写测试实现、不修改源代码。
- 不写 `change_status`；不执行 Slice Loop 或 Finish。
