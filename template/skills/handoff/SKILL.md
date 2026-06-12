---
id: handoff
type: skill
name: Handoff
description: 将当前对话压缩成交接文档；当用户需要另一个 agent、另一个会话或 command/handoff 接手继续工作时使用。
---

# Handoff

## 何时使用

当当前上下文需要交给另一个 agent、另一个会话或异步执行者继续时使用。

如果用户提供参数，把参数视为下一次会话的重点，并据此调整交接文档的内容取舍。

## 输入

- 当前对话目标、已完成工作和未完成事项
- 已修改或需要关注的文件路径、命令、测试结果和阻塞点
- 用户提供的下一次会话重点
- 可推荐给下一个 agent 的 skill 名称

## 输出

- 保存到规范命令产物目录的脱敏交接文档：`speculo/.speculo/commands/<YYYY-MM-DD>-handoff-<topic>/handoff.md`
- 文档路径、主题目录名和命名依据
- 3-5 条极简摘要
- 推荐技能清单

## 命名与位置

- 交接文档必须写入调用方命令产物目录：`speculo/.speculo/commands/<YYYY-MM-DD>-handoff-<topic>/handoff.md`。
- `<YYYY-MM-DD>` 使用当前日期。
- `<topic>` 从用户目标、项目名、变更名或下一次会话重点提取，使用小写 kebab-case；无法判断时使用 `session`。
- 安装后的实际项目位置是 `speculo/.speculo/commands/<YYYY-MM-DD>-handoff-<topic>/handoff.md`。
- 禁止写入 `temp/`、系统临时目录、仓库根目录临时文件或其他非 Speculo 规范位置。

## 执行步骤

1. 收集当前目标、背景、已做工作、关键文件、验证结果、剩余风险和下一步。
2. 删除 API key、密码、token、个人身份信息和其他敏感内容。
3. 不复制 PRD、计划、ADR、issue、commit、diff 或其他已有产物正文；改用路径、URL 或 commit 引用。
4. 添加 `推荐技能` 部分，列出下一个 agent 应优先读取或调用的技能。
5. 创建 `speculo/.speculo/commands/<YYYY-MM-DD>-handoff-<topic>/`，并把交接文档写入其中的 `handoff.md`。
6. 返回文档路径、主题目录名、3-5 条极简摘要和推荐技能清单。

## references/ 与 scripts/

- 无 `references/` 子文档；该 skill 的完整执行规则在本入口中。
- 无 `scripts/`；直接按本文件步骤整理和写入交接文档。
