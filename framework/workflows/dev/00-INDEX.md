---
id: dev/index
type: navigator
category: dev
name: Dev Workflows Index
description: dev 分类智能导航 + 实时状态汇报 + 下一步推荐
keywords: [dev, 导航, 状态, 开发]
---

# Dev 工作流导航

本文件作为"活跃命令"，AI 在用户不确定从哪开始时调用，应执行以下能力：

1. 扫描 `../../.speculo/dev-status.json` 索引 + 各 `../../.speculo/dev/*/.status.json`。
2. 列出当前 active changes、各自 `current_phase`、`updated_at`。
3. 列出"已 completed 但未 archived"的待归档清单。
4. 根据用户意图 + 当前状态，推荐下一步执行哪个 workflow 的哪个 phase。
5. 检查硬依赖是否满足（如 `01-prd` 软依赖 `02-design`、`05-review` 软依赖 `04-test`），未满足则报错并提示先跑前置。

## 内置工作流清单

| 编号 | 名称 | 用途 | 入口 |
|------|------|------|------|
| 01 | prd | 需求定义与评审 | `01-prd/01-prd.md` |
| 02 | design | 架构与 API 设计 | `02-design/02-design.md` |
| 03 | implement | 编码实现（可拆 tasks/） | `03-implement/03-implement.md` |
| 04 | test | 单元 / 端到端测试 | `04-test/04-test.md` |
| 05 | review | 代码 / 安全评审 | `05-review/05-review.md` |
| 06 | handoff | 交接 doc/ops + 归档准备 | `06-handoff/06-handoff.md` |

## 执行模式（execution_mode）

- `full`：`01-prd` → `02-design` → `03-implement` → `04-test` → `05-review` → `06-handoff`（新功能完整链路）
- `hotfix`：`03-implement` → `04-test` → `05-review`（紧急修复，跳过 prd 与 design）
- `refactor`：`02-design` → `03-implement` → `04-test` → `05-review`（重构）
- `doc-only`：仅涉及文档变更，转 `doc/` 分类
- `internal-handoff`：跑完 `06-handoff` 即归档（无 ops 流程的内部交付）

## 跨工作流硬依赖速查

| 当前 | 硬依赖 |
|------|--------|
| `01-prd` | 无 |
| `02-design` | 无（软依赖 `01-prd`） |
| `03-implement` | 无（软依赖 `02-design`） |
| `04-test` | 无（软依赖 `03-implement`） |
| `05-review` | 无（软依赖 `04-test`） |
| `06-handoff` | 无（软依赖 `05-review`；完成准则隐式要求评审通过） |

## LESSONS 闭环

`05-review` 的"完成与状态更新"段强制要求把抽象失败模式追加到 `../../.speculo/.config/LESSONS.md`，与 `../ops/04-incident` 和 `../ops/05-postmortem` 的 LESSONS 写回闭环统一，形成跨 change / 跨 category 的失败知识库。
