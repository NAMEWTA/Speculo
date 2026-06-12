---
id: doc/writing-fragments
category: doc
name: Writing Fragments
description: 通过追问式访谈采集异质写作素材，并追加到当前 doc change 的 fragments 文档
keywords: [fragments, ideate, raw material, writing, 写作素材]
---

# Writing Fragments 工作流执行指引

本工作流用于在强加结构之前发展想法。它围绕用户想写的主题持续追问，捕捉 fragment，并把素材追加到当前 doc change 的 `fragments.md`。

> **目录命名：** `<change>` 必须为 `YYYY-MM-DD-<kebab-name>`（例：`2026-06-12-collect-ideas`）。产物写入 `.speculo/doc/<change>/`。

## 内置指引

### 何时使用

当用户想发展想法、采集写作原材料，或提到 `fragments`、`ideate`、`raw material`、素材、片段时使用。

### 输入

- 用户给出的主题、初始 prompt 或已有素材
- 用户在会话中补充的主张、小场景、锋利句子、半成形想法
- 当前 doc change 目录：`.speculo/doc/<change>/`（`<change>` 必须为 `YYYY-MM-DD-<kebab-name>`，例：`2026-06-12-collect-ideas`）

### 输出

- `.speculo/doc/<change>/fragments.md`
- `.speculo/doc/<change>/interview-log.md`
- 可继续用于 `../B-writing-beats/B-writing-beats.md` 或 `../S-writing-shape/S-writing-shape.md` 的素材堆

### 执行原则

从用户说的第一句话开始捕捉 fragment，包括初始 prompt。不要强加阶段、提纲或结构；本 workflow 的目标是让素材变多、变锋利，而不是过早排序。

fragment 是任何可能保留到最终文章中的文字片段。它必须能被作者读懂，但不需要让陌生读者立刻看懂。判断标准是“这是不是一段好文字”，不是“这是不是一个自洽论证”。

第一次写入 `fragments.md` 时，在顶部放一个 H1 作为工作标题；除此之外不要放 metadata、TOC 或日期。fragments 之间用水平分隔线分隔。正文内部不要标题、标签或人为顺序。

每次写入前都重新读取 `fragments.md`，保留用户在会话期间做的编辑。不要覆盖文件；只追加，除非用户明确要求原地编辑、删除或合并某个 fragment。

## 阶段

### 1. Fragment Interview — 追问式采集
- 规范：`writing-fragments-interview.md`
- 模板：`../_templates/writing-fragments-template.md`
- 产物：`fragments.md`
- 完成准则：
  - 已把本轮出现的可保留 fragment 追加到 `fragments.md`
  - `fragments.md` 无残留 `[TODO:]`

### 2. Interview Log — 采集状态记录
- 规范：`writing-fragments-log.md`
- 模板：`../_templates/writing-interview-log-template.md`
- 产物：`interview-log.md`
- 完成准则：
  - 已记录追问方向、已采集素材类型和下一轮高价值问题
  - `interview-log.md` 无残留 `[TODO:]`

## 依赖

- 软依赖：无
- 硬依赖：无

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `doc_entry` (string) — 固定为 `doc/F`
- `source_material_paths` (array) — 用户提供或本 workflow 读取的素材路径
- `document_paths` (array) — 至少包含 `fragments.md`
- `fragment_count` (number) — 当前已采集 fragment 数量
- `writing_status` (collecting | paused | completed | blocked) — 素材采集状态

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 每次追加 fragment 后更新 `updated_at`、`document_paths` 和 `fragment_count`。
- 本 workflow 完成后不自动完成 change；默认可继续移交 `../B-writing-beats/B-writing-beats.md`、`../S-writing-shape/S-writing-shape.md` 或按用户要求停止。
