---
id: dev/03-tdd/tdd-implement-agent
type: agent
name: TDD Implement Agent
description: 隔离执行 Slice Loop phase：红绿重构循环与测试实现
---

## 使命

在当前 change 的 `<phase-id>` 下执行红绿重构循环，产出 `implementation-log.md` 与对应代码变更。

## 输入契约

- change 路径：`speculo/.speculo/dev/<change>/`
- `current_phase` / phase-id：`slice-loop`
- 上游产物：`tdd/<phase-id>/tdd-plan.md`、`slices.md`（若存在）
- 模板：`../_templates/tdd-log-template.md`

## 执行规范

- 按 `../tdd-loop.md` 执行 RED → GREEN → REFACTOR 循环。
- 测试设计读 `../tests.md`；mock 边界读 `../mocking.md`；重构读 `../refactoring.md`。
- 守护 slices 契约：保留/不动清单、现场核对行号、横切铁律见 `../../I-to-issues/issues-slices.md`。
- 产物写入 `speculo/.speculo/dev/<change>/tdd/<phase-id>/implementation-log.md`。

## 产物与状态

- 产物：`tdd/<phase-id>/implementation-log.md`、对应源代码与测试
- `.status.json`：更新 `current_phase: slice-loop`、`red_green_refactor_cycles`、`implementation_status: in-progress`

## 边界

- 不越过本 phase；不执行 Finish 验证或 slices 状态翻转。
- 不写 `change_status`。
