---
id: github-npm-ops
type: skill
name: GitHub npm Ops
description: GitHub 仓库运营与 npm 发布原子能力；用于 issue/PR/CI/security 治理、release.yml 配置、npm provenance 发布、tag 发版、三端验证和失败恢复。
---

# GitHub npm Ops

## 何时使用

当 command 或 workflow 需要处理 GitHub 仓库运营、CI 排障、安全告警、npm 包发布、GitHub Release、release notes 注入、tag 触发发布或发布失败恢复时使用。

## 输入

- GitHub 仓库上下文、目标分支、目标版本号或待处理 issue / PR / run id
- npm 包信息：`package.json`、包名、版本、发布分支、是否 scoped
- 发布流水线文件：通常是 `.github/workflows/release.yml`
- CHANGELOG 类文档路径，默认优先识别 `CHANGELOG.md` 或 `CHANGELOGS.md`
- 可选：调用方 workflow 提供的 `speculo/.speculo/dev/docs-sync-state.json` 与 docs-sync 报告

## 输出

- GitHub issue / PR / CI / security 的操作建议或执行结果
- npm 发布前置检查结论
- release.yml 配置、tag 发版步骤、三端验证结果
- 失败恢复路径：可重试同 tag、只补 GitHub Release、或必须 bump 新版本
- 调用方可归档的发布摘要、风险、验证命令和后续动作

## 执行步骤

1. 先判定任务类型：日常治理、发布基础设施搭建、正式发版、失败恢复。
2. 发布类任务先执行只读前置检查：分支、工作区、远端、`gh auth`、Node/包管理器、`release.yml`、tag 冲突、docs-sync state。
3. 需要同步对外文档时，交给调用方读取 `../workflows/dev/D-docs-sync/D-docs-sync.md`；本 skill 不自行选择持久化目录，只把结果交给调用方写入其声明的 `speculo/.speculo/...` 规范路径。
4. 正式发版必须保证 release commit 同时包含版本 bump 与 CHANGELOG 迁移，并且 tag 精确指向 release commit。
5. release workflow 必须包含 tag/package version 校验、质量闸、可选 npm publish、CHANGELOG release notes 注入、GitHub Release 创建。
6. 发布完成后做三端验证：workflow success、GitHub Release 非 draft 且正文非空、如流水线包含 npm publish 则 `npm view` 版本与 dist-tag 一致。
7. 失败恢复先判断 npm 是否已成功上传；一旦 npm 已上传，同版本号不可重发，只能补后续动作或 bump 新版本。

## 渐进披露

- `references/release-pipeline.md`：执行正式 npm/GitHub release 编排时读取。
- `references/preflight-checklist.md`：发布前只读检查或 dry-run 时读取。
- `references/publish-detection.md`：判断 release workflow 是否实际发布 npm 包时读取。
- `references/package-json-checklist.md`：检查 npm 包元数据、bin、files、provenance 相关字段时读取。
- `references/setup-npm-token.md`：配置或排查 `NPM_TOKEN`、2FA bypass、scope 权限时读取。
- `references/workflow-yaml-reference.md`：创建或修复 `.github/workflows/release.yml` 时读取。
- `references/release-notes-injection.md`：Release 正文为空、需要从 CHANGELOG 注入 release notes 时读取。
- `references/version-bump-flow.md`：执行版本 bump、release commit、tag、push 时读取。
- `references/failure-recovery.md`：发布编排失败、需要判断是否能重试同 tag 时读取。
- `references/troubleshooting-playbook.md`：npm/GitHub Actions 具体错误码排障时读取。
- `references/issue-pr-triage.md`：issue / PR 分诊、标签、社区响应时读取。
- `references/ci-and-security-ops.md`：CI 失败、安全告警、Dependabot / secret scanning 处理时读取。
