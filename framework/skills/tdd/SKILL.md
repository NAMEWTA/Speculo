---
id: tdd
type: skill
name: TDD
description: 通过红绿重构循环按垂直切片实现功能或修复；当 dev/03 需要测试先行、公共接口验证和增量实现时使用。
---

# TDD Skill Wrapper

## 何时使用

当 dev workflow 已有 PRD、issue、切片计划或 bug 复现，并准备通过测试驱动方式实现时使用。

## 输入

- 待实现的垂直切片、用户故事或回归场景
- 需要确认的公共接口和关键行为
- 项目现有测试命令、测试风格和约束

## 输出

- RED/GREEN/REFACTOR 循环记录
- 行为测试、最小实现、重构结果和验证命令

## 执行步骤

1. 读取并严格遵循 `source/SKILL.md`。
2. 按需读取 `source/tests.md`、`source/mocking.md`、`source/deep-modules.md`、`source/interface-design.md`、`source/refactoring.md`。
3. 一次只推进一个垂直切片和一个行为测试。
4. 持久化由调用方 workflow 负责；本 skill 不直接写 `.speculo/` 或 `.status.json`。

## 渐进披露

- `source/SKILL.md`：进入 TDD workflow 时读取。
- `source/tests.md`：设计测试方式时读取。
- `source/mocking.md`：考虑 mock 边界时读取。
- `source/deep-modules.md`：识别深模块机会时读取。
- `source/interface-design.md`：设计可测试公共接口时读取。
- `source/refactoring.md`：进入重构阶段时读取。
