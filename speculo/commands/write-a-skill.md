---
id: write-a-skill
type: command
name: Write A Skill
description: 创建或审查新的 Speculo skill 草稿
keywords: [skill, create, write, 技能]
---

# Write A Skill 命令

## 归档路径模式

产物目录：`speculo/.speculo/commands/<YYYY-MM-DD>-write-a-skill-<topic>/`

报告文件：`speculo/.speculo/commands/<YYYY-MM-DD>-write-a-skill-<topic>/report.md`

- `<YYYY-MM-DD>` 使用当前日期。
- `<topic>` 从 skill 名称或用户主题提取，使用小写 kebab-case；无法判断时使用 `skill`。
- 禁止把命令报告写入 `temp/`、系统临时目录或工作区内其他非规范位置。

## 调用的 skills

- `../skills/speculo-write/SKILL.md` — 用户要求创建、审查或改进可复用 skill 时读取；该 skill 自带 skill authoring 规范。

## 执行步骤

1. 读取 `../skills/speculo-write/SKILL.md`，并按其 `references/skill-authoring-sop.md` 内化 skill 规范。
2. 先收集技能用途、触发条件、输入输出、脚本需求和示例需求。
3. 写文件前列出将创建或修改的路径，并等待用户明确确认。
4. 用户确认后，按 Speculo 契约创建 `../skills/<name>/SKILL.md` 及可选 `references/`、`scripts/`、`examples/`。
5. 把设计摘要、影响路径和验证结果写入 `speculo/.speculo/commands/<YYYY-MM-DD>-write-a-skill-<topic>/report.md`。

## 产物模板（report.md）

> **服务命令：** `write-a-skill.md`
> **产物文件名：** `report.md`

```markdown
# Write A Skill Report

## 技能目标
[TODO: 描述新 skill 的任务、触发条件和使用者。]

## 影响路径
[TODO: 列出本次创建或修改的路径。]

## 用户确认
[TODO: 记录用户确认创建或修改文件的原始内容摘要。]

## 验证结果
[TODO: 记录 frontmatter、自包含性、渐进披露和脚本检查结果。]
```
