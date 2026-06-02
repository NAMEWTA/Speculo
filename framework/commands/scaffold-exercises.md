---
id: scaffold-exercises
type: command
name: Scaffold Exercises
description: 创建课程练习目录骨架并运行练习 lint
keywords: [exercises, scaffold, course, lint, 练习]
---

# Scaffold Exercises 命令

⚠️ **本命令会创建或移动项目文件，且 source skill 可能执行 git commit。AI 必须先列出影响清单并征求用户确认才能执行。**

## 归档路径模式

产物归档至：`../.speculo/commands/<YYYY-MM-DD>-scaffold-exercises-<topic>/`

## 调用的 skills

- `../skills/scaffold-exercises/SKILL.md` — 用户要求创建课程章节或练习桩时读取。

## 执行步骤

1. 读取 `../skills/scaffold-exercises/SKILL.md`。
2. 解析章节、练习、编号、名称、变体类型和目标路径。
3. 列出将创建、移动或提交的路径，以及将运行的 lint / git 命令。
4. 等待用户明确确认；没有确认时只输出计划，不创建目录、不提交 git。
5. 用户确认后执行创建、lint 和修复循环。
6. 只有用户明确要求时才执行 git commit。
7. 写入 `../.speculo/commands/<YYYY-MM-DD>-scaffold-exercises-<topic>/report.md`。

## 产物模板（report.md）

> **服务命令：** `scaffold-exercises.md`
> **产物文件名：** `report.md`

```markdown
# Scaffold Exercises Report

## 影响清单
[TODO: 列出将创建或移动的章节、练习和变体路径。]

## 用户确认
[TODO: 记录用户确认执行的原始内容摘要。]

## 执行结果
[TODO: 记录目录创建、lint、修复和可选 git commit 结果。]

## 后续事项
[TODO: 列出仍需补充内容、失败 lint 或阻塞原因。]
```
