---
id: zoom-out
type: skill
name: Zoom Out
description: 拉高抽象层级说明相关模块、调用者和领域关系；当 dev/02 或其他 dev workflow 需要代码区域全景图时使用。
---

# Zoom Out Skill Wrapper

## 何时使用

当 agent 对某段代码或业务区域不熟悉，需要先建立全局视角再继续 PRD、设计、诊断或实现时使用。

## 输入

- 用户指出的代码区域、功能、模块或业务问题
- 项目领域术语表和相关架构文档

## 输出

- 模块全景、调用关系、关键边界、上下游依赖和需要进一步确认的问题

## 执行步骤

1. 读取并严格遵循 `source/SKILL.md`。
2. 输出以调用方 workflow 指定模板归档。
3. 本 skill 不直接写 `.speculo/` 或 `.status.json`。

## 渐进披露

- `source/SKILL.md`：需要拉高视角时读取。
