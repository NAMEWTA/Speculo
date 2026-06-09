---
id: handoff
type: command
name: Handoff
description: 生成脱敏交接文档，供另一个 agent 或会话接手
keywords: [handoff, 交接, summary, resume]
---

# Handoff 命令

## 归档路径模式

产物目录：`../.speculo/commands/<YYYY-MM-DD>-handoff-<topic>/`

交接文件：`../.speculo/commands/<YYYY-MM-DD>-handoff-<topic>/handoff.md`

- `<YYYY-MM-DD>` 使用当前日期。
- `<topic>` 从用户目标或交接主题提取，使用小写 kebab-case；无法判断时使用 `session`。
- 安装后的实际项目位置是 `speculo/.speculo/commands/<YYYY-MM-DD>-handoff-<topic>/handoff.md`。
- 禁止把交接文档写入 `temp/`、系统临时目录或工作区内其他非规范位置。

## 调用的 skills

- `../skills/handoff/SKILL.md` — 需要把当前对话压缩成交接文档时读取。

## 执行步骤

1. 读取 `../skills/handoff/SKILL.md`。
2. 按 `../skills/handoff/SKILL.md` 要求，生成脱敏交接文档。
3. 创建规范命令产物目录 `../.speculo/commands/<YYYY-MM-DD>-handoff-<topic>/`。
4. 把交接正文写入 `../.speculo/commands/<YYYY-MM-DD>-handoff-<topic>/handoff.md`。
5. 删除 API key、密码、PII 和其他敏感信息；不要复制 PRD、计划、ADR、issue、commit、diff 或其他已有产物正文。
6. 返回 `handoff.md` 路径、3-5 条摘要和推荐技能清单。

## 产物模板（handoff.md）

> **服务命令：** `handoff.md`
> **产物文件名：** `handoff.md`

```markdown
# Handoff

## 目标
[TODO: 概括当前任务目标和用户下一步重点。]

## 已完成
[TODO: 列出已完成工作、关键决策和重要文件路径。]

## 未完成
[TODO: 列出下一步、阻塞点和剩余风险。]

## 验证
[TODO: 记录已运行命令、结果和未运行原因。]

## 推荐技能
[TODO: 列出下一个 agent 推荐读取的 skill。]

## 摘要
[TODO: 用 3-5 条概括交接内容，不复制敏感信息。]
```
