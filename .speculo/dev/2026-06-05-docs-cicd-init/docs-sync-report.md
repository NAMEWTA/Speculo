> **服务工作流：** `../../../speculo/workflows/dev/D-docs-sync/D-docs-sync.md`
> **产物文件名：** `docs-sync-report.md`

# Docs Sync Report

> 首次运行（first-run）：建立 docs-sync 基线，并随 CI/CD 初始化补齐对外文档。
> 调用方：`dev/D` D-docs-sync 工作流 + `github-npm-ops` skill（CI/CD 初始化）。

## Range

- 初始化前 `HEAD`：`02bfec3`（refactor: update skill references and templates for consistency）
- 同步基线 `last_sync_sha`：`4c1ff57`（ci: add CI and npm release pipelines）
- 区间：`02bfec3..4c1ff57`
- commit 数：2 · 文件数：7 · shortstat：`7 files changed, 234 insertions(+), 3 deletions(-)`

> 说明：本仓库此前无 `.speculo/` 状态，本次为首次运行，基线设为 CI/CD 基础设施落地后的 `4c1ff57`。
> 承载本报告与新基线的 docs commit（`CHANGELOG.md` / `README.md` / `.speculo/**`）位于基线之后，
> 下一次 docs-sync 运行将以 `4c1ff57..HEAD` 取差异，该 docs commit 只含文档与状态，预期为空同步。

## Diff Summary

```
git log --oneline --no-merges 02bfec3..4c1ff57
  4c1ff57 ci: add CI and npm release pipelines
  b3fb13e chore: add MIT license and npm publish metadata

git diff --name-status 02bfec3..4c1ff57
  A  .github/actions/setup/action.yml
  A  .github/dependabot.yml
  A  .github/workflows/ci.yml
  A  .github/workflows/release.yml
  A  LICENSE
  M  package.json
  A  scripts/verify-bin.mjs
```

路径分组：`.github/*`（CI/CD）4 · 根级文件（LICENSE / package.json）2 · `scripts/*` 1。

## Mapping

| 变更 | 对外可见性 | 映射文档 |
|------|-----------|---------|
| 新增 `LICENSE`（MIT） | 是 | README「License」小节 + CHANGELOG `Docs` |
| `package.json` 改名为 `@namewta/speculo` + 发布元数据 | 是（安装命令、包名） | README 安装段 + 徽章；CHANGELOG `Added` |
| `.github/workflows/ci.yml`、`release.yml`、`actions/setup` | 是（发布流程） | README 徽章；CHANGELOG `Added`（CI/release） |
| `.github/dependabot.yml`、`scripts/verify-bin.mjs` | 间接 | CHANGELOG `Added`（聚合进 CI 条目） |

## Synced Docs

- `README.md` — 顶部新增 CI / npm / License / Node 徽章；安装段补充 `npm install -g @namewta/speculo`；License 小节由「未指定」改为 `MIT`。
- `CHANGELOG.md` — 新建（Keep a Changelog 1.1.0），在 `[Unreleased]` 记录 CLI / framework / CI / packaging 的 `Added` 与 `Docs` 条目；保留底部版本链接。

## Verification

- `pnpm build` — 通过（tsc）
- `pnpm test` — 通过（4 passed / 0 failed，`node --test dist/test/*.test.js`）
- `node scripts/verify-bin.mjs` — 通过（dist/src/cli.js 存在、含 shebang、`--help` 正常）

## State

- old baseline：`null`（首次运行，无既有 `.speculo/` 状态）
- new baseline：`4c1ff57`（`ci: add CI and npm release pipelines`）
- `tracked_docs`：`["README.md", "CHANGELOG.md"]`
- `synced_docs`：`["README.md", "CHANGELOG.md"]`
- `total_syncs`：`1` · `previous_sync_sha`：`null`
