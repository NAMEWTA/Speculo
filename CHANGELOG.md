# Changelog

All notable changes to Speculo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

---

## [0.2.15] - 2026-07-23

### Fixed
- 修复 handoff command 迁移后 CI 测试断言：`commands/handoff.md` 现为 first-class command，init 后应存在

---

## [0.2.14] - 2026-07-23

### Changed
- **handoff command 重构**：从 workflow SKILL 迁移为独立 command，归档路径规范化为 `speculo/.speculo/commands/handoff/<YYYY-MM-DD>-<scope>-<topic>[-NN].md`，禁止写入 temp/ 或非规范位置

### Added
- `AGENTS.md` 新增 Speculo 运行时配置段：初始化状态检查与工作流入门强制读取规则

---

## [0.2.13] - 2026-07-23

### Added
- `speculo version` 命令：查看当前安装版本，自动检查 npm registry 最新版本并提示升级
- `speculo` / `speculo init` 启动时自动版本检查：显示本地版本与远程最新版本比对，交互模式下确认后继续

---

## [0.2.12] - 2026-07-22

### Added
- T-triage workflow：外部 issue 摄入分诊——深度理解上下文后写入 source-issue.md 与 triage.md，推荐下一 work（#31）

### Changed
- **status.json schema 升级到 v2**：`active` 从 `string[]` 升级为 `object[]`，支持 per-change 维度的 `current_work`/`works_run`/`result` 独立追踪（#31）
- 移除全局 `current_work` 字段，语义移至 per-change active 条目
- `work_history` 条目增加 `change` 外键，移除 `artifacts` 字段
- 新增 `completed` 数组记录已归档 change 的路径与时间
- 新增 per-change `.status.json` 约定，追踪 change 生命周期状态
- A-archive-and-consolidate 全链路联动：从 status.json `active` 筛选 `result: "completed"`，归档后追加到 `completed` 数组
- W-wayfinder ticket 领取机制从全局 `active` 数组迁移到 per-change `claimed_tickets`

---

## [0.2.11] - 2026-07-22

### Fixed
- T-tickets 编号契约去掉 `#` 前缀：文件名/编号列/阻塞路径/DAG 与派单协议统一为两位零填充纯数字（`01`），避免 tickets-map 链接被编码为 `%23`（#30）
- P-goal-plan §5 执行协议强制引用 I-implement：开头声明本协议是 I-implement 的实例化，Lead 与简化模型步骤 1 清单均以 I-implement 为第一项（#29）

### Changed
- `IMPLEMENTER_DISPATCH` / `TICKET_DONE` 协议标签改为纯数字编号（`IMPLEMENTER_DISPATCH 01` / `TICKET_DONE 01`），不再使用 `#n`
- `canonical-specdev-tickets.md` 与 T-tickets 编号契约锁步同步

---

## [0.2.7] - 2026-07-21

### Fixed
- specdev INDEX.md 持久化约定表格补充 `.config/` 配置目录文档说明（#25）

---

## [0.2.6] - 2026-07-21

### Added
- `archive-and-consolidate` command 与配套 skill：知识生命周期治理——归档过期内容、合并分散知识、清理过时资产。含完整参考规则（archive-rules.md、cleanup-rules.md、consolidation-rules.md、knowledge-graduation.md）和资产模板。
- `specdev` workflow package：全周期规范驱动开发，含 7 个 work 条目——D-diagnose-bugs（诊断 bug）、G-grill-with-docs（带文档质询）、I-implement（实现）、I-init-setup（初始化设置）、S-spec（规范编写）、T-tickets（任务拆解）、W-wayfinder（路径导航）。替代原有的 matt-pocock workflow。
- `speculo-write-canonical` 内部创作 skill：为 AI 平台生成/审计单文件 canonical 分发格式。
- `speculo-write-work` 内部创作 skill：编写 workflow 内的独立 work 条目文件及渐进式展示子文件。
- vendor `khazix-skills/neat-freak`：知识治理与清理的原始 skill 集合。
- Workflow `INDEX.md` 自动生成脚本（`generate-index.mjs`），替代手动维护的 PERSISTENCE.md/WORKFLOW.md。
- `template/AGENTS.md` 与 `template/CLAUDE.md` 作为模板级代理入口，遵循 AGENTS.md 权威手册 + CLAUDE.md 轻量重定向的铁律。
- `authoring-quality.md`、`workflow-authoring.md`、`work-entry-authoring.md`、`index-template.md` 参考文档，提取到对应 skill 的 references/ 中。

### Changed
- `template/commands/` 从 5 个精简为 4 个：移除 `finalize` 和 `knowledge-prune`（功能合并到 `archive-and-consolidate`）。
- `template/skills/` 从 10 个精简为 6 个：移除 `change-lifecycle`、`config-prune`、`knowledge-prune`、`runtime-context`、`scaffold-exercises`；新增 `archive-and-consolidate`。
- `template/workflows/`：matt-pocock workflow 替换为 specdev workflow（7 work entries + INDEX.md）。
- `template/workflows/person/`：适配新 INDEX.md 格式，移除 PERSISTENCE.md/WORKFLOW.md。
- `.agents/skills/` 从 4 个扩展为 5 个：新增 `speculo-write-canonical` 和 `speculo-write-work`。
- `speculo-write-workflows` skill 重构：新增 INDEX.md 生成、vendor reconciliation 重构。
- `docs/` 目录更新：移除 `workflow-authoring.md`；`canonical-authoring.md`、`persistence-contract.md`、`skill-authoring.md` 内容同步。
- `template/vendor/`：新增 `khazix-skills/`。
- `scripts/validate-framework-assets.mjs` 适配新的 INDEX.md 格式。
- `src/` CLI 模块适配 workflow 包结构变更。
- `check-template-links.mjs` 跳过 canonical 自包含文档。

### Removed
- `template/commands/finalize.md` 与 `template/commands/knowledge-prune.md`（功能合并到 archive-and-consolidate）。
- `template/skills/change-lifecycle/`、`config-prune/`、`knowledge-prune/`、`runtime-context/`、`scaffold-exercises/`。
- `template/workflows/matt-pocock/` 整个 workflow package（替换为 specdev）。
- `template/workflows/person/PERSISTENCE.md`、`WORKFLOW.md`、`_state/.config/`、`_templates/`。
- `.agents/skills/speculo-write-workflows/scripts/vendor-workflow-impact.mjs`。
- `docs/workflow-authoring.md`。
- `test/vendor-workflow-impact.test.ts`。

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
