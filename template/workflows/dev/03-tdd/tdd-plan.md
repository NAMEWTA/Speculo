# TDD Plan Phase

## 输入

- `prd.md`、`slices.md`、`diagnosis.md` 或用户明确任务
- 多阶段：本阶段对应切片的 **保留/不动**、**关键核实结论**、**验收切片** 与 §4 横切铁律（`slices.md`）
- 项目测试命令、现有测试样式和公共接口
- `03-tdd.md` 中的内置 TDD 指引（含「消费 slices 切片契约」）和同目录辅助文档

## 产物

- `speculo/.speculo/dev/<change>/tdd/<phase-id>/tdd-plan.md`，由 `../_templates/tdd-plan-template.md` 填写（`<phase-id>` 见 `03-tdd.md`「TDD 产物目录与阶段标识」）

## 填写引导

1. 遵循 `03-tdd.md` 的内置 TDD 指引。
2. 按需读取同目录的接口设计、测试、mock 和 deep module 文档。
3. 与用户确认公共接口、最重要的行为和测试覆盖优先级。
4. 拆出第一个 tracing slice，避免水平切片。
5. 探索代码库时使用项目领域术语表，确保测试名称和接口词汇与项目语言一致，并尊重触及区域的 ADR。
6. 写任何代码前确认接口变更、优先测试的行为、deep module 机会、可测试接口设计和行为列表。
7. **承载切片契约**：把本阶段对应切片的 **保留/不动** 与 **关键核实结论** 记入计划作为实现约束；切片行号为近似、以现场代码为准（现场核对）；存疑分支按 `../I-to-issues/issues-slices.md`「存疑时的提问协议」一次一问、带推荐、逐步锁定。

## 边界

- 本阶段不写代码。
- 不批量预写所有测试。

## 完成准则

- 产物顶部「阶段标识」段已填写 `<phase-id>`（多阶段 slices 须与 `<phase>` 的 `id` 一致）
- 多阶段：已记录本切片 **保留/不动** 约束与 **现场核对** 结论
- `tdd-plan.md` 无残留 `[TODO:]`
- `.status.json` 的 `implementation_status` 为 `planned`
