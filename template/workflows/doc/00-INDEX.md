---
id: doc/index
category: doc
name: Doc Workflow Index
description: 文档写作、塑形、编辑与素材管理的横向工作流导航入口
keywords: [doc, writing, article, fragments, edit, 文档, 写作]
---

# Doc Workflow Index

> ⚠️ **持久化铁律：本文件及所有 doc workflow 的全部产物，必须且只能写入 `speculo/.speculo/doc/<change>/`。绝对禁止写入项目根目录的 `.speculo/`、`temp/` 或其他任何非规范位置。**

本文件是 doc 分类的导航入口。进入时先读取 `speculo/.speculo/doc-status.json`，再按其中 active change 读取 `speculo/.speculo/doc/<change>/.status.json`，根据用户意图推荐横向 workflow。

> **命名铁律：** 所有 change 目录必须为 `YYYY-MM-DD-<kebab-name>`（例：`2026-06-12-article-draft`）。不符合此格式的目录视为 `malformed`，仅汇报不自动操作。

## 入口别名

| 别名 | 入口 | 用途 |
|------|------|------|
| `doc/M` | `M-mao-zedong-cognitive-os/M-mao-zedong-cognitive-os.md` | 以毛泽东方法论为底座的认知咨询：分析问题→制定战略→组织行动 |
| `doc/T` | `T-teach/T-teach.md` | 设计交互式课程：使命→资源→课程→参考→记录 |
| `doc/F` | `F-writing-fragments/F-writing-fragments.md` | 追问式访谈，沉淀异质 fragment 素材 |
| `doc/B` | `B-writing-beats/B-writing-beats.md` | 逐个 beat 推进文章旅程 |
| `doc/S` | `S-writing-shape/S-writing-shape.md` | 读取素材堆并对话式塑造成文章 |
| `doc/E` | `E-edit-article/E-edit-article.md` | 重组章节、提升清晰度并收紧表达 |

## 进入协议

1. 若用户未指定 change，扫描 `speculo/.speculo/doc-status.json` 和 `speculo/.speculo/doc/*/.status.json`，列出 active changes。
   - **命名校验**：扫描时仅处理符合 `YYYY-MM-DD-<kebab-name>` 格式的目录。不符合的目录标记为 `malformed`，单独列出路径并提示用户修复或手动清理，不自动删除或重命名。
2. 若只有一个 active change，默认继续该 change；若有多个 active change，要求用户选择。
3. 若没有 active change，按用户意图创建新的 doc change 目录，**目录名必须为 `YYYY-MM-DD-<kebab-name>`**（使用当前日期，`<kebab-name>` 从用户意图提取），并初始化 `.status.json` 与 `speculo/.speculo/doc-status.json`。
4. 推荐入口时优先使用用户显式别名；没有别名时按用户意图推荐一个横向 workflow。
5. 执行任何 workflow 前，读取该 workflow 入口文件、阶段文件和模板。

## 执行模式

- `mao`：以毛泽东方法论进行结构化认知咨询——分析问题、制定战略、组织行动，进入 `doc/M`。
- `teach`：想学某个主题，需要设计交互式课程体验，进入 `doc/T`。
- `fragments`：从主题和对话中采集素材，进入 `doc/F`。
- `beats`：已有素材，想逐个转向推进叙事，进入 `doc/B`。
- `shape`：已有素材堆或粗稿，想塑造成可发布文章，进入 `doc/S`。
- `edit`：已有文章草稿，想编辑、重组、润色，进入 `doc/E`。

## 状态汇报

输出 doc 状态时至少包含：

- active change 数量与每个 change 的 `current_phase`
- malformed 目录清单（不符合 `YYYY-MM-DD-<kebab-name>` 格式的目录）
- 每个 change 的当前文档路径、素材路径和最近写入时间
- `phase_history` 最后一项为 `blocked` 或 `updated_at` 超过 14 天未变化的 change
- 推荐下一步入口和原因

## 完成与状态更新

- 所有 doc workflow 必须维护同一 change 的 `.status.json`。
- 进入 phase 时更新 `current_phase`，并在 `phase_history` 追加 `in-progress` 记录。
- phase 完成时写入 `completed_at` 和 `status: completed`。
- 用户确认文章、素材采集或编辑边界完成后，才把 `change_status` 置为 `completed`。
