---
schema_version: 1
artifact: pull-request
change: <YYYY-MM-DD-topic>
id: PR-001
requested: true
delivery_target: draft
status: planned
repo: owner/repo
base_sha: <40-hex>
head_sha: <40-hex>
body_sha256: <64-hex>
verification: pending
url: null
updated_at: <ISO-8601>
---

# PR 交付记录

## Summary
问题、最终行为、仓库模板及 AI 协助说明。

## Evidence
测试命令、退出码、固定提交、未验证项与证据引用。

## Before / After
适用时给出前后行为或视觉证据；不适用注明原因。

## Merge Risk
回退是否可行、影响范围、数据/兼容性风险和回退条件。

## Authorization
动作、准确目标与用户授权出处；无授权时仅 dry-run。

## Receipt
marker、number/URL、读回结果、状态与尝试。

## Recovery
失败步骤、已完成动作、远程漂移和恢复条件。
