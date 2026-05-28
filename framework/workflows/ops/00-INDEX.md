---
id: ops/index
type: navigator
category: ops
name: Ops Workflows Index
description: ops 分类智能导航 + 实时状态汇报 + 下一步推荐
keywords: [ops, 运维, 发版, 部署]
---

# Ops 工作流导航

本文件作为"活跃命令"，AI 在用户不确定从哪开始时调用，应执行以下能力：

1. 扫描 `../../.speculo/ops-status.json` 索引 + 各 `../../.speculo/ops/*/.status.json`。
2. 列出当前 active changes、各自 `current_phase`、`updated_at`。
3. 列出"已 completed 但未 archived"的待归档清单。
4. 根据用户意图 + 当前状态，推荐下一步执行哪个 workflow 的哪个 phase。
5. 检查硬依赖是否满足（如 `01-release` 硬依赖 `dev/05-review`、`02-deploy` 硬依赖 `01-release`），未满足则报错并提示先跑前置。

## 内置工作流清单

| 编号 | 名称 | 用途 | 入口 |
|------|------|------|------|
| 01 | release | 发版流程（版本制品 + checklist） | `01-release/01-release.md` |
| 02 | deploy | 部署执行与回滚预案 | `02-deploy/02-deploy.md` |
| 03 | monitor | 发版后观测窗口 | `03-monitor/03-monitor.md` |
| 04 | incident | 事故响应（含根因分析） | `04-incident/04-incident.md` |
| 05 | postmortem | 事后复盘与 LESSONS 沉淀 | `05-postmortem/05-postmortem.md` |

## 执行模式（execution_mode）

- `standard`：`01-release` → `02-deploy` → `03-monitor`（典型上线链路）
- `release-only`：仅 `01-release`（只准备制品不部署，如对外发版而无服务化部署）
- `hotfix-deploy`：`02-deploy`（紧急回滚或热修部署，跳过完整 release）
- `incident-response`：`04-incident` → `05-postmortem`（事故触发的应急链路）
- `postmortem-only`：仅 `05-postmortem`（针对已结束事件的复盘）

## 跨工作流硬依赖速查

| 当前 | 硬依赖 |
|------|--------|
| `01-release` | `../dev/05-review/`（评审通过） |
| `02-deploy` | `01-release`（前置检查通过） |
| `03-monitor` | `02-deploy`（部署完成） |
| `04-incident` | 可独立触发；若涉及回滚，依赖 `02-deploy/deploy-rollback.md` |
| `05-postmortem` | `04-incident` 或任一已完成的 ops change |

## LESSONS 闭环

`04-incident` 与 `05-postmortem` 的"完成与状态更新"段强制要求把抽象失败模式追加到 `../../.speculo/.config/LESSONS.md`，与 `../dev/05-review/` 的 LESSONS 写回闭环统一，形成跨 change / 跨 category 的失败知识库。
