# Ops Attempt Summary

| Field | Value |
| --- | --- |
| Scope / project | {scope} / {project_id} |
| Change / attempt | {change} / {attempt_id} |
| Kind | deploy / remediation / rollback / verification-only |
| Triggered by | {triggered_by} |
| Plan / digest | {plan_path} / {plan_digest} |
| Approval | {approval_path} |
| Target profile / digest | {target_profile_path} / {target_profile_digest} |
| Verification state | {verification_state_path} |
| Handoff | {handoff_path} |
| Started / ended | {started_at} / pending |
| Result | running |

## Preflight

记录 profile/plan/approval 摘要、控制面 identity 重采集、protected targets、deployment root、数据保护和恢复资产；不得回显 secret。

## Gate Results

| Sequence | Gate | Status | Required verification | Evidence |
| --- | --- | --- | --- | --- |

## Batch and Operation Results

## Actual Mutations

所有事实事件逐行写入 append-only `journal.jsonl`，每行使用 journal-event v1；本摘要不替代 typed journal。

## Diagnostics Performed

## Failed and Not-run Operations

## Redactions

## Deviations and Residual Risk

## Data Protection and Recovery Assets

## Verification or Next Route

terminal attempt 引用 `verification-state.json`；成功、回滚或 completed abandoned 还必须引用无密钥 `HANDOFF.md`。
