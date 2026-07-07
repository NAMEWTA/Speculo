---
id: dev/A-improve-architecture
category: dev
name: Improve Architecture
description: 扫描代码库寻找深化机会，以可视化 HTML 报告呈现候选，再对选中方向深入质询并沉淀领域模型
keywords: [architecture, deepening, deep-module, refactor, 架构, 深化, 接缝]
---

# Improve Architecture 工作流执行指引

本工作流是 `dev/A` 入口：浮现架构摩擦、提出**深化机会**，目标是可测试性与 AI 可导航性。架构词汇统一引用 `../../../vendor/codebase-design/SKILL.md`；领域语言以 `speculo/.speculo/.config/context/CONTEXT.md` 为准。

> **目录命名：** `<change>` 必须为 `YYYY-MM-DD-<kebab-name>`。产物写入 `speculo/.speculo/dev/<change>/`。

## 何时使用

当用户想系统性发现并落实架构深化机会时使用。也可由 `../H-diagnose/H-diagnose.md` 在修复后转入。

## 阶段

| Phase | id | 规范 | 产物 |
|-------|-----|------|------|
| 1. Scan | `architecture-scan` | `architecture-scan.md` | `architecture-candidates.md` |
| 2. Report | `architecture-review` | `architecture-review.md`、`HTML-REPORT.md` | `architecture-review.html` |
| 3. Grill | `architecture-grill` | `architecture-grill.md` | `architecture-design.md` |

### 1. Scan — 探索深化候选
- id：`architecture-scan`
- 完成准则：`architecture-candidates.md` 无残留 `[TODO:]`；候选用 codebase-design 词汇命名

### 2. Report — 可视化架构审查报告
- id：`architecture-review`
- 完成准则：HTML 已写入 change 目录并为用户打开；已请用户选择候选

### 3. Grill — 质询所选候选并沉淀
- id：`architecture-grill`
- 完成准则：`architecture-design.md` 无残留 `[TODO:]`；术语/ADR 经用户确认后沉淀

## 依赖

- 硬依赖：无
- 软依赖：`../M-domain-modeling/`（领域沉淀）、`../03-tdd/03-tdd.md`（实现落地）

## 状态扩展字段

- `dev_entry` (string) — 固定为 `dev/A`
- `embedded_guides` (array) — 包含 `improve-architecture`
- `candidate_count` (number)
- `selected_candidate` (string|null)
- `report_path` (string|null)
- `architecture_status` (scanning | reported | grilling | designed | blocked)

## 完成与状态更新

- 进入每个 phase 时更新 `current_phase` 和 `phase_history`。
- 本工作流不自动完成 change；深化的实现交由 `../03-tdd/03-tdd.md` 落地。

### 缺少 change 目录时

若无 active change，执行 `../AGENTS.md` 进入协议步骤 3（原子三步），不得内联自初始化 JSON。
