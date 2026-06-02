---
id: grill-me
type: command
name: Grill Me
description: 对计划或设计进行逐问式压力测试
keywords: [grill, 追问, pressure-test, 方案]
---

# Grill Me 命令

## 归档路径模式

可选产物归档至：`../.speculo/commands/<YYYY-MM-DD>-grill-me-<topic>/`

## 调用的 skills

- `../skills/grill-me/SKILL.md` — 用户要求拷问计划、设计或决策时读取。

## 执行步骤

1. 读取 `../skills/grill-me/SKILL.md`。
2. 先探索可从仓库确认的事实。
3. 对无法从仓库确认且会改变决策树的问题，每次只问一个。
4. 用户要求持久化时，把已确认决策和开放问题写入 `../.speculo/commands/<YYYY-MM-DD>-grill-me-<topic>/report.md`。

## 产物模板（report.md，可选）

> **服务命令：** `grill-me.md`
> **产物文件名：** `report.md`

```markdown
# Grill Me Report

## 主题
[TODO: 记录被压力测试的计划或设计。]

## 已确认决策
[TODO: 列出已确认决策和用户确认依据。]

## 开放问题
[TODO: 列出仍未解决的问题、推荐答案和阻塞原因。]
```
