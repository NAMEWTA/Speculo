# npm + GitHub Release 编排

把一次 npm 包发布拆成可验证的单向流水线：前置检查 -> 普通改动 commit -> docs-sync -> release commit -> tag -> workflow 监控 -> 三端验证 -> docs-sync 记录 release 节点。

## Iron Law

- 禁止提交破坏构建的代码；release 前必须运行仓库声明的 lint / test / build 或等价质量闸。
- docs-sync 必须由调用方按 `../../../commands/docs-sync.md` 执行；输入起点来自最后修改 state 文件的 commit，终点是运行前清洁后的 HEAD，并写入 `last_range`。
- tag 必须精确指向 release commit，即包含 `package.json` version bump 与 CHANGELOG 迁移的 commit；禁止指向后续 docs / state commit。
- npm 已成功上传后，同一 version 不可重发；不要通过删 tag 或 unpublish 试图覆盖。

## Phase 0 — 前置检测

读取 `preflight-checklist.md` 和 `publish-detection.md`，固定确认：

- 当前分支是发布分支，默认 `main`
- 工作区干净，远端可达，`gh auth status` 正常
- Node 与包管理器满足仓库声明
- `.github/workflows/release.yml` 存在
- 已确定 `PUBLISH_TO_NPM=true | false`
- `speculo/.speculo/commands/docs-sync/state.json` 存在且可解析；不存在时转 docs-sync command 的首次 bootstrap
- 目标 tag `vX.Y.Z` 不存在，除非正在执行明确的失败恢复

任一项不通过就停止，输出修复建议。

## Phase 1 — 普通改动 commit

- 运行仓库质量闸：优先 `pnpm check`，否则按项目脚本组合 lint / test / build。
- 审查提交粒度；不把无关修改塞进一个 commit。
- 暂存显式路径，避免 `git add .` 纳入噪声。
- 使用 Conventional Commits；body 说明做了什么和为什么。

## Phase 2 — Docs Sync

- 由调用方执行 `../../../commands/docs-sync.md`。
- 只修改全局 state 与 workflow sidecar 已确认范围中需要同步的文档或知识资产。
- CHANGELOG 类文档只写 `[Unreleased]`，保留该段落。
- 本阶段由 docs-sync 自动提交文档、报告与 state；最终 release commit 仍在 Phase 3 创建，发布后再由 Phase 6 记录为新输入终点。

## Phase 3 — 版本 bump + release commit + tag

读取 `version-bump-flow.md`。

- 将 CHANGELOG 的 `[Unreleased]` 内容迁移到 `## [X.Y.Z] - YYYY-MM-DD` 或项目既有等价格式，并重新保留空 `[Unreleased]`。
- 将 `package.json#version` 改为 `X.Y.Z`；tag 使用 `vX.Y.Z`。
- 运行质量闸；除非调用方明确记录外部预演证据，不跳过。
- release commit 只包含版本 bump 与 CHANGELOG 迁移，提交信息为 `chore(release): vX.Y.Z`。
- 记录 `RELEASE_COMMIT_SHA`。
- 先 push 发布分支，再 `git tag vX.Y.Z $RELEASE_COMMIT_SHA`，再 push tag。

## Phase 4 — 监控 release workflow

用 `gh run list` 找到 head SHA 等于 `RELEASE_COMMIT_SHA` 的 release run，再 `gh run watch --exit-status`。

重点检查：

- Verify tag matches package version
- lint / tests / build / bin entry
- Extract release notes from CHANGELOG
- Publish to npm（仅 `PUBLISH_TO_NPM=true`）
- Create GitHub Release

失败时进入 `failure-recovery.md` 和 `troubleshooting-playbook.md`。

## Phase 5 — 三端验证

始终验证：

```bash
gh release view "vX.Y.Z" --json name,tagName,isDraft,isPrerelease,body
gh run list --workflow release.yml --limit 1 --json conclusion,headSha
```

判定：

- Release 非 draft、非 prerelease
- Release body 非空，且包含 CHANGELOG 段落；仅 `Full Changelog` 一行视为残缺
- workflow conclusion 为 success，headSha 等于 `RELEASE_COMMIT_SHA`

仅当 `PUBLISH_TO_NPM=true` 时验证：

```bash
npm view "<package-name>" version
npm view "<package-name>" dist-tags
```

判定 version 与 `dist-tags.latest` 均为 `X.Y.Z`。

## Phase 6 — 记录 release 输入节点

仅当 Phase 1-5 全绿时执行。再次调用 `../../../commands/docs-sync.md`，并确认运行前 `HEAD` 等于 `RELEASE_COMMIT_SHA`：

- state 的 `last_range.to_sha` 必须等于 `RELEASE_COMMIT_SHA`。
- `last_range.from_sha` 来自最后修改旧 state 的 commit，或迁移期 explicit baseline。
- docs-sync 写入 release 后报告/state commit；tag 继续精确指向 release commit，不移动。

本 skill 不直接改 state 或 workflow sidecar；原子写入、范围检查和本地 commit 均由 docs-sync command 负责。

## 完成报告

报告至少包含：

- 版本号、release commit SHA、tag SHA
- workflow run id 与结论
- GitHub Release 检查结果
- npm 检查结果或跳过原因
- docs-sync `last_range` 与 state-file baseline commit
- 失败恢复或后续建议
