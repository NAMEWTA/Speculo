---
id: dev/D-docs-sync
category: dev
name: Docs Sync
description: 基于 git 差异、归档产物和 .config 生命周期同步或初始化项目文档与知识资产
keywords: [docs-sync, changelog, readme, agents, config, archive, adr, context, lessons, rules, documentation, 文档同步]
---

# Docs Sync 工作流执行指引

本工作流是 `dev/D` 入口，用于把一段 git 差异、归档产物和项目知识资产生命周期映射回 README、CHANGELOG、AGENTS、`docs/` 与 `speculo/.speculo/.config/`。常规状态下它只做基于事实的差量同步，不做整页重写，也不堆积没有当前代码或归档证据支撑的内容。

当 `speculo/.speculo/dev/docs-sync-state.json` 没有同步内容（例如 `tracked_assets: []`、`last_sync_sha: null` 或 state 文件不存在）时，默认进入 `bootstrap` 模式：面向当前项目执行一次从 0 到 1 的完整文档初始化，自动盘点项目事实、推导首批 `tracked_assets`、创建缺失的基础文档，并在验证通过后建立首次同步基线。

## 内置指引

### Iron Law

禁止在不读取 `speculo/.speculo/dev/docs-sync-state.json` 的 `last_sync_sha`、当前 `HEAD`、`speculo/.speculo/archive/` 相关归档产物与 `tracked_assets` 的情况下修改任何文档或 `.config` 知识资产。若 state 不存在或为空，也必须先按 `state-json-schema.md` 识别为 `bootstrap`，完成项目事实盘点后再创建或修改文档。

已建立基线后，如果 diff 为空且归档/`.config` 审计没有 stale、missing 或 prune 信号，直接报告无需同步或空同步，并按规则推进 state；不要触碰无关资产。`bootstrap` 模式不视为空同步，必须完成初始化审计。

文档更新必须是动态生命周期管理：每次同步都判断应新增、删除、修改、保留哪些内容。禁止只追加内容；发现旧事实、旧 ADR 引用、被当前实现反转的说明、空模板或重复沉淀时，必须删除、改写、标记废弃或在 report 中说明为何暂不处理。

### 输入

- `speculo/.speculo/dev/docs-sync-state.json`
- 当前 git `HEAD`
- state 中的 `tracked_assets` 列表
- `speculo/.speculo/archive/` 中与本次 diff、路径、术语或决策相关的归档 change
- `speculo/.speculo/.config/RULES.md`、`LESSONS.md`、`context/`、`adr/`
- 当前 change 目录：`speculo/.speculo/dev/<change>/`（`<change>` 必须为 `YYYY-MM-DD-<kebab-name>`，例：`2026-06-12-docs-sync`）

### 输出

- `speculo/.speculo/dev/<change>/docs-sync-report.md`
- 初始化或更新后的 tracked assets
- 更新后的 `speculo/.speculo/dev/docs-sync-state.json`

（`<change>` 格式：`YYYY-MM-DD-<kebab-name>`）

### 渐进披露

- `readme-contract.md`：更新 README 类文档时读取。
- `agents-contract.md`：更新 AGENTS / AI 代理手册类文档时读取。
- `changelog-contract.md`：更新 CHANGELOG 类文档时读取。
- `config-contract.md`：更新或审计 `speculo/.speculo/.config/` 时读取。
- `knowledge-extract.md`：从 `speculo/.speculo/archive/` 提取知识沉淀时读取。
- `state-json-schema.md`：初始化、迁移、读取或写回 docs-sync state 时读取。
- `../M-domain-modeling/M-domain-modeling.md`：术语、ADR、上下文边界不稳定或一词多义时读取并调用其确认流程；写 CONTEXT / ADR 前还要按需读取 `../M-domain-modeling/CONTEXT-FORMAT.md` 或 `../M-domain-modeling/ADR-FORMAT.md`。

> **通用语言对齐**：对外文档（README / AGENTS）中的领域术语以 `speculo/.speculo/.config/context/CONTEXT.md` 为准；同步中若发现文档与 CONTEXT 术语漂移，交由 `../M-domain-modeling/M-domain-modeling.md` 沉淀，docs-sync 本身不另立或重定义领域术语。
>
> **RULES 写入边界**：`speculo/.speculo/.config/RULES.md` 是用户维护资产。docs-sync 可以读取、审计并在 report 中提出增删改建议；只有用户明确确认某条规则改动时才写入。

## 阶段

| Phase | id | agent | 规范 | 产物 |
|-------|-----|-------|------|------|
| 1. State Read | `state-read` | — | `docs-sync-state.md` | `docs-sync-state.json` |
| 2. Diff Collect | `diff-collect` | `agents/docs-diff-agent.md` | `docs-sync-diff.md` | `docs-sync-report.md` |
| 3. Knowledge Extract | `knowledge-extract` | — | `knowledge-extract.md` | `docs-sync-report.md` |
| 4. Asset Audit & Update | `asset-audit-update` | `agents/docs-update-agent.md` | `docs-sync-update.md` | `docs-sync-report.md` |
| 5. State Write | `state-write` | `agents/docs-update-agent.md` | `docs-sync-finish.md` | `docs-sync-state.json` |

### 1. State Read — 读取同步状态
- id：`state-read`
- 规范：`docs-sync-state.md`
- 模板：`../_templates/docs-sync-state-template.json`
- 产物：`speculo/.speculo/dev/docs-sync-state.json`
- 完成准则：
  - 已确定 `LAST_SYNC_SHA` 和 `HEAD_SHA`
  - v1 state 已迁移或已明确阻塞
  - 首次空 state 已进入 `bootstrap` 模式，并已生成首批 `tracked_assets` 候选与初始化范围

### 2. Diff Collect — 收集 git 差异
- id：`diff-collect`
- 规范：`docs-sync-diff.md`
- 模板：无
- 产物：`docs-sync-report.md`
- 完成准则：
  - 常规同步已记录 git log、name-status、shortstat、路径分组和 archive/.config 相关 diff
  - `bootstrap` 模式下已完成项目文件、元数据、命令、入口、文档缺口和 `.config` 的全量盘点
  - 已判断哪些资产需要新增、删除、修改或保留

### 3. Knowledge Extract — 归档知识沉淀
- id：`knowledge-extract`
- 规范：`knowledge-extract.md`
- 模板：`../_templates/docs-sync-report-template.md`
- 产物：`docs-sync-report.md`
- 完成准则：
  - 已读取本次范围内新增/变更的 archive 高信号产物
  - 已把归档中的决策、术语、规则、经验和文档漂移信号映射到 tracked assets
  - 不确定或多语义项已转交 `../M-domain-modeling/M-domain-modeling.md` 或标记为待确认

### 4. Asset Audit & Update — 审计并差量更新资产
- id：`asset-audit-update`
- 规范：`docs-sync-update.md`
- 模板：`../_templates/docs-sync-report-template.md`
- 产物：`docs-sync-report.md`
- 完成准则：
  - 常规同步只修改 `tracked_assets` 中需要同步的资产；`bootstrap` 模式可先把推导出的基础文档纳入 `tracked_assets` 并创建缺失资产
  - README / CHANGELOG / AGENTS 类文档遵守对应 contract
  - `.config` 资产遵守 `config-contract.md`
  - ADR / CONTEXT 语义不稳定时已调用 `../M-domain-modeling/M-domain-modeling.md`
  - `docs-sync-report.md` 无残留 `[TODO:]`

### 5. State Write — 验证与写回状态
- id：`state-write`
- 规范：`docs-sync-finish.md`
- 模板：`../_templates/docs-sync-report-template.md`
- 产物：`speculo/.speculo/dev/docs-sync-state.json`
- 完成准则：
  - 已运行项目级校验或记录无法运行原因
  - state 已原子写入
  - 已向用户报告范围、改动资产和新基线

## 依赖

- 软依赖：`../M-domain-modeling/M-domain-modeling.md`，用于不稳定术语、上下文边界和 ADR 候选确认
- 硬依赖：git 仓库；首次空 state 默认执行 `bootstrap` 文档初始化。写入 `RULES.md`、删除 `.config` 文件或确认不稳定术语/ADR 时，仍需要用户明确确认

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `dev_entry` (string) — 固定为 `dev/D`
- `docs_sync_state_path` (string) — 固定为 `speculo/.speculo/dev/docs-sync-state.json`
- `docs_sync_range` (string) — 常规同步为 `<LAST_SYNC_SHA>..HEAD`，`bootstrap` 模式为 `<bootstrap>..HEAD`
- `tracked_assets` (array) — 本次纳入同步的文档和 `.config` 资产
- `synced_assets` (array) — 本次实际修改的资产
- `archive_sources` (array) — 本次读取的归档产物路径
- `config_audit_status` (none | proposed | confirmed | updated | blocked) — `.config` 审计/写入状态
- `docs_sync_status` (bootstrap | first-run | no-op | extracting | updating | synced | blocked) — 同步状态

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 只有验证完成后才原子写回 `speculo/.speculo/dev/docs-sync-state.json`。
- 本 workflow 不自动完成 change；同步完成后仅更新 `docs_sync_status` 等扩展字段。需要收尾时移交 `../04-finalize/04-finalize.md`；不得自行写入 `change_status: completed`。
