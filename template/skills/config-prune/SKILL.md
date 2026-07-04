---
id: config-prune
type: skill
name: Config Prune
description: dry-run 审计 .config 中可安全删除或合并的过期知识资产，生成分组候选清单；当用户要求清理 .config、prune config、审计知识资产过期项、或通过 command/config-prune 调用时使用。
---

# Config Prune

⚠️ **默认 dry-run。** 本 skill 涉及 `.config` 知识资产删除或合并，必须先列出候选清单并征求用户确认。没有确认时只输出候选清单，不删除、不重命名、不改 RULES。

## 何时使用

- 用户要求"清理 .config"、"prune 配置"、"审计 ADR/CONTEXT/LESSONS 过期项"
- 用户要求"看看哪些知识资产可以删"、"检查过期的 ADR"
- 被 `commands/config-prune.md` 或 `workflows/dev/D-docs-sync` 等调用方委托执行审计
- 本 skill 只负责分析与生成候选清单，不自行删除文件、不自行写报告；持久化由调用方负责

## 输入

- `.config` 资产路径：`speculo/.speculo/.config/RULES.md`、`LESSONS.md`、`context/`、`adr/`；缺失路径记录为 `missing`，不自动创建
- 仓库引用扫描命令：
  ```bash
  rg -n "ADR-[0-9]{4}|[0-9]{4}-[a-z0-9-]+\\.md|CONTEXT|LESSONS|RULES" .
  ```
  排除 `node_modules/`、`dist/`、`.git/` 等生成或依赖目录
- 用户确认状态（dry-run 或 confirmed）

## 输出

- 按 `delete | merge | rewrite | keep | needs-confirmation` 分组的候选清单
- 每个候选包含：来源、证据、风险
- 不产生文件型持久化产物；结构化结果返回给调用方写入

## 执行步骤

1. 读取 `speculo/.speculo/.config/RULES.md`、`LESSONS.md`、`context/`、`adr/`；缺失路径记录为 `missing`，不自动创建。
2. 扫描当前仓库引用：
   ```bash
   rg -n "ADR-[0-9]{4}|[0-9]{4}-[a-z0-9-]+\\.md|CONTEXT|LESSONS|RULES" .
   ```
   排除 `node_modules/`、`dist/`、`.git/` 等生成或依赖目录。
3. 生成 dry-run 候选，至少包含：
   - 指向不存在 ADR 的正文引用或索引行。
   - 标记为 superseded 且超过 30 天、无活跃引用的 ADR。
   - 只含 `.gitkeep`、TODO、空占位或模板说明的长期知识文件。
   - CONTEXT 中当前代码、文档和归档均无证据支撑的术语。
   - LESSONS 中重复、过期、只适用单次任务或已被 RULES/ADR 吸收的经验。
4. 按 `delete | merge | rewrite | keep | needs-confirmation` 分组输出完整清单；每个候选必须包含来源、证据和风险。
5. 如果用户没有明确确认，停止在 dry-run 候选清单。
6. 用户确认后，只执行确认清单中的操作：
   - 删除文件前再次检查路径仍位于 `speculo/.speculo/.config/`。
   - 修改 `RULES.md` 前必须确认具体条目；不能批量隐式改规则。
   - 执行后列出实际改动和跳过项。

## 边界

- 不删除仍被代码、文档、归档或 active change 引用的 ADR / CONTEXT。
- 不把低信号归档内容写回长期知识资产。
- 不自动解决领域术语冲突；冲突项交给 `../workflows/dev/M-domain-modeling/M-domain-modeling.md`。
- 不修改 docs-sync state；由 `../workflows/dev/D-docs-sync/D-docs-sync.md` 推进基线。
- 不自行选择持久化位置；文件型产物由调用方写入规范路径。

## 渐进披露

无 `references/`；本 skill 的完整执行规则已在入口中。
