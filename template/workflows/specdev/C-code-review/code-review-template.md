---
schema_version: 1
artifact: code-review
change: <YYYY-MM-DD-topic>
review_id: CR-001
fixed_point: <sha>
head: <sha>
status: request-changes
standards_result: request-changes
specification_result: skipped
spec_sources: []
standards_sources: []
created_at: <ISO-8601>
---

# Code Review CR-001

## Fixed Input

- **Diff:** `git diff <fixed_point>...<head>`
- **Commits:** `git log <fixed_point>..<head> --oneline`
- **Scope:**

## 标准

| Severity | Path / block | Finding | Authority | Satisfied when |
|---|---|---|---|---|

## 规范

| Severity | Requirement | Finding | Source | Satisfied when |
|---|---|---|---|---|

规范不存在时写 `skipped:no-spec`，不伪造通过。

## Summary

- **Standards findings:**
- **Specification findings:**
- **Most severe standards finding:** none / ...
- **Most severe specification finding:** none / ...
- **Next Work:** completed / `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>` / `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>`

## 审查证据复用（仅实际发生时填写）

记录原 CR/Evidence locator、fixed/head/diff、规范/标准/指令与 Skill/reference 摘要、工具/环境相关证据、两轴隔离核对、复用或重跑的轴与原因。未发生时写“不适用”；本节不是通过声明，也不改变原始审查结果。
