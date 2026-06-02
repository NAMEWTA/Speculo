---
id: grill-with-docs
type: skill
name: Grill With Docs
description: 结合项目术语、CONTEXT 和 ADR 对计划进行拷问式决策澄清；当 dev/01 需要打磨领域语言和方案决策时使用。
---

# Grill With Docs Skill Wrapper

## 何时使用

当 dev workflow 需要把用户方案与现有领域模型、术语表、ADR 或代码现实交叉验证时使用。

## 输入

- 用户提出的计划、需求、设计或变更意图
- 仓库中的 `CONTEXT.md`、`CONTEXT-MAP.md`、`docs/adr/`、相关代码
- 调用方 workflow 指定的决策记录产物路径

## 输出

- 已确认的术语、决策、开放问题和 ADR 候选
- 需要用户进一步决策的问题，每次只问一个

## 执行步骤

1. 读取并严格遵循 `source/SKILL.md`。
2. 需要格式约定时再读取 `source/CONTEXT-FORMAT.md` 或 `source/ADR-FORMAT.md`。
3. 原始 skill 内容不修改；持久化由调用方 workflow 决定。
4. 对项目文档的创建或修改必须符合调用方 workflow 的确认策略。

## 渐进披露

- `source/SKILL.md`：进入领域拷问时读取。
- `source/CONTEXT-FORMAT.md`：需要写入或更新术语表时读取。
- `source/ADR-FORMAT.md`：需要创建 ADR 候选或 ADR 时读取。
