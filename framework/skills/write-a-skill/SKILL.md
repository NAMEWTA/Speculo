---
id: write-a-skill
type: skill
name: Write A Skill
description: 创建新的 Agent skill 结构和说明；当 command/write-a-skill 被调用或用户想新增可复用技能时使用。
---

# Write A Skill Wrapper

## 何时使用

当用户想创建、审查或改进一个可复用 Agent skill 时使用。

## 输入

- 技能覆盖的任务、触发条件、输入输出、示例和脚本需求
- 目标项目或 framework 的 skill authoring 约束

## 输出

- 新 skill 草稿、文件结构建议、审查清单和可选脚本建议

## 执行步骤

1. 读取并严格遵循 `source/SKILL.md`。
2. 若用于 Speculo framework，额外遵守 `docs/skill-authoring.md` 的 frontmatter 和自包含约束。
3. 修改或创建目标文件前，按调用方 command 的确认策略执行。

## 渐进披露

- `source/SKILL.md`：创建或审查 skill 时读取。
