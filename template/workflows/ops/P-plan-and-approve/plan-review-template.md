# Deployment Implementation Plan

| Field | Value |
| --- | --- |
| Scope / project | {scope} / {project_id} |
| Change / plan | {change} / {plan_id} |
| Supersedes | {supersedes_plan_path} |
| Triggered by attempt | {triggered_by_attempt} |
| Plan digest | {plan_digest} |
| Depth | lite / standard / deep |
| Source revision | {source_revision} |
| Target fingerprint | {target_fingerprint} |
| Target profile / digest | {target_profile_path} / {target_profile_digest} |
| Mode / environment | {operation_mode} / {environment_class} |
| Deployment root | {deployment_root} |
| Approval expires | {expires_at} |

## Outcome, Non-goals and Stop Conditions

## Input Bindings

## Changes Since Previous Plan

旧 plan v2 只读；当前批准请求必须针对完整 plan v3，不得把旧批准投影到本版本。

## Target Identity and Ownership

列出 identity assertions、确认 evidence、owned/protected/unknown targets 和所有漂移停止条件。

## Read, Write and Forbidden Roots

## Batch Approval Matrix

| Batch | Purpose | Depends on | Gate IDs | Risk | External/global effects | Rollback | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Required Gate DAG

| Gate | Depends on gates | After batches | Required verification | Stop condition |
| --- | --- | --- | --- | --- |

Gate failed/blocked 后不得继续 operation 或提升活动指针；后续 Gate 只能 skipped。

## Global Environment Changes

| Key | Target scope | Value source reference | Impact | Rollback | Batch |
| --- | --- | --- | --- | --- | --- |

不得包含环境变量值。

## External Mutations

## Immutable Candidates, Staging and Activation

列出本地/目标端摘要、staging、activation target、previous ref、原子切换与保留策略。可变 tag 不构成不可变身份。

## Operations

每项记录 operation、batch、adapter/kind、target、working directory、preconditions、write set、preview、apply、postconditions、rollback、privilege、risk 和 evidence。

## Verification and Stabilization

每个 verification id 单独记录预期 HTTP 状态、业务码、认证要求、稳定窗口和收敛组，不使用全局“HTTP 200 即成功”。

## Data Protection

| Protection | Data mutation | Backup/restore evidence | Environment | Waiver | Batch |
| --- | --- | --- | --- | --- | --- |

production 不接受 waiver。local waiver 必须包含精确用户决定 locator、exact scope、对象身份、零冲突 preflight 和 forward-only 恢复边界。

## Rollback Strategy

## Residual Risks and Blockers

## Approval Request

请在一条回复中明确批准准备执行的 batch ids。批准只覆盖本 plan v3 摘要中的这些批次，不覆盖计划外操作、原生权限扩张、cleanup、归档或未列出的回滚/数据恢复。
