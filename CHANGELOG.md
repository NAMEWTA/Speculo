# Changelog

本文件记录 Speculo 的所有重要变更。

格式遵循 [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer 2.0.0](https://semver.org/lang/zh-CN/)。

---

## [0.1.8] — 2026-06-13

### Changed

- **CLI**：`speculo init` 与 `speculo update` 合并为统一的 `speculo init` 命令。若目标项目 `speculo/` 目录不存在则全新安装全部 4 项资产（冲突检测）；若已存在则自动进入更新模式，覆盖 `commands/`、`skills/`、`workflows/` 并保留 `.speculo/` 用户状态。
- **仓库**：框架资产源目录 `speculo/` 重命名为 `template/`，明确语义——这是模版开发目录，`speculo init` 将其内容复制到目标项目的 `speculo/`。

### Deprecated

- **CLI**：`speculo update` 子命令已弃用，保留兼容并输出警告，将在未来主版本移除。请改用 `speculo init`。

---

## [0.1.7] — 2026-06-12

### Added

- **docs**：新增 `docs/persistence-contract.md` §0「命名铁律」——所有 change 目录、command 产物目录、归档路径必须以 `YYYY-MM-DD-` 开头，不带日期的目录名视为无效（`malformed`）。
- **workflows**：dev/doc 的 `00-INDEX.md` 全线植入命名铁律引用，扫描 active change 时自动检测并报告 malformed 目录。
- **workflows**：Mao 认知操作系统工作流内置《毛泽东选集》全文知识库（`books/`，229 篇），无需联网即可检索原文、精确引用。

### Changed

- **workflows**：Mao 认知操作系统工作流——外挂知识库改为内置本地 `books/`，删除外部 GitHub 仓库引用与 `$MAOXUAN_KB_PATH` 环境变量路径发现。
- **workflows**：dev/doc 全线模板（`_templates/`）产物路径、占位符统一更新。
- **docs**：`Speculo-architecture.md`、`persistence-contract.md` 补充命名铁律与归档路径说明。

---

## [0.1.6] — 2026-06-12

### Added

- **workflows**：新增 `doc/M`（M-mao-zedong-cognitive-os）毛泽东认知操作系统工作流，将原 skill 格式改造为符合 doc/ 规范的 workflow，按 M- 前缀命名，拆分为入口文件 + 5 个 phase 文件（activate / diagnose / strategize / mobilize / deliver），新增咨询输出模板。

---

## [0.1.5] — 2026-06-12

### Changed

- **workflows**：dev 工作流全线术语统一 `roadmap` → `slices`（`03-tdd`、`04-finalize`、`I-to-issues`、模板）。原 `roadmap.md` 的 scope/architecture/phases/cross-cutting/dependency 五段结构融入 `slices.md`，每切片携带 `<phase id="...">` XML 状态契约供 TDD 阶段直接引用。
- **workflows**：`I-to-issues` 切片格式增强为五段结构（战略锚点 / IN-REUSE-OUT / 架构上下文 / 切片·含 phase id / 横切关注点 / 依赖顺序），增加 IN/REUSE/OUT 三列边界表与 ASCII 依赖链。

### Added

- **workflows**：新增 `doc/T`（T-teach）交互式课程设计工作流入口，支持使命→资源→课程→参考→记录的教学设计流程。

### Docs

- **README**：新增「致谢 / Acknowledgements」小节，列入 Matt Pocock/skills 与 NAMEWTA/specforge 参考项目链接。
- **docs/quick-reference**：同步 `doc/T` workflow 行。
- **docs/Speculo-architecture**：修正安装后目录布局为 `speculo/` 前缀形式（与 v0.1.2 CLI 行为一致）。

---

## [0.1.2] — 2026-06-06

### Fixed

- **CLI**：`speculo init` / `speculo update` 现在把资产安装到目标项目的 `speculo/` 目录下（`speculo/{.speculo,commands,skills,workflows}/`），不再把 `.speculo/` / `commands/` / `skills/` / `workflows/` 散落到项目根目录。冲突检测、`update` 保留 `.speculo/` 的行为同步收敛到该 `speculo/` 子目录。

### Docs

- 同步 `adopting` / `quick-reference` 与 `CLAUDE.md`，反映安装到 `speculo/` 子目录的新布局。

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

- [Unreleased](https://github.com/NAMEWTA/Speculo/compare/v0.1.5...HEAD)
- [0.1.5](https://github.com/NAMEWTA/Speculo/compare/v0.1.4...v0.1.5)
- [0.1.4](https://github.com/NAMEWTA/Speculo/compare/v0.1.3...v0.1.4)
- [0.1.3](https://github.com/NAMEWTA/Speculo/compare/v0.1.2...v0.1.3)
- [0.1.2](https://github.com/NAMEWTA/Speculo/compare/v0.1.1...v0.1.2)
- [0.1.1](https://github.com/NAMEWTA/Speculo/compare/v0.1.0...v0.1.1)
- [0.1.0](https://github.com/NAMEWTA/Speculo/releases/tag/v0.1.0)
