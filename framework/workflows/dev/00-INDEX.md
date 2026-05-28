---
id: dev/index
type: navigator
category: dev
name: Dev Workflows Index
description: dev 分类智能导航 + 实时状态汇报 + 下一步推荐
keywords: [dev, 导航, 状态, 开发]
---

# Dev 工作流导航

[TODO: 本文件作为"活跃命令"，AI 在用户不确定从哪开始时调用，应执行以下能力：
1. 扫描 `../../.speculo/dev-status.json` 索引 + 各 `../../.speculo/dev/*/.status.json`
2. 列出当前 active changes、各自 current_phase、updated_at
3. 列出"已 completed 但未 archived"的待归档清单
4. 根据用户意图 + 当前状态，推荐下一步执行哪个 workflow 的哪个 phase
5. 检查硬依赖是否满足，未满足则报错并提示先跑前置
]

## 内置工作流清单

| 编号 | 名称 | 用途 | 入口 |
|------|------|------|------|
| 01 | prd | 需求定义与评审 | `01-prd/01-prd.md` |
| 02 | design | 架构与 API 设计 | `02-design/02-design.md` |
| 03 | implement | 编码实现 | `03-implement/03-implement.md` |
| 04 | test | 单元 / 端到端测试 | `04-test/04-test.md` |
| 05 | review | 代码 / 安全评审 | `05-review/05-review.md` |

## 执行模式（execution_mode）

- `full`：`01-prd` → `02-design` → `03-implement` → `04-test` → `05-review`（新功能完整链路）
- `hotfix`：`03-implement` → `04-test`（紧急修复）
- `refactor`：`02-design` → `03-implement` → `04-test`（重构）

[TODO: 各工作流自治声明各自支持的 execution_mode，本清单需汇总。]
