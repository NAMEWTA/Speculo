---
id: doc/writing-shape
category: doc
name: Writing Shape
description: 读取原始素材 Markdown，并通过对话式会话塑造成可发布文章
keywords: [shape, article, markdown, draft, writing, 塑形]
---

# Writing Shape 工作流执行指引

本工作流用于把一份原始素材 Markdown 文件塑造成独立文章。素材堆只读；文章产物默认写入当前 doc change 的 `article.md`。

> **目录命名：** `<change>` 必须为 `YYYY-MM-DD-<kebab-name>`（例：`2026-06-12-shape-article`）。产物写入 `speculo/.speculo/doc/<change>/`。

## 内置指引

### 何时使用

当用户有一堆笔记、fragments 或粗稿，并想把它变成可发布内容时使用。

### 输入

- 用户提供的原始素材 Markdown 路径，或 `speculo/.speculo/doc/<change>/fragments.md`
- 当前文章文件：默认 `speculo/.speculo/doc/<change>/article.md`
- 当前 doc change 目录：`speculo/.speculo/doc/<change>/`（`<change>` 必须为 `YYYY-MM-DD-<kebab-name>`，例：`2026-06-12-shape-article`）

### 输出

- `speculo/.speculo/doc/<change>/article.md`
- `speculo/.speculo/doc/<change>/shape-log.md`
- 已确认的开头、论点顺序、格式选择和缺口

### 执行原则

先从头到尾读完素材堆，再做其他事。不要编辑原始素材文件，它对本 workflow 是只读的。

这是反向的追问式会话：问题不是“你注意到了什么”，而是“这篇文章到底在论证什么，读者需要按什么顺序听到它”。要反驳虚弱的转场；如果一段话没有赢得自己的位置，就删掉它。

每个块达成一致后立即追加到 `article.md`。每次写入前都重新读取文章文件，保留用户编辑。

## 阶段

### 1. Opening Choice — 候选开头
- 规范：`writing-shape-opening.md`
- 模板：`../_templates/writing-shape-log-template.md`
- 产物：`shape-log.md`
- 完成准则：
  - 已完整读取素材
  - 已展示 2-3 个候选开头
  - 用户已选择或组合出开头

### 2. Block Shaping — 逐块塑形
- 规范：`writing-shape-block.md`
- 模板：`../_templates/writing-article-template.md`
- 产物：`article.md`
- 完成准则：
  - 每个写入块都有明确功能和格式选择
  - 写入前已重新读取 `article.md`
  - `article.md` 无残留 `[TODO:]`

## 依赖

- 软依赖：`../F-writing-fragments/F-writing-fragments.md`，scope: same-change
- 硬依赖：无；用户也可以直接提供素材文件

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `doc_entry` (string) — 固定为 `doc/S`
- `source_material_paths` (array) — 只读素材来源路径
- `document_paths` (array) — 至少包含 `article.md` 和 `shape-log.md`
- `opening_status` (unselected | selected | revised) — 开头状态
- `format_decisions` (array) — prose、list、table、callout、quote、code 等格式选择记录
- `writing_status` (shaping | revising | completed | blocked) — 文章塑形状态

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 每次写入块后更新 `format_decisions`、`writing_status` 和 `updated_at`。
- 文章完成由用户决定；用户确认完成后，调用 `../../commands/archive.md` 归档 change；不得自行写入 `change_status: completed`。
