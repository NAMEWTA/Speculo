---
id: github-npm-ops
type: skill
name: GitHub npm Ops
description: 提供 GitHub issue/PR/CI/security 治理与 npm provenance 发布、验证和失败恢复原子能力。
---

# GitHub npm Ops

## 输入

- 仓库、目标分支、issue/PR/run id 或目标版本。
- package metadata、release workflow、CHANGELOG 和可选 docs-sync state。

## 分支

1. **Issue/PR**：读取 `references/issue-pr-triage.md`；完成标准是分类、去重、标签和外部写入计划均有证据。
2. **CI/Security**：读取 `references/ci-and-security-ops.md`；完成标准是失败或告警根因可复现，修复动作与验证分离。
3. **发布预检**：读取 `references/preflight-checklist.md`、`references/package-json-checklist.md` 和 `references/publish-detection.md`；完成标准是分支、认证、版本、tag、流水线和发布目标均已判定。
4. **发布实施**：按需读取 `references/release-pipeline.md`、`references/workflow-yaml-reference.md`、`references/version-bump-flow.md`、`references/release-notes-injection.md` 和 `references/setup-npm-token.md`；完成标准是版本/CHANGELOG 同 commit、tag 精确指向该 commit，外部动作均已确认。
5. **失败恢复**：读取 `references/failure-recovery.md` 与具体错误时的 `references/troubleshooting-playbook.md`；完成标准是已判定 npm 是否上传，并选择可重试同 tag、补后续动作或必须 bump 中唯一分支。

## 输出

- 操作建议或经确认后的执行结果、风险和验证证据。
- 发布后三端验证：workflow success、GitHub Release 非 draft 且正文非空、需要发布 npm 时 registry 版本/dist-tag 一致。

本 skill 不推进 docs-sync state，也不自行选择报告或 workflow knowledge 路径。
