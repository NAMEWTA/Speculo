# Attempt Verification

| Field | Value |
| --- | --- |
| Change / attempt | {change} / {attempt_id} |
| Target | {target} |
| Target profile / digest | {target_profile_path} / {target_profile_digest} |
| Verification state | {verification_state_path} |
| Started / ended | {started_at} / pending |
| Outcome | pending |

## Target Re-read

## Identity Assertion Results

| Assertion | Comparison | Expected | Actual | Matched | Evidence |
| --- | --- | --- | --- | --- | --- |

## Gate Results

| Sequence | Gate | Status | Evidence |
| --- | --- | --- | --- |

## Verification Matrix

| Check | Required | Method/environment | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |

## Immutable Artifacts and Target-side Digests

## Health, Ports and Dependencies

## Smoke and Business Signals

每个 probe 使用自身允许的 HTTP 状态、业务码与认证要求；记录瞬时失败和连续成功数。

## Restart and Persistence

## Resource and Stability Window

## Multi-instance Convergence

## Data and Migration

记录每个 protection id 的 backup/waiver/not-required/failed、evidence digest、readability 和 restore 验证。production 不允许 waiver；local waiver 必须与 plan 的精确授权一致。

## Recovery, Previous Release and Retained Assets

## Logs, Monitoring and Alerts

## Deviations and Residual Risks

## Completion Decision

本文件是 `verification-state.json` v1 的无密钥 Markdown 投影。结构化 state 缺失、摘要不匹配、required Gate/verification 未通过或 HANDOFF 含 secret 时不得 completed。
