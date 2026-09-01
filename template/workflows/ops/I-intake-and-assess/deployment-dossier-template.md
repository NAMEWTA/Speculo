# Deployment Dossier

| Field | Value |
| --- | --- |
| Project / change | {project_id} / {change} |
| Source root | {source_root} |
| Source revision | {source_revision} |
| Target snapshot | {snapshot_path} |
| Target profile / digest | deployment/target-profile.json / {target_profile_digest} |
| Operation mode | audit / takeover / fresh / release / upgrade / rollback |
| Environment class | local / shared-nonprod / production |
| Existing state | absent / present / unknown |
| Identity confirmed | true / false |
| Deployment root | {deployment_root} |
| Existing project SOP | {runbook_paths} |
| Readiness | blocked / ready |

## Requested Outcome and Constraints

## Component and Runtime Map

## Build, Artifact, Start and Restart

## Middleware and External Dependencies

## Configuration Matrix

仅记录 key、scope、required、secret 和 source reference。

## Ports, Exposure and Health

## Data, Volumes, Migration and Backup

## Deployment Options and Tradeoffs

## Selected Method and Target Fit

## Target and Control-plane Identity

逐项列出 provider、key、comparison、非敏感 expected 与 evidence。Compose project、有序 files、env file、services、labels/image identity 和 bind host 不得折叠成单一目录名判断。

## Ownership and Difference Classification

列出 owned/protected/unknown targets；每项差异只能是 expected、safe-reconcile、requires-backup、ownership-conflict 或 unknown。

## Immutable Artifacts, Staging and Activation

## Required Gates and Stability Expectations

## Security and Required Privileges

## Secret Requirements

只记录 key、provider/受控 source reference、version 和 presence requirement，不保存值。

## Prior SOP, Known Failures and Applicable ADRs

## Unknowns and Dynamic Probes

## Planning Preconditions

## Evidence Sources
