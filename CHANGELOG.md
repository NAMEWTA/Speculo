# Changelog

All notable changes to Speculo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.2.5] - 2026-07-20

### Fixed
- PERSISTENCE.md state root 路径解析多了一级 `state/` 子目录：`<root base="X" path="Y"/>` 现在明确解析为 `workspace.roots[X] + "/" + Y`，root ID 不重复作为子目录拼接（#23）。
- setup-matt-pocock-skills 产物 `docs/agents/*` 现通过 `adapt-paths` 中间件映射到 `{state_root}/integrations/` 与 `{state_root}/knowledge/` 持久化命名空间，不再污染项目根（#24）。
- PERSISTENCE.md 新增 `<vendor-path-mapping>` 规范表作为 vendor 路径适配的单一事实源。

### Changed
- to-tickets 本地文件模式现通过 wrapper 层 `adapt-local-template` 覆盖为 `tickets/` 目录结构（`README.md` 索引 + `NN-<kebab-title>.md` 独立文件），支持按编号引用与独立归档；issue tracker 模式行为不变（#22）。
- idea-to-delivery route artifact 路径从 `tracker/tickets.md` 更新为 `tracker/tickets/README.md`。

## [0.2.4] - 2026-07-20

### Added
- Canonical 格式支持与 `speculo-write-canonical` 内部创作 skill。
- `template/canonical/` 含格式规范、示例与教学指南。
- `scripts/canonicalize.mjs` 用于自动生成 canonical 自包含文档。

## [0.2.3] - 2026-07-17

### Fixed
- retro 命令目标仓库写死为 `NAMEWTA/Speculo`，移除 AI 可覆盖目标仓库的歧义空间，防止 issue 误提到其他仓库。

### Added
- README 九段式通用写作指南（`readme-writing-guide.md`），供 `docs-sync` 等命令在生成/审计 README 时引用。

### Changed
- `docs-sync` skill 步骤 4 同步引用新写作指南；`readme-contract.md` 增加交叉引用。

## [0.2.2] - 2026-07-15

### Added
- Per-workflow `PERSISTENCE.md` runtime contracts and independently callable `atomic-skills/` entries.
- Complete one-to-one wrapper catalog for the current Matt Pocock vendor inventory, including explicit gating for every `in-progress` skill.
- Read-only Git impact analysis for reconciling vendor additions, removals, moves, renames, and supporting-file changes with workflow wrappers, routes, and callers.

### Changed
- Matt Pocock routes now resolve every raw skill through workflow-owned atomic wrappers so route and direct invocation share one change and persistence boundary.
- Framework validation now enforces persistence loading, wrapper/catalog completeness, unique raw targets, and the absence of direct raw skill references in routes.
- The internal workflow authoring skill now treats vendor synchronization as a dependency-closed reconciliation branch and blocks referenced removals or renames for an explicit decision.

## [0.2.0] - 2026-07-11

### Added
- Package-based workflow system with XML route declarations (`<runtime-context>`, `<persistence>`, `<routes>`, `<sequence>`, `<dependencies>`, `<state-schema>`, `<transitions>`).
- Two installable workflow packages: **matt-pocock** (10 routes: idea-to-delivery, wayfinder, triage, diagnose, architecture, review, merge-conflicts, research-prototype, productivity, experimental) and **person** (1 route: Mao Zedong Cognitive OS consulting workflow).
- Five command definitions: docs-sync, finalize, knowledge-prune, retro, status.
- Ten skills: agents-md-builder, change-lifecycle, config-prune, docs-sync, github-npm-ops, knowledge-prune, runtime-context, scaffold-exercises, speculo-retro, worktree-isolation.
- `speculo migrate [--apply] [target]` for v2 and transitional v3 state to current v3 contract migration, with staged rollback safety.
- `speculo init [--all] [target]` with interactive workflow selection via `@inquirer/prompts`.
- Vendor skill collection support: matt-pocock (engineering + productivity) and officecli.
- `docs-sync` skill with six reference contracts: git-state, workflow-scope, document-lifecycle, readme, changelog, agents.
- CI pipeline: build, test, validate-assets, verify-bin.
- npm release workflow with package provenance and tag-version verification.
- `--all` flag for `speculo init` to select every workflow and fully refresh vendor assets on update.
- Workflow status state extensions: `current_route`, `route_history`, `skill_history`, `external_refs`, `legacy_source`.

### Changed
- `speculo update` deprecated; delegates to `speculo init --all`.
- Vendor directory restructured: `vendor/` as native skill collection directory.
- `speculo/` directory renamed to `template/` for clearer shipped asset semantics.
- init/update merged into unified `speculo init` command with smarter state preservation.
- docs-sync state schema upgraded to v4 with per-workflow `docs-sync.json` sidecars.
- Workflow assets migrated from flat vendor directory to structured package-based layout.

### Removed
- Legacy v2 workflow categories (dev, doc, person as top-level state trees).
- Legacy config files: RULES.md, LESSONS.md under `.speculo/.config/`.
- Legacy skills: handoff, write-a-skill, caveman (superseded by standalone skill assets in `template/skills/`).
