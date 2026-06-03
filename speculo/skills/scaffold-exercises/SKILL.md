---
id: scaffold-exercises
type: skill
name: Scaffold Exercises
description: 创建课程章节与练习目录骨架并验证 lint；当 command/scaffold-exercises 被调用或用户要求搭建练习时使用。
---

# Scaffold Exercises Skill Wrapper

## 何时使用

当项目包含课程练习结构，用户要求创建章节、练习、problem、solution 或 explainer 桩时使用。

## 输入

- 章节和练习计划、编号、名称、变体类型
- 项目的练习 lint 命令和 git 操作策略

## 输出

- 练习目录影响清单、创建结果、lint 结果和可选提交记录

## 执行步骤

1. 读取并严格遵循 `source/SKILL.md`。
2. 因该 skill 可能创建目录、运行 lint 和提交 git，调用方 command 必须先列影响清单并取得用户确认。
3. 本 skill 不直接写 `.speculo/` 或 `.status.json`；执行报告由调用方 command 归档。

## 渐进披露

- `source/SKILL.md`：创建练习骨架时读取。
