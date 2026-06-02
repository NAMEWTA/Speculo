---
id: handoff
type: command
name: Handoff
description: 生成脱敏交接文档，供另一个 agent 或会话接手
keywords: [handoff, 交接, summary, resume]
---

# Handoff 命令

## 归档路径模式

可选产物归档至：`../.speculo/commands/<YYYY-MM-DD>-handoff-<topic>/`

## 调用的 skills

- `../skills/handoff/SKILL.md` — 需要把当前对话压缩成交接文档时读取。

## 执行步骤

1. 读取 `../skills/handoff/SKILL.md`。
2. 按 source skill 要求，把交接文档保存到用户操作系统临时目录，而不是当前工作区。
3. 删除 API key、密码、PII 和其他敏感信息。
4. 若用户要求项目内留痕，只把交接文档路径、摘要和推荐技能写入 `../.speculo/commands/<YYYY-MM-DD>-handoff-<topic>/pointer.md`。

## 产物模板（pointer.md，可选）

> **服务命令：** `handoff.md`
> **产物文件名：** `pointer.md`

```markdown
# Handoff Pointer

## 临时文件路径
[TODO: 记录操作系统临时目录中的交接文档路径。]

## 摘要
[TODO: 用 3-5 条概括交接内容，不复制敏感信息。]

## 推荐技能
[TODO: 列出下一个 agent 推荐读取的 skill。]
```
