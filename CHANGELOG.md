# Changelog

本文件记录 Speculo 的所有重要变更。

格式遵循 [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer 2.0.0](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

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

- [Unreleased](https://github.com/NAMEWTA/Speculo/compare/v0.1.0...HEAD)
- [0.1.0](https://github.com/NAMEWTA/Speculo/releases/tag/v0.1.0)
