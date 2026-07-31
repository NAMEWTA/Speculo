# Changelog

All notable changes to Speculo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
