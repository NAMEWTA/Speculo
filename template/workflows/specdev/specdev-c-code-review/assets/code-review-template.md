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

- **Comparison mode:** baseline / range / commit / pr
- **Diff:** 实际冻结的 argv；baseline 采用 `git diff <fixed_point>...<head>`
- **Diff digest:** 实际 diff 字节的 SHA-256
- **Original base/head:** 原始不可变引用；fixed_point 为实际比较起点
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
- **Next Work:** completed / `<Path>{roots.workflows}/specdev/specdev-t-tickets/SKILL.md</Path>` / `<Path>{roots.workflows}/specdev/specdev-s-spec/SKILL.md</Path>`

## 审查证据复用（仅实际发生时填写）

记录原 CR/Evidence locator、fixed/head/diff、规范/标准/指令与 Skill/reference 摘要、工具/环境相关证据、审查者独立身份与派遣/返回核对、复用或重跑的轴与原因。未发生时写“不适用”；本节不是通过声明，也不改变原始审查结果。

## 比较语义与证据有效期

记录 baseline/range/commit/pr、实际 diff argv/digest、原 base/head 与 fixed point、消费者和相关配置/规范版本。合法 no-diff 不创建本 CR；非法引用和根提交无 committed baseline 明确报告。head 或相关输入变更后，核对受影响审查与验证，不沿用旧通过。

## 独立审查记录的填写

按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/review-evidence.md</Path> 在本文实际生成 `Independent Review`、固定输入、原始 reviewer 输出和 Lead 核验段。完成前必须有真实独立身份与两轴结果；不要预填通过或用模板段落替代证据。
