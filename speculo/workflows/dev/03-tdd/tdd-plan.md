# TDD Plan Phase

## 输入

- `prd.md`、`slices.md`、`diagnosis.md` 或用户明确任务
- 项目测试命令、现有测试样式和公共接口
- Skill wrapper：`../../../skills/tdd/SKILL.md`

## 产物

- `tdd-plan.md`，由 `../_templates/tdd-plan-template.md` 填写

## 填写引导

1. 读取 `../../../skills/tdd/SKILL.md`。
2. 按需读取 source 中的接口设计、测试、mock 和 deep module 文档。
3. 与用户确认公共接口、最重要的行为和测试覆盖优先级。
4. 拆出第一个 tracing slice，避免水平切片。

## 边界

- 本阶段不写代码。
- 不批量预写所有测试。

## 完成准则

- `tdd-plan.md` 无残留 `[TODO:]`
- `.status.json` 的 `implementation_status` 为 `planned`
