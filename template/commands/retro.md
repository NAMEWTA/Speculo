---
id: retro
type: command
name: Speculo Retro
description: 复盘 Speculo commands/workflows 使用痛点，深度分析后经确认用 gh 提交改进 issue
keywords: [retro, 复盘, 痛点, feedback, issue, 优化, 反馈]
---

# Retro 命令

⚠️ **本命令在最后一步会通过 `gh` 向外部仓库创建 issue（外部写操作）。AI 必须先列出将要创建的 issue 清单与目标仓库并征求用户确认，确认前只输出计划，不调用 `gh`。**

## 归档路径模式

产物目录：`speculo/.speculo/commands/<YYYY-MM-DD>-retro-<topic>/`

报告文件：`speculo/.speculo/commands/<YYYY-MM-DD>-retro-<topic>/report.md`

- `<YYYY-MM-DD>` 使用当前日期。
- `<topic>` 从复盘范围或用户主题提取，使用小写 kebab-case；无法判断时使用 `speculo`。
- 禁止把命令报告写入 `temp/`、系统临时目录或工作区内其他非规范位置。

## 调用的 skills

- `../skills/speculo-retro/SKILL.md` — 复盘 Speculo 使用痛点、深度分析并产出去重/分级/根因化的 issue-ready 提案时读取。
- `../skills/github-npm-ops/SKILL.md` — 需要用 `gh` 去重（`gh issue list --search`）与创建 issue（`gh issue create`）时读取，其 `references/issue-pr-triage.md` 提供检索、标签体系与命令模板。

## 执行步骤

1. 读取 `../skills/speculo-retro/SKILL.md`，按其规范采集信号（对话上下文、`speculo/.speculo/commands/`、`speculo/.speculo/<cat>/<change>/.status.json`、`speculo/.speculo/.config/LESSONS.md`）并深度分析。
2. 用该 skill 产出规范化复盘结论：去重、分级、根因化的 issue-ready 提案清单，附丢弃/合并说明与每条处置建议。
3. 创建规范命令产物目录 `speculo/.speculo/commands/<YYYY-MM-DD>-retro-<topic>/`，把复盘结论写入 `report.md`。
4. **解析目标仓库**：默认框架反馈上游 `NAMEWTA/Speculo`；用户在请求中显式指定其他 `owner/repo` 时覆盖默认。无论如何，在调用 `gh` 前回显解析到的 `owner/repo`，让用户确认或改正。
5. **去重**：读取 `../skills/github-npm-ops/SKILL.md` 的 `references/issue-pr-triage.md`，对每条 `disposition: file-issue` 的提案用 `gh issue list --repo <owner/repo> --search "<关键词>" --state all --limit 20` 检索；命中语义重复的默认跳过并记录 `dup_of`，仅当用户明确要求才补提。
6. **外部写操作边界**：向用户展示将要创建的 issue 清单（标题、类型/优先级标签、正文摘要、目标 `owner/repo`）与去重结果，等待用户明确确认。没有确认时只输出计划，不调用 `gh`。
7. 用户确认后，按优先级倒序逐条执行 `gh issue create --repo <owner/repo> --title "<title>" --body "<body>" --label "<type>,<priority>[,<area>]"`（多行正文可用 `--body-file` 指向不保留的临时文件）。任一条失败时停止后续创建，报告已建/未建清单，不重复创建同一条。
8. 把每条提案的最终 issue 编号/URL 回写进 `report.md` 的「提交结果」小节；返回 `report.md` 路径、3-5 条复盘摘要和已创建 issue 链接清单。

## 产物模板（report.md）

> **服务命令：** `retro.md`
> **产物文件名：** `report.md`

```markdown
# Speculo Retro Report

## 复盘范围
[TODO: 本次复盘覆盖的 command / workflow 与时间/会话范围。]

## 信号来源
[TODO: 列出采集到的证据出处：对话节点、`speculo/.speculo/...` 产物路径、`.status.json` 字段、LESSONS。]

## 改进提案
[TODO: 按优先级倒序列出每条提案：标题 / 类型 / 优先级 / 根因 / 建议改动 / 验收标准 / 受影响资产 / 去重结论。]

## 丢弃与降级项
[TODO: 列出被合并、丢弃或降级为「仅记教训」的项及原因。]

## 目标仓库
[TODO: 解析到的 owner/repo 与用户确认结果。]

## 用户确认记录
[TODO: 记录用户对 issue 清单与目标仓库的确认原文摘要。]

## 提交结果
[TODO: 列出每条提案对应的 issue 编号/URL，或未提交原因（重复/失败/用户撤回）。]
```
