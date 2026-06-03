---
id: handoff
type: skill
name: Handoff
description: 将当前对话压缩成交接文档；当 command/handoff 被调用或需要另一个 agent 接手时使用。
---

# Handoff Skill Wrapper

## 何时使用

当当前上下文需要交给另一个 agent、另一个会话或异步执行者继续时使用。

## 输入

- 当前对话、已完成工作、关键路径、未完成事项和下一次会话重点

## 输出

- 已脱敏的交接文档和推荐技能清单

## 执行步骤

1. 读取并严格遵循 `source/SKILL.md`。
2. 按 source 要求把交接文档保存到用户操作系统临时目录。
3. 如 command 要求持久化，只在 `.speculo/commands/` 记录交接文档路径和摘要，不复制敏感内容。

## 渐进披露

- `source/SKILL.md`：生成交接文档时读取。
