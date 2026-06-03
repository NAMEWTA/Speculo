# TDD Plan Phase

## 输入

- `prd.md`、`slices.md`、`diagnosis.md` 或用户明确任务
- 项目测试命令、现有测试样式和公共接口
- `03-tdd.md` 中的内置 TDD 指引和同目录辅助文档

## 产物

- `.speculo/dev/<change>/tdd-plan.md`，由 `../_templates/tdd-plan-template.md` 填写

## 填写引导

1. 遵循 `03-tdd.md` 的内置 TDD 指引。
2. 按需读取同目录的接口设计、测试、mock 和 deep module 文档。
3. 与用户确认公共接口、最重要的行为和测试覆盖优先级。
4. 拆出第一个 tracing slice，避免水平切片。
5. 探索代码库时使用项目领域术语表，确保测试名称和接口词汇与项目语言一致，并尊重触及区域的 ADR。
6. 写任何代码前确认接口变更、优先测试的行为、deep module 机会、可测试接口设计和行为列表。

## 边界

- 本阶段不写代码。
- 不批量预写所有测试。

## 完成准则

- `tdd-plan.md` 无残留 `[TODO:]`
- `.status.json` 的 `implementation_status` 为 `planned`
