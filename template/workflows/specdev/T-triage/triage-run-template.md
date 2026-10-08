---
schema_version: 1
artifact: triage-run
id: TRI-001
mode: release-preflight
status: planned
repo: owner/repo
change: null
commit_sha: null
npm_target: unknown
targets: []
updated_at: <ISO-8601>
---

# 独立操作记录

## Targets
明确 repo、run/alert、workflow、SHA、tag；发布时逐包列 package、registry、version、dist-tag、required/not-required。
同步填写 frontmatter targets 数组，每项为 {"kind":"npm|github-release|ci|security","identity":"准确包名/tag/run/alert","required":true,"version":null,"registry":null,"dist_tag":null,"observed":"pending|verified|failed|unknown","receipt":null}。npm required 项必须填 version、registry、dist_tag；回读后填写 receipt 证据引用。预检通过允许 pending；release completed 要求每个 required 项 verified 且有 receipt。

## Plan
操作步骤与完成标准。恢复沿用本记录，保留先前尝试。

## Evidence
源证据、命令/退出码、脱敏日志、预检与目标判定理由；无法读取为 unknown。

## Authorization
每个副作用的用户授权出处、目标和内容；尚无授权时只准备计划。

## Receipts
逐步回执与执行后读回；completed 必须列出每个所需目标的确认结果。

## Recovery
失败点、已完成动作、状态未知项、漂移与恢复条件。
