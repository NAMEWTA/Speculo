<canonical id="knowledge-prune" type="skill">
  <source-file path="SKILL.md" order="1">
---
id: knowledge-prune
type: skill
name: Knowledge Prune
description: dry-run 审计 workflow 声明的知识与策略 namespace，返回可安全删除、合并或改写的候选清单。
---

# Knowledge Prune

默认只分析，不自行写报告或修改文件。调用方负责 runtime context、用户确认和持久化。

## 输入

- `runtime-context` 返回的 workflow/state 根。
- `PERSISTENCE.md#persistence` 中 role 为 knowledge、policy 或 legacy-knowledge 的 namespace。
- 用户确认状态：`dry-run | confirmed`。

## 流程

1. 读取 `references/audit-rules.md`，仅扫描已声明且真实存在的 namespace。
2. 为每个候选收集当前代码、文档、active change、archive 和交叉引用证据。
3. 按 `delete | merge | rewrite | keep | needs-confirmation` 返回候选；dry-run 到此完成。
4. confirmed 模式重新验证真实路径包含关系，再逐项执行用户批准的动作并返回结果。

完成标准：每个候选都有来源、证据和风险；未确认时文件系统未发生变化；本 skill 未自行选择报告路径。

## 渐进披露

- `references/audit-rules.md`：生成候选、判定保护项或执行确认后的修改时读取。
  </source-file>
  <source-file path="references/audit-rules.md" order="2">
# Knowledge Prune Audit Rules

## 扫描范围

1. 读取目标 workflow `PERSISTENCE.md` 的 `<persistence>`，选择 role 为 `knowledge | policy | legacy-knowledge` 且真实存在的 store。
2. `create="lazy"` 但不存在的 store 记为 `missing`，不为审计而创建；`existing-only` store 只读。
3. 扫描代码、文档、active changes 和 archive 中对 ADR、CONTEXT、LESSONS、RULES 及具体文件名的引用。

## 候选

- 指向不存在知识文件的引用。
- 已 superseded、超过 30 天且无 active 引用的 ADR。
- 只含占位符、模板说明或空内容的长期知识文件。
- 当前代码、文档和 archive 均无证据支撑的领域术语。
- 重复、过时、仅适用单次 change 或已被规则/ADR 吸收的经验。

## 保护规则

- 仍被代码、文档、archive 或 active change 引用的内容归入 `keep`。
- RULES、术语冲突、ADR/CONTEXT 改写和 existing-only legacy store 一律归入 `needs-confirmation`。
- 删除前解析真实路径，确认仍位于目标 workflow state root 和已声明 store 内。
- 不跨 workflow 合并知识，不修改 docs-sync state。

完成标准：所有已声明且存在的知识 store 均已扫描，每个候选恰好属于一个分组。
  </source-file>
</canonical>
