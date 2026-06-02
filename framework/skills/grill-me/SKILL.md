---
id: grill-me
type: skill
name: Grill Me
description: 对计划或设计进行逐问式压力测试；当 command/grill-me 被调用或用户要求拷问方案时使用。
---

# Grill Me Skill Wrapper

## 何时使用

当用户想压力测试计划、设计、架构选择或实现策略，但不需要结合项目文档更新 CONTEXT/ADR 时使用。

## 输入

- 待拷问的计划、设计或决策树
- 可通过仓库探索确认的事实

## 输出

- 一个接一个的问题、推荐答案、已锁定决策和剩余开放点

## 执行步骤

1. 读取并严格遵循 `source/SKILL.md`。
2. 每次只问一个问题。
3. 调用方要求持久化时，把决策摘要写入 command 产物。

## 渐进披露

- `source/SKILL.md`：进入方案压力测试时读取。
