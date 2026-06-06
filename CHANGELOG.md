# Changelog

本文件记录 Speculo 的所有重要变更。

格式遵循 [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer 2.0.0](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

---

## [0.1.1] — 2026-06-06

### Added

- **skill**：新增 `worktree-isolation` 原子 skill，提供可选的 git worktree 隔离生命周期——在独立分支 `speculo/<cat>/<change>` 与 `.worktree/<change>/` 工作树中推进 change，审查覆盖整条分支树的全部 commit，收尾时合并回原分支并清理。dev workflows 通过条件式渐进披露引用，默认不启用，仅在用户显式请求时加载。
- **workflow**：新增 `dev/04` finalize 工作流（完成前验证门控 + 状态收尾归档），配套 `completion-verification` / `completion-summary` 模板。
- **workflow**：`dev/01` grill 增加条件 Phase 0「Worktree Setup」，`dev/04` finalize 增加条件阶段「Merge Back & Cleanup」，状态记录 `base_branch` / `change_branch` / `worktree_status`。

### Changed

- **workflow**：`dev/R` review 重构为 Spec / Engineering / Standards 三维度独立审查，引入 P0–P3 严重度模型与 SOLID / 安全 / 代码质量 / 删除四份深度清单，并新增 verdict 裁决阶段；移除旧的 two-axis 审查文档。
- **build**：`.gitignore` 忽略 `.worktree/`。

### Docs

- 同步 `Speculo-architecture` / `adopting` / `quick-reference`，纳入 review 多维度与 finalize 工作流。
- 仓库新增 `CLAUDE.md` 项目指引。

---

## [0.1.0] — 2026-06-05

### Added

- **CLI**：`speculo init [target]` 安装框架资产（冲突即失败，不覆盖），`speculo update [target]` 覆盖 `commands/` / `skills/` / `workflows/` 并保留 `.speculo/` 状态。
- **framework**：内置 `commands/`、`workflows/`（dev / doc）、`skills/` 与 `.speculo/` 状态骨架，支撑工具无关的规格驱动开发。
- **CI**：GitHub Actions `ci.yml`，在 push / PR 到 `main` 时执行 build、test 与 bin 校验。
- **CI**：GitHub Actions `release.yml`，在 push `v*` tag 时校验 tag 与版本一致、运行质量闸、以 npm provenance 发布 `@namewta/speculo` 并创建 GitHub Release。
- **packaging**：npm 包以 scoped 名 `@namewta/speculo` 发布，补全 `repository` / `homepage` / `bugs` / `license` / `publishConfig` 等发布元数据。

### Docs

- 初始化 `LICENSE`（MIT）、`CHANGELOG.md`，并在 `README.md` 补充安装方式、徽章与 License 小节。
- 初始化 `.speculo/dev/docs-sync-state.json` 同步基线，纳入 `README.md` 与 `CHANGELOG.md`。

---

## 版本链接 / Links

- [Unreleased](https://github.com/NAMEWTA/Speculo/compare/v0.1.1...HEAD)
- [0.1.1](https://github.com/NAMEWTA/Speculo/compare/v0.1.0...v0.1.1)
- [0.1.0](https://github.com/NAMEWTA/Speculo/releases/tag/v0.1.0)
