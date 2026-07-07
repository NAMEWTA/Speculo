---
id: doc/edit-article
category: doc
name: Edit Article
description: 通过重组章节、提升清晰度、收紧表达来编辑和改进文章草稿
keywords: [edit, article, revise, clarity, draft, 编辑, 修订]
---

# Edit Article 工作流执行指引

本工作流用于编辑已有文章草稿。先按标题和信息依赖确认章节顺序，再逐节重写，提升清晰度、连贯性和流畅度。

> **目录命名：** `<change>` 必须为 `YYYY-MM-DD-<kebab-name>`（例：`2026-06-12-edit-article`）。产物写入 `speculo/.speculo/doc/<change>/`。

## 内置指引

### 何时使用

当用户想编辑、修订、改进文章草稿，或要求重组章节、收紧表达、提升清晰度时使用。

### 输入

- 用户提供的文章草稿路径，或 `speculo/.speculo/doc/<change>/article.md`
- 用户明确的发布目标、语气偏好或约束
- 当前 doc change 目录：`speculo/.speculo/doc/<change>/`（`<change>` 必须为 `YYYY-MM-DD-<kebab-name>`，例：`2026-06-12-edit-article`）

### 输出

- `speculo/.speculo/doc/<change>/edit-plan.md`
- `speculo/.speculo/doc/<change>/edited-article.md`
- 已确认的章节顺序、依赖关系和逐节编辑结果

### 执行原则

首先根据标题把文章分成多个章节，思考每个章节表达的主要观点。把信息视为有向无环图：某些信息片段依赖其他信息片段，章节顺序和内容顺序必须尊重这些依赖。

与用户确认章节后再逐节重写。每段最多 240 个字符。编辑时优先提升清晰度、连贯性和流畅度，不改变用户没有授权改变的核心主张。

## 阶段

### 1. Edit Plan — 章节与依赖确认
- 规范：`edit-article-plan.md`
- 模板：`../_templates/edit-article-plan-template.md`
- 产物：`edit-plan.md`
- 完成准则：
  - 已按章节列出主观点和依赖关系
  - 用户已确认章节顺序或给出修改意见
  - `edit-plan.md` 无残留 `[TODO:]`

### 2. Section Rewrite — 逐节重写
- 规范：`edit-article-rewrite.md`
- 模板：`../_templates/edit-article-template.md`
- 产物：`edited-article.md`
- 完成准则：
  - 已按确认顺序逐节编辑
  - 每段不超过 240 个字符，除非用户明确要求保留长段
  - `edited-article.md` 无残留 `[TODO:]`

## 依赖

- 软依赖：`../S-writing-shape/S-writing-shape.md` 或 `../B-writing-beats/B-writing-beats.md`，scope: same-change
- 硬依赖：无；用户也可以直接提供草稿文件

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `doc_entry` (string) — 固定为 `doc/E`
- `draft_paths` (array) — 草稿来源路径
- `document_paths` (array) — 至少包含 `edit-plan.md` 和 `edited-article.md`
- `section_count` (number) — 已识别章节数
- `edit_status` (planning | rewriting | reviewed | completed | blocked) — 编辑状态

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 完成 edit plan 后更新 `section_count` 和 `edit_status`。
- 每节重写后更新 `updated_at` 和 `edit_status`。
- 用户确认 edited article 完成后，调用 `../../commands/archive.md` 归档 change；不得自行写入 `change_status: completed`。
