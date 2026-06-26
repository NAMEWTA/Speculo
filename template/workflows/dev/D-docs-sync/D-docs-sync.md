---
id: dev/D-docs-sync
category: dev
name: Docs Sync
description: 基于 git 差异增量同步 README、CHANGELOG、AGENTS 等对外文档
keywords: [docs-sync, changelog, readme, agents, documentation, 文档同步]
---

# Docs Sync 工作流执行指引

本工作流是 `dev/D` 入口，用于把一段 git 差异映射回对外文档。它只做差量同步，不从零创建文档，也不做整页重写。

## 内置指引

### Iron Law

禁止在不读取 `speculo/.speculo/dev/docs-sync-state.json` 的 `last_sync_sha` 与当前 `HEAD` 之间 diff 的情况下修改任何对外文档。

如果 diff 为空，或只有文档自身变动，直接报告无需同步或空同步，并按规则推进 state；不要触碰无关文档。

### 输入

- `speculo/.speculo/dev/docs-sync-state.json`
- 当前 git `HEAD`
- state 中的 `tracked_docs` 列表
- 当前 change 目录：`speculo/.speculo/dev/<change>/`（`<change>` 必须为 `YYYY-MM-DD-<kebab-name>`，例：`2026-06-12-docs-sync`）

### 输出

- `speculo/.speculo/dev/<change>/docs-sync-report.md`
- 更新后的 tracked docs
- 更新后的 `speculo/.speculo/dev/docs-sync-state.json`

（`<change>` 格式：`YYYY-MM-DD-<kebab-name>`）

### 渐进披露

- `readme-contract.md`：更新 README 类文档时读取。
- `agents-contract.md`：更新 AGENTS / AI 代理手册类文档时读取。
- `changelog-contract.md`：更新 CHANGELOG 类文档时读取。
- `state-json-schema.md`：初始化、读取或写回 docs-sync state 时读取。

> **通用语言对齐**：对外文档（README / AGENTS）中的领域术语以 `speculo/.speculo/.config/context/CONTEXT.md` 为准；同步中若发现文档与 CONTEXT 术语漂移，交由 `../M-domain-modeling/M-domain-modeling.md` 沉淀，docs-sync 本身不另立或重定义领域术语。

## 阶段

### 1. State Read — 读取同步状态
- 规范：`docs-sync-state.md`
- 模板：`../_templates/docs-sync-state-template.json`
- 产物：`speculo/.speculo/dev/docs-sync-state.json`
- 完成准则：
  - 已确定 `LAST_SYNC_SHA` 和 `HEAD_SHA`
  - 首次运行时已初始化 state 并要求用户确认 `tracked_docs`

### 2. Diff Collect — 收集 git 差异
- 规范：`docs-sync-diff.md`
- 模板：无
- 产物：`docs-sync-report.md`
- 完成准则：
  - 已记录 git log、name-status、shortstat 和路径分组
  - 已判断是否需要修改文档

### 3. Docs Update — 差量更新文档
- 规范：`docs-sync-update.md`
- 模板：`../_templates/docs-sync-report-template.md`
- 产物：`docs-sync-report.md`
- 完成准则：
  - 只修改 `tracked_docs` 中需要同步的文档
  - README / CHANGELOG / AGENTS 类文档遵守对应 contract
  - `docs-sync-report.md` 无残留 `[TODO:]`

### 4. State Write — 验证与写回状态
- 规范：`docs-sync-finish.md`
- 模板：`../_templates/docs-sync-report-template.md`
- 产物：`speculo/.speculo/dev/docs-sync-state.json`
- 完成准则：
  - 已运行项目级校验或记录无法运行原因
  - state 已原子写入
  - 已向用户报告范围、改动文档和新基线

## 依赖

- 软依赖：无
- 硬依赖：git 仓库；首次运行需要用户确认 `tracked_docs`

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `dev_entry` (string) — 固定为 `dev/D`
- `docs_sync_state_path` (string) — 固定为 `speculo/.speculo/dev/docs-sync-state.json`
- `docs_sync_range` (string) — `<LAST_SYNC_SHA>..HEAD`
- `tracked_docs` (array) — 本次纳入同步的文档
- `synced_docs` (array) — 本次实际修改的文档
- `docs_sync_status` (first-run | no-op | updating | synced | blocked) — 同步状态

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 只有验证完成后才原子写回 `speculo/.speculo/dev/docs-sync-state.json`。
- 本 workflow 不自动完成 change；用户要求仅同步文档时，可在报告完成后把 `change_status` 置为 `completed`。
