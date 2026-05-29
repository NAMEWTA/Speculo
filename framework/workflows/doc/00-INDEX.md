---
id: doc/index
type: navigator
category: doc
name: Doc Workflows Index
description: doc 分类智能导航 + 实时状态汇报 + 下一步推荐
keywords: [doc, 文档, 导航]
---

# Doc 工作流导航

本文件作为"活跃命令"，AI 在用户不确定从哪开始写文档时调用，应执行以下能力：

1. 扫描 `../../.speculo/doc-status.json` 索引 + 各 `../../.speculo/doc/*/.status.json`。
2. 列出当前 active doc changes、各自 `current_phase`、`updated_at`。
3. 列出"已 completed 但未 archived"的待归档清单。
4. 根据用户意图 + 当前状态，推荐下一步执行哪个 doc workflow 的哪个 phase。
5. 若用户要写 changelog 或 API 文档，优先检查是否存在相关 dev change 产物作为事实来源。

## 内置工作流清单

| 编号 | 名称 | 用途 | 入口 |
|------|------|------|------|
| 01 | readme | 项目 README 写作 | `01-readme/01-readme.md` |
| 02 | changelog | 变更日志维护 | `02-changelog/02-changelog.md` |
| 03 | api-doc | API 文档编写 | `03-api-doc/03-api-doc.md` |

## 执行模式（execution_mode）

- `readme`：仅执行 `01-readme`，用于项目门面新增或重写。
- `release-docs`：`02-changelog` → `03-api-doc`，用于发版前文档同步。
- `api-only`：仅执行 `03-api-doc`，用于接口变更或接口文档补齐。
- `maintenance`：按用户指定文档局部更新，不强制完整链路。

## 跨工作流依赖速查

| 当前 | 依赖 |
|------|------|
| `01-readme` | 软依赖项目现有 README、`../../.speculo/.config/ARCHITECTURE.md` |
| `02-changelog` | 软依赖 `../dev/06-handoff/` 或提交 diff |
| `03-api-doc` | 软依赖 `../dev/02-design/` 的 `design-api.md` |

## 完成与状态更新

doc change 的 `.status.json` 必须维护 `phase_history`、`current_phase` 与各 workflow 自治字段。全部文档产物完成后把 `change_status` 置 `completed`，等待 `../../commands/archive.md` 归档。
