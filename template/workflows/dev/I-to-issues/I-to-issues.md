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
- 当前 change 目录：`speculo/.speculo/dev/<change>/`（`<change>` 必须为 `YYYY-MM-DD-<kebab-name>`，例：`2026-06-12-user-auth`）

### 输出

- `speculo/.speculo/dev/<change>/slices.md`
- 垂直切片清单、依赖关系、HITL/AFK 标记和验收标准
- 可选的外部 issue 引用

（`<change>` 格式：`YYYY-MM-DD-<kebab-name>`）

### 垂直切片规则

- 每个切片交付一条贯穿所有层（schema、API、UI、测试）的窄但完整的路径。
- 完成的切片可独立演示或验证。
- 优先选择多个薄切片而非少数厚切片。

切片可以是 `HITL` 或 `AFK`。HITL 切片需要人类交互，例如架构决策或设计评审。AFK 切片可以在无人类交互的情况下实现和合并。尽可能优先选择 AFK 而非 HITL。

默认只生成本地切片计划。只有 tracker 已配置且用户明确要求时，才发布外部 issue；发布时按依赖顺序发布，以便被阻塞字段引用真实 issue 标识符。不要关闭或修改任何父级 issue。

### 切片计划质量准则

`slices.md` 不是清单，而是一份可被下游直接接手的**切片计划**。借鉴高质量 plan 的纪律：

- **Context 先行**：先写清*为什么*、**已确认决策**（范围拍板，防下游重新扯皮）与**关键核实结论**（探索得到的事实），再展开切片。
- **存疑即问**：方案有未决分支时，按本工作流「存疑时的提问协议」用 `AskUserQuestion` 一次一问、带推荐、逐步锁定，不臆测。
- **行号现场核对**：引用的行号/路径均为*近似*，实施时以现场代码为准；在计划内写明这一点，避免下游照搬过期行号。
- **保留/不动同等重要**：每个切片既写「改什么」，也写「**保留/不动什么**」——告诉执行者哪些不能碰。
- **验证分层**：删除型切片的验收须含残留扫描（grep 0 命中）；change 级验证总览走真实运行的冒烟与（如涉及）迁移测试。
- **复用优先于新造**：能复用就不新建，在切片「复用」字段与 §1 REUSE 列显式记录。
- **重型小节按需**：风险登记、退役清单、架构上下文是条件段——复杂 change 铺开，单文件小改可省。

## 阶段

### 1. Slice Issues — 垂直切片分解
- 规范：`issues-slices.md`
- 模板：`../_templates/issues-slices-template.md`
- 产物：`slices.md`
- 完成准则：
  - §0 战略与背景含**已确认决策**与**关键核实结论**（独立进入时自采集，有上游则继承）
  - 每个切片都有标题、类型、依赖、覆盖来源、验收切片；删除型切片标注**保留/不动**
  - 已确认粒度、依赖和 HITL/AFK 标记
  - §8 验证总览存在（静态 → 残留扫描 → 冒烟，按适用项）
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
