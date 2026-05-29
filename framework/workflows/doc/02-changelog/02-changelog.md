---
id: doc/changelog
category: doc
name: Changelog 工作流
description: 变更日志维护
keywords: [changelog, 变更日志, 发版说明]
---

# Changelog 工作流执行指引

本工作流把已完成或即将发布的 change 转化为面向用户的变更日志条目。它只记录用户可感知变化与迁移风险，不记录内部流水账。

AI 进入本工作流时的前置动作：

1. 读 `../../../.speculo/doc-status.json` 锁定目标 doc change。
2. 读取关联 dev change 的 `handoff.md`、`prd.md`、`design-api.md`、`review-*.md`（若存在）。
3. 读取项目现有 `CHANGELOG.md`，沿用其版本格式；不存在时使用 Keep a Changelog 风格。

## 阶段

### 1. Format — 条目格式与填写
- 规范：`changelog-format.md`
- 模板：`../_templates/changelog-template.md`
- 产物：`changelog.md`
- 完成准则：
  - `changelog.md` 无残留 `[TODO:]`
  - 条目按 Added / Changed / Fixed / Removed / Deprecated / Security 分组
  - 破坏性变更必须标 `BREAKING` 并指向迁移说明

## 依赖

- 软依赖：无
- 硬依赖：无

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `release_version` (string) — 目标版本，未知时为 `Unreleased`
- `changelog_target` (string) — 目标 changelog 路径，默认 `CHANGELOG.md`
- `breaking_changes` (boolean) — 是否包含破坏性变更
- `changelog_entries_count` (number) — 实际条目数

## 完成与状态更新

- 进入 Format 时：`current_phase` 置 `format`；`phase_history` 追加。
- Format 完成：把对应条目置 `completed`；写入 `release_version`、`changelog_target`、`breaking_changes`、`changelog_entries_count`。
- 若本 doc change 仅用于 changelog 且无后续 API 文档，完成后可把 `change_status` 置 `completed`。
