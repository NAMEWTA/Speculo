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
