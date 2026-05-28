---
id: dev/implement
category: dev
name: 实现工作流
description: 编码实现，可拆任务
keywords: [实现, implement, 编码, 开发]
---

# 实现工作流执行指引

[TODO: 简介本工作流目的；AI 进入时的前置动作。本工作流的自治特性：可按需创建 `tasks/` 子目录拆分实现任务，每个 `T0N.md` 代表一个独立实现单元，整体进度由 `tasks/00-INDEX.md` 汇总。]

## 阶段

### 1. Plan — 实现计划
- 规范：`implement-core.md`
- 模板：`../_templates/plan-template.md`
- 产物：`plan.md`
- 完成准则：[TODO]

### 2. Execute — 编码执行
- 规范：`implement-core.md` + `implement-checklist.md`
- 模板：`../_templates/implement-template.md`
- 产物：`implement.md`（及按需 `tasks/T0N.md`）
- 完成准则：[TODO]

## 依赖

- 软依赖（建议先做）：`../02-design/`（同一 change 下）
- 硬依赖：无

## 状态扩展字段

本工作流可在 `.status.json` 追加：
- `tasks` (object) — 任务级进度，键为 `T01/T02/...`，值为 `pending/in-progress/completed`

## 完成与状态更新

[TODO]
