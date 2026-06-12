---
id: doc/writing-beats
category: doc
name: Writing Beats
description: 从素材堆中选择起始 beat，并逐个 beat 推进文章旅程
keywords: [beats, narrative, article, writing, 叙事, 文章]
---

# Writing Beats 工作流执行指引

本工作流用于把文章塑造成一段由 beat 组成的旅程。用户从原始素材中选择起始 beat；执行者只写当前 beat，然后给出下一步转向选项，直到文章自然结束。

> **目录命名：** `<change>` 必须为 `YYYY-MM-DD-<kebab-name>`（例：`2026-06-12-article-notes`）。产物写入 `speculo/.speculo/doc/<change>/`。

## 内置指引

### 何时使用

当用户已有原始素材，并想把它组织成叙事旅程而不是一次性论证时使用。

### 输入

- 用户提供的原始素材 Markdown 路径，或同 change 的 `fragments.md`
- 当前文章文件：默认 `speculo/.speculo/doc/<change>/article.md`
- 当前 doc change 目录：`speculo/.speculo/doc/<change>/`（`<change>` 必须为 `YYYY-MM-DD-<kebab-name>`，例：`2026-06-12-article-notes`）

### 输出

- `speculo/.speculo/doc/<change>/article.md`
- `speculo/.speculo/doc/<change>/beat-log.md`
- 每轮 2-3 个候选下一个 beat

### 执行原则

beat 是旅程中的一个动作：铺开一个场景、落下一个观点、提出一个问题、插入旁白或扭转角度。一个 beat 可以是一句话、一小段或几段；如果需要 5 段和 3 个小标题，它就不是一个 beat，必须拆开。

每次只追加一个 beat。不要提前写后续内容。每次写入前都从磁盘重新读取 `article.md`，保留用户编辑。用户要求重写某个 beat 或回到某个 beat 试另一个方向时，只编辑对应区域。

文章在旅程完成时结束，不要求素材堆清空。

## 阶段

### 1. Beat Options — 候选 beat
- 规范：`writing-beats-options.md`
- 模板：`../_templates/writing-beat-options-template.md`
- 产物：`beat-log.md`
- 完成准则：
  - 已展示 2-3 个候选起始或下一个 beat
  - 已记录用户选择和选择理由

### 2. Beat Append — 写入当前 beat
- 规范：`writing-beats-append.md`
- 模板：`../_templates/writing-article-template.md`
- 产物：`article.md`
- 完成准则：
  - 只写入当前选定 beat
  - 写入前已重新读取 `article.md`
  - `article.md` 无残留 `[TODO:]`

## 依赖

- 软依赖：`../F-writing-fragments/F-writing-fragments.md`，scope: same-change
- 硬依赖：无；用户也可以直接提供素材文件

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `doc_entry` (string) — 固定为 `doc/B`
- `source_material_paths` (array) — 素材来源路径
- `document_paths` (array) — 至少包含 `article.md` 和 `beat-log.md`
- `beat_count` (number) — 已写入 beat 数量
- `current_beat_status` (choosing | appended | revising | completed | blocked) — 当前 beat 状态

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 每次写入 beat 后更新 `beat_count`、`current_beat_status` 和 `updated_at`。
- 文章自然结束且用户确认后，可把 `change_status` 置为 `completed`。
