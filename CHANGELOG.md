# Changelog

All notable changes to Speculo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.8.10] - 2026-09-01

### Added
- **Project-scoped Ops workflow**: adds four focused stages for intake/assessment, plan/approval, iterative execution/stabilization, and retrospective/archive, with project-local changes, archives, context, ADRs, SOPs, and global knowledge separation.
- **Ops execution learning loop**: preserves immutable failed/remediation/rollback attempts, requires a complete retrospective, and promotes only verified project or global knowledge through a digest-bound transactional manifest.
- **Ops safety contracts**: separates deployment-root file writes from external control-plane mutations, requires explicit global-environment review, and invalidates approvals on source, target, permission, or plan drift.
- **Ops target and release contracts**: adds non-secret target profiles, complete control-plane identity assertions, takeover-first mode selection, immutable candidate and hard-Gate planning, production backup enforcement, strict local-only waivers, typed attempt journals, structured verification state, and redacted handoff projections.
- **Ops evidence compatibility**: keeps plan v2 and attempt v1 artifacts read-only; active legacy changes require a current target profile and a verification-only attempt v2 before close, archive, or knowledge promotion.

### Tests
- Added Ops project isolation, duplicate cross-project change names, plan revision lineage, target/profile drift, Gate ordering, data-protection policy, typed journal and verification-state checks, legacy read-only recovery, attempt recovery, project/global knowledge promotion, transactional archive, runtime preservation, and refresh blocking coverage.

## [0.8.9] - 2026-09-01

### Added
- **SpecDev `L-learn-change` Work**: adds a post-implementation question and explanation stage that appends beginner-friendly Markdown and ASCII diagrams under the owning SpecDev change, independently from the Learning workflow.

### Changed
- **SpecDev learning ownership**: keeps learning artifacts under each SpecDev change, preserves completed development state during follow-up questions, and registers the new Work in routing, artifact ownership, generated indexes, and canonical contracts.

### Tests
- Added staged validation for missing indexes, valid indexed diagrams, unindexed files, Markdown-only output, continuous numbering, and SpecDev/Learning namespace separation.

## [0.8.8] - 2026-09-01

### Added
- **Parent implementation orchestration**: adds `O-orchestrate-implementation`, a Ready Spec/Tickets-only Work that compiles multiple changes into a persistent composite Ticket super-DAG and continuously drives `I-implement` from one recoverable Lead session.
- **Cross-change execution contracts**: adds versioned Implementation Map and Implementation Plan schemas, dependency and serialization ownership, global workspace/agent limits, repository integration queues, aggregate Evidence, and an isolated canonical distribution with the full implementation dependency closure.

### Changed
- **Implementation integration**: parent plans can provide the workspace and integration strategy when a child Goal Plan is absent; child plans retain their internal Gates but cannot conflict with the parent strategy.
- **Validation and archive gates**: validates Ready child inputs, exact composite task projection, internal and cross-change dependencies, writable-path conflicts, unique unfinished parent ownership, execution limits, completion Evidence, and non-cascading archive behavior.

### Fixed
- Normalized legacy fields out of the strict SpecDev global status v5 index while preserving their values in change-owned status, and corrected Wayfinder claim ownership to the change status artifact.

### Tests
- Added regression coverage for resumable parent implementation graphs, cross-change serialization, invalid or stale inputs, duplicate ownership, aggregate completion, and legacy global-status normalization.

## [0.8.7] - 2026-08-30

### Added
- **Evidence-backed UI design packages**: adds existing-style detection, guided design selection, eight reference styles, six layout patterns, and a pinned open-source research snapshot with offline visual examples.
- **Deterministic prototype tooling**: adds schema validation and source materialization for persistent `design-system.md` packages, comparison variants, and final HTML/CSS/JS output.

### Changed
- **SpecDev prototype workflow**: replaces disposable logic/UI prototype records with resumable `UI-NNN` design packages that preserve decisions, research provenance, responsive behavior, accessibility contracts, and implementation-ready source.
- Renamed prototype planning bounds to `ui_design_default_candidates` and `ui_design_max_candidates`, with supported candidate counts constrained to two through four.

### Tests
- Added coverage for ready and resumable design packages, materialized-source drift, malformed source markers, missing comparisons, obsolete prototype records, and updated configuration contracts.

## [0.8.6] - 2026-08-30

### Added
- **Learning workflow**: adds seven Works for initialization, evidence-based assessment, plain-language ASCII teaching with explicit learner-facing baselines, active practice, immediate quizzes, delayed review, and knowledge-gated archival.
- **Book-style Markdown knowledge**: adds hierarchical context/domain indexes, exact-file navigation, review scheduling, and domain support for projects, products, subjects, languages, and skills without RAG, embeddings, or vector storage.
- **Learning persistence validation**: registers Learning schema v1 with refresh preflight and adds deterministic checks for mastery gates, state projections, evidence paths, duplicate Knowledge IDs, and broken Markdown links.

### Changed
- Added a `mechanical-only` policy to the shared archive skill so workflow-owned knowledge graduation can remain independent from safe archive movement.

## [0.8.5] - 2026-08-24

### Changed
- **Passive SpecDev discovery**: reduced `specdev/INDEX.md` to permanent knowledge discovery and an activation pointer, so installed-but-inactive SpecDev no longer loads runtime state, creates a change, or applies Work execution contracts.
- **Progressive workflow activation**: moved the full SpecDev runtime contract and generated Work catalog into the workflow root `README.md`; all 15 Work entries load it only after activation.
- **README-owned Work catalog**: marker-mode workflow generation now maintains the AUTO-INDEX block in `README.md`, while generator-owned `workflow-index` packages continue to rebuild `INDEX.md` as a whole file.

### Fixed
- Corrected the documented SpecDev global status schema version from v4 to the implemented v5 contract.

### Tests
- Added regression coverage for passive INDEX behavior, activated README loading, installed workflow packaging, README marker generation, deterministic rebuilds, and validator enforcement.

## [0.8.4] - 2026-08-24

### Added
- **`upstream-fork-sync` skill**: adds generic, repository-map-driven fork/upstream assessment with proven integration checkpoints, non-overwriting skill changes, reproducible diff/conflict reports, and exact merge-parent checkpoint recording under the standard Skill state namespace.

### Changed
- **Runtime path ownership**: commands and skills now use `<Path>{roots.*}/...</Path>` for persistent and cross-package references; independently persistent skills own only `{roots.state}/skills/<skill>/`.

### Tests
- Added fork-sync graph checkpoint, dry-run, non-overwrite, exact merge-parent, path escape, missing-ref, and refresh preservation coverage.

## [0.8.3] - 2026-08-24

### Changed
- **SpecDev `E-eli5` Work**: retargeted explanations from five-year-olds to first-year university students with no professional background. ELI5 now produces Markdown with ASCII structure, data-flow, call-flow, and state diagrams instead of an HTML visual.
- **ELI5 artifact continuity**: each change now appends `01_<topic>.md`, `02_<topic>.md`, and later diagrams without renumbering existing files. `eli_index.md` is the authoritative index of each file, topic, and short description; validation checks continuous numbering, index/file agreement, Markdown sections, and ASCII diagrams.

## [0.8.2] - 2026-08-24

### Fixed
- **SpecDev reference closure**: replaced ambiguous bare filenames in initialization and external subagent delivery contracts with complete static or project-relative paths, restoring package self-check and canonical generation.

## [0.8.1] - 2026-08-24

### Added
- **SpecDev `E-eli5` Work**：完整中文转写并保留原作者“像对五岁的我解释、HTML、大图、少字”的核心，将图解持久化到当前 change 的 `eli5.html`，支持状态恢复和阶段校验。

## [0.8.0] - 2026-08-23

### Changed
- **Ownership-driven init refresh**: `speculo init` now replaces managed static assets, preserves opaque runtime files byte-for-byte, reconciles persistent configuration with three-way baselines, and runs explicit structured-state migrators before atomic replacement.
- **Transactional conflict handling**: refresh uses an exclusive project lock, active-install fingerprints, staging validation, post-swap validation, and rollback. Invalid structured data, unsafe symlinks, concurrent drift, and schema conflicts exit with code `2` without changing the active installation.
- **Manifest v2**: `.speculo/install.json` points to a per-file SHA-256 ownership manifest, while `.speculo/baselines/` stores the last template defaults used for config reconciliation. Normal refresh no longer duplicates complete runtime state; only destructively changed config or structured files receive targeted backups.

### Removed
- Removed the `migrate-runtime-state` command and skill from new installations. Existing legacy installations with a pending marker remain unchanged and must complete their already-installed repair command before refreshing.

### Tests
- Added config reconciliation, v0.7 baseline bootstrap, opaque byte preservation, structured migration, targeted backup, legacy pending, symlink, lock, concurrent drift, staging rollback, workflow selection, and two-command CLI coverage.

---

## [0.7.6] - 2026-08-19

### Changed
- **`source-code-zip` rewritten from Python to Node.js**: the skill's `zip_source_code.js` now depends only on Node.js built-in modules with ZIP64, CRC32, and streaming compression support; the `uv`/Python dependency is removed.
- **`subagent-delivery` external-web channel hardened to ZIP-only delivery**: delivery is locked to a `native | external-web` channel before dispatch; external packages follow a staging → `source-code-zip` → SHA-256 manifest verification → isolated unpack lifecycle, persisted under `temp/subagent-delivery/` without ever overwriting the same locator. The `github-checkpoints` reference is removed and remote commits/branches are no longer a delivery medium; untrusted self-reported results stay `unverified`.

---

## [0.7.5] - 2026-08-18

### Added
- **`source-code-zip` skill**: packs a source directory into a code-only ZIP with editable regex IGNORE rules that exclude node_modules, virtualenvs, build artifacts, archives, `.env`, YAML, secrets, media, and office files. Prefers `uv`, falls back to `python3`/`py -3`/`python`.
- **Bidirectional Steelman Deliberation work**: added an independent `person/steelman-deliberation` workflow entry that freezes a pre-answer dossier, strengthens the strongest credible cases on both sides, identifies the decisive variable, asks at most one user-specific question, and then produces a validated explicit decision with actions and reversal conditions.
- **Steelman change validator**: added a dependency-free validator with staged-file support and self-check fixtures for awaiting-answer and completed lifecycles.

### Changed
- **`engineering-standards-builder` skill replaces `typescript-standards-builder`**: stable Skill ID preserved for existing callers while the generator is generalized into a cross-language Engineering Standards compiler covering TypeScript/JavaScript, React, Vue, Java/Spring Boot, Go, Rust, and polyglot monorepos, with per-language references, adapters, compatibility templates, and self-test fixtures.

### Fixed
- **Whole-file workflow index generation**: `generate-index.mjs` now honors both marker-owned `type: workflow` indexes and generator-owned `type: workflow-index` / `auto_generated: true` indexes, matching the existing person package and maintainer validator contracts.

### Tests
- Added regression coverage for person work structure, validator failure modes, whole-file index idempotence and stale detection, and preservation of handwritten marker-mode INDEX content.

---

## [0.7.4] - 2026-08-12

### Added
- **Configurable SpecDev execution limits**: added configuration for implementation agents, integration attempts, and UI prototype default/maximum variants; Goal Plans snapshot the applicable execution limits without a fixed upper bound of three.
- **Git-backed completion validation**: `validate-specdev.mjs --repo` now verifies recorded commits, ancestry, branch results, and clean completion state against the actual repository.

### Changed
- **Goal Plan workspace choice**: Goal Plan creation now asks whether to use worktrees and defaults to serial implementation in the current workspace; choosing worktrees retains per-Ticket source worktrees and candidate integration.
- **Strategy-neutral execution artifacts**: unified Ticket, subagent, Implement, and Evidence contracts so current/direct-parent and required/candidate-merge use one clean document structure.
- **Runtime contracts and migration**: upgraded SpecDev config to v5 and Goal Plan/change status to v6, preserving positive legacy concurrency values while adding deterministic defaults for new fields.
- **Canonical distributions**: regenerated the affected SpecDev canonical documents from the updated workflow dependency closure.

### Tests
- Added coverage for configurable limits above three, limit violations, integration attempt bounds, runtime migration, current-workspace serialization, and real Git evidence validation.

---

## [0.7.3] - 2026-08-12

### Changed
- **Lead-directed SpecDev execution**: implementation now runs under a single Lead with bounded Ticket worktrees and a required candidate merge/integration step.
- **Execution and migration contracts**: updated Goal Plan, Implement, Init, Ticket, migration, and validation assets to record delegated evidence and recoverable integration state.
- **Canonical distributions**: regenerated the affected SpecDev canonical documents from the updated workflow dependency closure.

### Tests
- Added and updated coverage for Lead orchestration, Ticket worktree integration, migration state, and the refreshed workflow contracts.

---

## [0.7.2] - 2026-08-09

### Added
- **Codex configuration audit skill**: added `optimize-codex-config` with a redacting, read-only auditor for local configuration, custom Responses providers, authentication metadata, permissions, Agents, model catalogs, rollout incidents, compaction failures, and configuration drift. It requires an explicit confirmation package before any local configuration mutation.
- **Independent workspace execution contract**: Goal Plans now model `coordination_mode` and `workspace_strategy` as orthogonal axes, with a separate isolated-workspace addendum, role-neutral implementation/integration ownership, portable workspace locators, and persistent local integration authorization.

### Changed
- **Agent Team no longer implies worktree use**: `single-session | lead-team` controls collaboration, while `current | worktree | mixed` is selected only from concrete isolation triggers such as parallel writes, protected local state, disposable experiments, background resume, provider requirements, or an explicit user request. The default remains one writing session in the current workspace; read-only subagents do not change that mode.
- **Automatic local worktree integration**: `terminal_action=integrate` authorizes the integration owner to complete fast-forward or mechanically determined merge-conflict integration without repeated confirmation. Successful integration does not automatically push, open or merge a PR, deploy, migrate, or remove branches/worktrees.
- **Canonical distributions**: regenerated all six SpecDev canonical documents from the updated workflow dependency closure.

### Fixed
- **Recoverable worktree integration state**: fast-forward now records its result checkpoint, verification evidence, passed integration result, and `integrated` terminal state. The new `integrating` lock requires a complete contract and can resume from the recorded parent/source checkpoint or matching `MERGE_HEAD`.
- **Integration evidence invariants**: validation now requires positive attempts, complete parent/source checkpoints, source equality, distinct merge-commit results, and exact fast-forward result equality while preserving legacy v3 worktree records.
- **Codex writer detection**: replaced broad process-name matching with exact writable-handle evidence for the target `config.toml`, so the invoking Codex CLI and non-writing application helpers no longer block the skill.
- **Model catalog and 413 attribution**: read reasoning levels from the current `supported_reasoning_levels[].effort` field and keep JSON/provider 413 responses unattributed unless an explicit proxy signature supports external-proxy ownership.

### Tests
- Added regression coverage for all four coordination/workspace combinations, legacy and new integration records, fast-forward checkpoint invariants, real Codex catalog structure, writable-handle detection, secret redaction, and proxy-evidence thresholds.

## [0.7.1] - 2026-08-09

### Added
- **State-safe refresh migration**: `speculo init` now snapshots the previous project configuration and complete runtime state, keeps the latest backup at `speculo/.speculo/back/`, records file hashes in `back/manifest.json`, and writes `.speculo/install.json` with the installed version and workflows.
- **Pending migration gate**: incompatible versions, malformed JSON, state symlinks, unknown command state, unsupported workflow schema, or index conflicts install a clean active skeleton plus `.speculo/migration.json`; CLI exits `2`, workflows are blocked, and repeated `init` makes no changes.
- **Agent-assisted runtime migration**: added the `migrate-runtime-state` command and skill. The deterministic script inspects immutable backup content, fingerprints active targets, requires complete source decisions and explicit confirmation, stages all changes, validates the result, atomically replaces the installation, and rolls back on failure.

### Changed
- **Compatible v0.7+ refresh**: `speculo init` still refreshes managed static commands, skills, workspace metadata, and selected workflow packages, while recursively merging project configuration defaults and preserving complete compatible workflow/command runtime state, including initialized configuration, state indexes, `.config/`, permanent knowledge, `changes/`, `archive/`, sidecars, reports, and owned command `state.json` files.
- **Static/runtime ownership split**: stale managed static commands, skills, and selected workflow files are removed by template refresh. Runtime data is migrated when compatible or retained in the immutable backup for explicit reconciliation when pending. Current supported workflows not selected in the prompt remain untouched.
- **Runtime ignores**: project-root `.gitignore` now idempotently includes `speculo/.speculo/back/` in addition to `specdev-worktree/` when SpecDev is installed.

### Tests
- Added coverage for fresh install manifests, complete compatible state preservation, backup hashes, pending zero-modification retries, CLI exit code `2`, CRLF/idempotent ignores, backup tampering, confirmation gates, target drift, path escape, invalid-state rollback, unselected workflow preservation, staging failure rollback, and the reduced CLI surface.

## [0.7.0] - 2026-08-09

### Changed
- **Direct refresh is the only upgrade path**: `speculo init` now stages a complete replacement installation and refreshes managed template assets without inspecting or migrating old state. It replaces `config.json`, workspace metadata, commands, skills, and selected workflow packages; selected workflow state is reset to the current skeleton while `changes/`, `archive/`, and command Markdown reports are retained.
- **State cleanup contract**: selected workflow sidecars, workflow configuration, unknown state files, and command `state.json` files are removed during refresh. Current supported workflows not selected in the prompt remain untouched.
- **Build output hygiene**: `pnpm build` clears `dist/` before compiling so deleted source modules cannot be packaged accidentally.

### Removed
- **Migration and skill-mirror CLI surface**: removed `speculo migrate`, `speculo mirror-skills`, `speculo update`, and `--all` / `--apply` / `--dry-run`. Calling a removed command or option exits nonzero and directs users to `speculo init`.
- Removed the migration and skills-mirror source modules, their legacy compatibility tests, and workflow instructions that directed users to migrate state.

### Tests
- Added direct-refresh coverage for malformed schema v2 state, unknown legacy files, state cleanup, retained audit history, unselected workflow preservation, staging failure rollback, and the reduced CLI surface.

## [0.6.1] - 2026-08-08

### Added
- **SpecDev 本地优先 Triage**：`T-triage` 增加 intake / reconcile 双模式，将远程 Issue、PR、URL、文件或对话冻结为本地 `source.md`，以本地 `triage.md` 记录路由和待处理外部动作；change 完成本地开发后可再次进入 Triage，经明确确认回写并关闭支持的远程 Issue。
- **GitHub Issue transport**：`github-npm-ops` 新增可复用的 `issue-read`、`pr-read`、`issue-search`、`issue-create` 与 `issue-comment-close` 操作；外部写默认 dry-run，close 重试使用稳定 comment marker 保持幂等。该能力仅作摄入与完成投影，不成为 SpecDev tracker。
- **C-code-review 与共享双轴审查能力**：固定 commit、branch、tag、merge-base 或 PR 后，分别执行工程标准轴和规范符合轴审查，并把可恢复报告持久化到 change；I-implement 复用同一能力。
- **P-prototype**：新增 Logic / UI 原型分支、原型记录与 schema；原型只回答一个设计问题，通过可迁移 branch/worktree locator 与 Wayfinder、后续实现和清理状态互相定位。
- **诊断、问卷与冲突协议**：D-diagnose-bugs 增加 red-loop 硬门、最小化、可证伪假设、单变量探针和 HITL 捕获脚本；G 增加 stakeholder questionnaire 阻塞/恢复分支；I 增加 merge/rebase 冲突处理协议。
- **上游来源一致性检查**：新增覆盖全部 26 个 `temp/skills` 来源的 source map 与 hash 检查，并接入 `pnpm validate-assets`。

### Changed
- **SpecDev 全局状态 v4（#37）**：`status.json` 收敛为 `active` / `archived` change 索引，删除全局 `work_history`、active `result` 与 `completed` 元数据投影；`speculo migrate` 新增 v3→v4 dry-run、阻塞检查、分阶段替换和回滚安全迁移。
- **Ticket worktree 固定路径（#36）**：Git provider 固定使用 `<project-root>/specdev-worktree/<ticket-id>`；`speculo init` 在安装 SpecDev 时幂等治理项目根 `.gitignore`，native/external provider 继续使用可迁移 locator。
- **TDD 与完成门收敛**：I-implement 使用严格 red→green 垂直切片、独立真相来源和系统边界 mock；重构移到双轴审查后的独立修正阶段。change 完成与归档分离，未 reconcile 的远程 close 不回滚本地完成，但会阻塞归档，除非显式 waive。
- **领域工件语义与毕业边界收窄**：change CONTEXT 只保留本 change 已确认的项目规范术语；change ADR 仅在“难以逆转、缺少上下文会令人惊讶、存在真实权衡”三个条件同时成立时创建，并只作为当前 change 合同。永久 `context/` / `adr/` 只能由 Archive 在实现证据、毕业评估和用户确认后写入；Research 不再创建共享 namespace，由调用方声明输出 owner 和目标路径。
- **归档职责去重**：SpecDev A work 改为全局 `archive-and-consolidate` skill 的 workflow wrapper；Status、Handoff、Archive 与 Retro command 同步理解本地权威与远程 reconcile 状态。
- **Goal Plan 角色编排改为显式可选**：每次运行 P-goal-plan 由用户选择普通或委派计划；普通计划只保留 DAG/Wave/Gate/owner、证据和恢复，不生成 Lead、Provider、Delivery Contract 或 Dispatch Packet。只有委派分支加载 subagent-delivery；普通计划由最后一个 Implement 完成 change，委派计划仍由 Lead 验收完成。共享路径、E2E、偏差与 worktree 公共契约改用角色中立 owner，只有委派分支才映射为 Lead/Worker。

### Removed
- 删除 `source-issue.md` 兼容入口、外部 status-label 初始化，以及重复或已过期的 `archive-checklist.md`、`knowledge-promotion-rules.md`、`code-review-process.md` 和 `tdd-examples.md`。旧 `source-issue.md` 会被 validator 明确拒绝，不执行迁移或兼容回退。

### Tests
- 新增 status v3→v4、迁移阻塞、`.gitignore` 换行/幂等、provider 引用校验及真实 Git linked worktree 集成覆盖。
- 新增 Triage 前置摄入、旧来源拒绝、诊断 red-loop、双轴审查 fixed point、原型 locator、远程 close 归档门，以及 GitHub transport dry-run / 幂等重试覆盖。

## [0.6.0] - 2026-08-07

### Added
- **参考内容复用规则（作者技能）**：`authoring-quality.md` 共享规则新增"参考内容复用"——用户提供参考内容时视为待复用实现而非灵感来源，默认尽可能直接复制原文，只对 Speculo 集成所必需的路径解析、持久化、状态、缓存/临时目录、输出位置及直接相关脚本配置做最小修改；方法、步骤顺序、问题、判断条件、模板语义与完成标准不得顺带改变。
- **写技能接入质量模型**：`speculo-write-canonical` / `speculo-write-command` / `speculo-write-skill` / `speculo-write-work` / `speculo-write-workflows` 五个技能全部接入 `_shared/authoring-quality.md` 读取，并在用户提供参考内容时先应用复用规则再继续设计。
- **验证门证据要求**：`validation-gates.md` Gate 5 新增参考内容修改核对——列出相对原文的实质修改及 Speculo 集成理由，无法说明必要性的改写恢复原文。

---

## [0.5.0] - 2026-08-07

### Added
- **`subagent-delivery` Skill（specdev 工作流）**：为 Goal Plan 生成可恢复的 direct、原生或外部网页 Agent 派单，并在 Implement 阶段按同一交付合同核对基线、候选交付、修正与 Lead 验收；随 specdev 工作流作为 common skill 自动安装。
- **`design-tree.schema.json` 与 `wayfinder-ticket.schema.json`**：为设计树与 Wayfinder Ticket 新增正式 JSON Schema，`validate-specdev.mjs` 与 canonical 生成脚本同步接入。
- **specdev 契约扩展**：artifact-contract 新增设计树、Wayfinder 地图/Ticket/solution comment、架构审查等工件；新增 `architecture-report-contract.md`、`local-tracker-contract.md`、`solution-comment-template.md` 契约文档与 `design-tree-template.json` 模板。
- **`codebase-design` 规则**：新增深层模块设计语言（小接口承载大行为、缝合点、可测试性），并入 specdev common rules。

### Changed
- **`docs-sync` Skill 重构为手册树构建器，取代 `agents-md-builder`**：基于可复现 Git 区间、确认范围和 workflow 规则审计项目文档，在增量维护或重建分支中生成可预测的 AGENTS.md / CLAUDE.md 手册树；`agents-md-builder` skill 及其模板与引用全部移除。
- **specdev 各 work 更新**：G-grill-with-docs（设计树模板与 grilling 协议）、I-implement（design-it-twice、evidence-template、execution-preflight）、P-goal-plan（规划模式与编排协议）、R-review-architecture（架构审查报告契约）、W-wayfinder（地图与 investigation 契约）同步演进至新工件契约。
- **canonical 单文件分发物重新生成**：全部 canonical-specdev-* 文件与源码同步（新增 subagent-delivery、设计树与 Wayfinder ticket schema 内联）。
- **测试扩展**：cli.test.ts 新增 specdev 契约相关用例。

---

## [0.4.0] - 2026-08-02

### Changed
- **`engineering-standards-builder` Skill 取代 `typescript-engineering-standards`**：由静态工程规范合集重构为规范生成器——先扫描仓库事实，再通过自适应问答确认分歧点，为当前项目生成专属 TypeScript Standards Skill。输出正式规范到 `.agents/skills/typescript-standards/`，并为 `.claude/skills/` 创建强制引用入口；主 Skill 精简、详细规则拆分进项目内 `references/`，随 `skills` 核心资产自动安装。

---

## [0.3.4] - 2026-08-02

### Added
- **`typescript-engineering-standards` Skill**：为 TypeScript、JavaScript、React、Node.js、Electron、CLI、npm 库与 Monorepo 项目提供渐进披露的工程规范。轻量主入口按任务最小化读取 `references/` 主题文档（规则优先级、架构与目录、命名、模块、类型系统、异步/错误、注释、测试、React、Node CLI、格式化/Lint、配置/CI、安全/性能/i18n、Git/评审、迁移治理、Orca 工程习惯），并附带 `templates/`（tsconfig/prettier/editorconfig/AGENTS/PR/评审清单）与 `examples/`。随 `skills` 核心资产自动安装。

---

## [0.3.3] - 2026-07-31

### Added
- **A-archive-and-consolidate 新增 consolidate-from-code 模式**：归档 Work 从单一 archive 路径扩展为双模式。没有可归档 change（或用户显式要求“基于当前代码沉淀知识”）时，进入 consolidate-from-code 模式——以当前代码库为基本事实、一次一问深度访谈用户，把经验证的架构决策与领域术语提升为永久知识。访谈运行本身建立一个承载 change，轨迹/LOG/CONTEXT/ADR 先落在该 change 内，经代码验证后再提升、最后归档；两模式收束到同一条“评估 → 提升 → 归档”尾部。§0 判定模式，多候选或既有可归档 change 又收到沉淀请求时停止请用户消歧。
- **consolidation-interview.md 访谈协议**：新增代码库沉淀访谈协议子文件（基本事实优先、决策树、每轮只关闭一个关键结论、复用 grill 的 LOG/CONTEXT/ADR 格式、停止条件），供 consolidate-from-code 模式加载。

### Changed
- **W-wayfinder 工作流增强**：明确“规划而非执行”与“以名称指代”两条核心纪律；拆分“绘制地图 / 走完地图”两种调用模式；目标命名作为第一动作独立成节；调查 Ticket 引入 Type（research/decision/validation/mapping）与模式（AFK/HITL）分类，research/AFK 型可并行领取、decision 等 HITL 型单会话一次只解决一个。
- **wayfinder-map-template 重构**：地图定位为“索引而非仓库”，新增目标、笔记（含执行授权）、已定决策、尚未指定（战争迷雾）、范围之外等分节；前沿由调查清单投影；停止条件补齐目标命名与迷雾收敛项。
- **investigation-ticket-template**：随 Wayfinder 分类模型同步更新。
- **specdev INDEX**：A-archive-and-consolidate 描述更新为双模式沉淀 Work。

---

## [0.3.2] - 2026-07-31

### Added
- **`speculo mirror-skills` 命令**（#34）：将 `.agents/skills/*` 完整正本镜像为 `.claude/skills/*` 薄指针。指针保留正本 frontmatter（`name`/`description`/触发短语），正文仅含哨兵 `<!-- speculo:pointer -->` 与指向正本的相对路径 `../../../.agents/skills/<name>/SKILL.md`，不复制判定逻辑（单一事实来源）。支持反向归位（`.claude` 完整 skill 且 `.agents` 缺失时，先 copy 到 `.agents` 作正本再指针化）、幂等（二次运行仅 `skip`）、`--dry-run` 预览。`.agents` 缺失对应正本或两侧均为完整 skill 时明确报错而非静默。仅处理含 `SKILL.md` 的目录，`_shared/` 等自动跳过。

### Fixed
- **init 输出显式标注保留的 config.json**（#33）：更新（update）模式下若 `speculo/config.json` 已存在，不覆盖用户修改，并在输出中报告 `config.json (preserved)`，补齐验收标准的"创建/跳过提示"一项。全新 init 生成 config.json 的行为自 v0.2.1（commit 042e8a4）起已在 main 中，本次仅补 update 侧提示。

---

## [0.3.1] - 2026-07-31

### Added
- **E-engineering-cognitive-mentor workflow**：specdev 新增“工程认知导师”非执行型 work，面向 Bug、源码、需求方案、架构与陌生技术领域提供证据驱动、可复述、可恢复的认知指导；含 mode-routing、interaction-protocol、evidence-and-options、五类场景指南、comprehension-and-closure、persistence-and-resume 与 mentor-report-template 等渐进披露子文件。
- **E canonical 纳入生成流水线**：`generate-specdev-canonical.mjs` 注册 E 入口与引用闭包，`canonical-specdev-engineering-cognitive-mentor.md` 改为从源自动生成（取代早期手工版），纳入 `--check` 幂等校验。

### Changed
- **内部创作契约自包含化**：废弃集中式 `docs/`（skill/command/canonical/persistence-authoring），契约迁入各 speculo-write-* skill 的 `references/<type>-contract.md` 与 `.agents/skills/_shared/`（project-model、path-and-reference-rules、authoring-quality、validation-gates）；新增 `.agents/skills/README.md`。
- **AGENTS.md 刷新**：更新版本号至 v0.3.1、目录图（移除 `docs/`）、workflows 盘点（specdev 12 works 含 E）、Validation Pipeline（补 `generate-specdev-canonical --check`、`validate-speculo-assets.mjs`、`generate-index.mjs` 双 INDEX 模式）与 Internal Authoring Skills 引用说明。
- **specdev INDEX**：AUTO-INDEX 重建至 12 works（新增 E-engineering-cognitive-mentor）。
- **README / README-ZH**：文档索引移除已废弃的 `docs/` 链接，指向自包含的 `.agents/skills/`。

### Fixed
- **maintainer 校验器 `validate-speculo-assets.mjs`**：修正项目相对路径（`<Path>src/example.ts</Path>` 等，符合 path-reference-contract §3）被误判为“必须以 root alias 开头”；识别 `type: workflow-index` 整文件自动生成模式（person），不再对其强制 AUTO-INDEX 标记；豁免散文文档（README、`.speculo/`）与讲解性占位（省略号、`{roots.X}`/`{roots.xxx}`）。
- **E work 引用契约合规**：修正 E 文档中裸 `workspace.json` / `.status.json` code span 与 `<Path>...</Path>`、`<Url>...</Url>` 占位，改用完整 `<Path>` 或散文描述；`common/tools/validate-specdev.mjs` 的 `EXPECTED_WORKS` 白名单登记 E。

---

## [0.3.0] - 2026-07-28

### Added
- **R-review-architecture workflow**：新增架构评审工作流，含探索指南（exploration-guide.md）和 HTML 报告模板（html-report-template.md），支持系统性代码架构评审
- **handoff 独立 skill**：handoff 从 workflow 迁移为 `template/skills/common/handoff/SKILL.md` 和 `template/commands/handoff.md` 的一等公民 command+skill
- **Mao consultation output template**：person workflow 新增 `mao-consultation-output-template.md` 输出模板
- **git-repository-audit command**：新增 `template/commands/git-repository-audit.md` 命令定义
- `writing-great-skills` SKILL.md 新增内容补充
- `canonical-specdev-*` 文档内容更新
- `G-grill-with-docs` 新增 `adr-format.md` 引用

### Changed
- **AGENTS.md 刷新至 v0.3.0**：更新资产盘点（commands 4→5、skills 6→6、workflows 10→11+）、移除 canonicalize.mjs 引用
- **specdev workflow 重组**：INDEX.md 新增 R-review-architecture、A-archive-and-consolidate、P-goal-plan 条目；移除 improve-codebase-architecture
- **canonical 格式纯 Markdown 化**：`canonical-authoring.md` 移除 `scripts/canonicalize.mjs` 引用，确认纯 Markdown 分发格式
- **dev-worktree SKILL.md 大幅精简**：从 122 行压缩，移除冗余内容
- **triage SKILL.md 与 OUT-OF-SCOPE.md 更新**
- `validate-framework-assets.mjs` 与 `check-template-links.mjs` 适配新 workflow 结构
- 多个 specdev work entries 内容同步更新：D-diagnose-bugs, G-grill-with-docs, I-implement, I-init-setup, P-goal-plan, T-tickets, W-wayfinder
- GitHub npm ops 参考文档更新（failure-recovery, preflight-checklist, release-notes-injection, troubleshooting-playbook, version-bump-flow, workflow-yaml-reference）
- CLI 测试更新以匹配 handoff command 新路径

### Removed
- **`scripts/canonicalize.mjs`**：已废弃的旧 XML 容器格式生成脚本，与现行纯 Markdown 契约不符
- **`template/workflows/specdev/common/improve-codebase-architecture/`**：功能合并到 R-review-architecture
- **`.agents/skills/speculo-write-workflows/references/authoring-quality.md` 与 `persistence-contract.md`**：移除冗余参考文档

---

## [0.2.16] - 2026-07-24

### Fixed
- 修复 `speculo init` 未生成 `speculo/config.json` 的回归问题（#33）

### Added
- handoff 命令新增「路径引用规范」小节，要求文件引用统一使用项目根目录相对路径（#32）

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
