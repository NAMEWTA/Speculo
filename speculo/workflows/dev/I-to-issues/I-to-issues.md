---
id: dev/I-to-issues
category: dev
name: To Issues
description: 将 PRD、计划或诊断结论拆成可独立接手的垂直切片 issue
keywords: [issues, slices, vertical, AFK, HITL, 切片]
---

# To Issues 工作流执行指引

本工作流是 `dev/I` 入口。它既可独立执行，也可嵌入 `dev/01`、`dev/02`、`dev/03` 或 `dev/H`，用于生成垂直切片。垂直切片和 issue 发布指引已内置在本 workflow 目录中。

## 内置指引

使用垂直切片（示踪弹）将计划、规格或 PRD 分解为可独立接手的 issue。

### 输入

- PRD、计划、设计记录、bug 诊断结论或当前对话上下文
- 用户明确提供的 issue tracker 配置和标签词汇表（如果存在）
- 当前 change 目录：`.speculo/dev/<change>/`

### 输出

- `.speculo/dev/<change>/slices.md`
- 垂直切片清单、依赖关系、HITL/AFK 标记和验收标准
- 可选的外部 issue 引用

### 垂直切片规则

- 每个切片交付一条贯穿所有层（schema、API、UI、测试）的窄但完整的路径。
- 完成的切片可独立演示或验证。
- 优先选择多个薄切片而非少数厚切片。

切片可以是 `HITL` 或 `AFK`。HITL 切片需要人类交互，例如架构决策或设计评审。AFK 切片可以在无人类交互的情况下实现和合并。尽可能优先选择 AFK 而非 HITL。

默认只生成本地切片计划。只有 tracker 已配置且用户明确要求时，才发布外部 issue；发布时按依赖顺序发布，以便被阻塞字段引用真实 issue 标识符。不要关闭或修改任何父级 issue。

## 阶段

### 1. Slice Issues — 垂直切片分解
- 规范：`issues-slices.md`
- 模板：`../_templates/issues-slices-template.md`
- 产物：`slices.md`
- 完成准则：
  - 每个切片都有标题、类型、依赖、覆盖的用户故事或来源
  - 已确认粒度、依赖和 HITL/AFK 标记
  - `slices.md` 无残留 `[TODO:]`

## 依赖

- 软依赖：`../02-prd/02-prd.md`，scope: same-change
- 硬依赖：无；可从用户计划、issue、诊断结论或 PRD 直接进入

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `dev_entry` (string) — 固定为 `dev/I`
- `embedded_guides` (array) — 包含 `to-issues`
- `slice_count` (number) — 切片数量
- `hitl_slice_count` (number) — HITL 切片数量
- `published_issue_refs` (array) — 已发布 issue 引用，默认空
- `issue_tracker_mode` (disabled | local-only | publish-requested | published) — issue tracker 使用状态

## 完成与状态更新

- 默认只生成本地 `slices.md`。
- 只有 tracker 已配置且用户明确要求时才发布外部 issue。
- 完成后不自动完成 change；通常移交 `../03-tdd/03-tdd.md`。
