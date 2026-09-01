# Ops Deployment Handoff

| Field | Value |
| --- | --- |
| Scope / project | {scope} / {project_id} |
| Change / attempt | {change} / {attempt_id} |
| Mode / environment | {operation_mode} / {environment_class} |
| Plan / approval | {plan_path} / {approval_path} |
| Verification state | {verification_state_path} |
| Verdict | passed / failed / blocked |

## Target and Control-plane Identity

只列非敏感 identity assertion、匹配结果与 evidence locator。

## Source and Immutable Artifacts

## Gate Results

## Services and Runtime Convergence

## Semantic Probes and Stability Windows

## Data Protection

## Recovery and Previous Release

## Retained Candidates and Rollback Assets

## Remaining Risks and Operator Follow-up

不得包含密码、token、私钥、cookie、完整连接串或 secret 值。凭据仅记录 provider/受控 locator、版本和 presence 状态。
