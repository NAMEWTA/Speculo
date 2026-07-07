# Config Prune 审计规则

dry-run 候选生成与分组规则。`config-prune` skill 入口为调度器，执行审计时读取本文件。

## 扫描范围

1. 读取 `speculo/.speculo/.config/RULES.md`、`LESSONS.md`、`context/`、`adr/`；缺失路径记录为 `missing`，不自动创建。
2. 扫描当前仓库引用：
   ```bash
   rg -n "ADR-[0-9]{4}|[0-9]{4}-[a-z0-9-]+\\.md|CONTEXT|LESSONS|RULES" .
   ```
   排除 `node_modules/`、`dist/`、`.git/` 等生成或依赖目录。

## 候选类型

至少包含以下 dry-run 候选：

- 指向不存在 ADR 的正文引用或索引行。
- 标记为 superseded 且超过 30 天、无活跃引用的 ADR。
- 只含 `.gitkeep`、TODO、空占位或模板说明的长期知识文件。
- CONTEXT 中当前代码、文档和归档均无证据支撑的术语。
- LESSONS 中重复、过期、只适用单次任务或已被 RULES/ADR 吸收的经验。

## 分组输出

按 `delete | merge | rewrite | keep | needs-confirmation` 分组；每个候选必须包含来源、证据和风险。

## 确认后执行

- 删除文件前再次检查路径仍位于 `speculo/.speculo/.config/`。
- 修改 `RULES.md` 前必须确认具体条目；不能批量隐式改规则。
- 执行后列出实际改动和跳过项。

## 边界

- 不删除仍被代码、文档、归档或 active change 引用的 ADR / CONTEXT。
- 术语冲突交给 `../../workflows/dev/M-domain-modeling/M-domain-modeling.md`。
- docs-sync state 由 `../../workflows/dev/D-docs-sync/D-docs-sync.md` 推进。
