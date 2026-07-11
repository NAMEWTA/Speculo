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
- `WORKFLOW.md#persistence` 中 role 为 knowledge、policy 或 legacy-knowledge 的 namespace。
- 用户确认状态：`dry-run | confirmed`。

## 流程

1. 读取 `references/audit-rules.md`，仅扫描已声明且真实存在的 namespace。
2. 为每个候选收集当前代码、文档、active change、archive 和交叉引用证据。
3. 按 `delete | merge | rewrite | keep | needs-confirmation` 返回候选；dry-run 到此完成。
4. confirmed 模式重新验证真实路径包含关系，再逐项执行用户批准的动作并返回结果。

完成标准：每个候选都有来源、证据和风险；未确认时文件系统未发生变化；本 skill 未自行选择报告路径。

## 渐进披露

- `references/audit-rules.md`：生成候选、判定保护项或执行确认后的修改时读取。
