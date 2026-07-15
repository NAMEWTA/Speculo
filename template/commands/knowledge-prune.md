---
id: knowledge-prune
type: command
name: Knowledge Prune
description: dry-run 审计指定 workflow 声明的知识 namespace，生成可删除、合并或改写的候选清单
keywords: [knowledge, prune, rules, lessons, context, adr]
---

# Knowledge Prune 命令

## 报告

写入 `speculo/.speculo/commands/knowledge-prune/<YYYY-MM-DD>-<workflow>-<topic>[-NN].md`。报告记录扫描 namespace、证据、候选分组、风险和确认结果。

## 执行

1. 读取 `../skills/runtime-context/SKILL.md`，解析 `speculo/config.json`（不存在时以默认值静默降级），选择 workflow 并解析其 `PERSISTENCE.md` 声明的 knowledge/policy namespace。
2. 读取 `../skills/knowledge-prune/SKILL.md`，默认执行 dry-run，生成 `delete | merge | rewrite | keep | needs-confirmation` 清单。
3. 将报告写入 command 专属目录；无用户确认时不删除、重命名或改写任何 namespace。
4. 用户确认后再次执行路径包含检查，逐项操作并复查 git、引用和报告结果。
