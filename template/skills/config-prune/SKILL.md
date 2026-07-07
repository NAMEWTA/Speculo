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
- 被 `commands/config-prune.md` 或 `workflows/dev/D-docs-sync` 等调用方委托执行审计
- 本 skill 只负责分析与生成候选清单，不自行删除文件、不自行写报告；持久化由调用方负责

## 输入

- `.config` 资产路径：`speculo/.speculo/.config/RULES.md`、`LESSONS.md`、`context/`、`adr/`
- 用户确认状态（dry-run 或 confirmed）

## 输出

- 按 `delete | merge | rewrite | keep | needs-confirmation` 分组的候选清单
- 每个候选包含：来源、证据、风险
- 不产生文件型持久化产物；结构化结果返回给调用方写入

## 执行步骤

1. 读取 `references/audit-rules.md`，按其中扫描范围与候选类型执行审计。
2. 如果用户没有明确确认，停止在 dry-run 候选清单。
3. 用户确认后，按 `references/audit-rules.md`「确认后执行」节操作。

## 边界

- 不删除仍被代码、文档、归档或 active change 引用的 ADR / CONTEXT。
- 不自动解决领域术语冲突；冲突项交给 `../../workflows/dev/M-domain-modeling/M-domain-modeling.md`。
- 不修改 docs-sync state；由 `../../workflows/dev/D-docs-sync/D-docs-sync.md` 推进基线。
- 不自行选择持久化位置；文件型产物由调用方写入规范路径。

## 渐进披露

- `references/audit-rules.md`：执行 dry-run 审计或确认后清理时读取。
