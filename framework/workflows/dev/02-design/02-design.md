---
id: dev/design
category: dev
name: 设计工作流
description: 架构设计与 API 设计
keywords: [设计, design, 架构, api]
---

# 设计工作流执行指引

本工作流把 `prd.md` 中**用户视角的需求**转化为**实现视角的技术决策**，覆盖架构选型、模块边界、数据流、关键决策记录（ADR）与 API 设计。

AI 进入本工作流时的前置动作：

1. 读 `../../../.speculo/dev-status.json` 锁定目标 change。
2. 读同 change 的 `prd.md`；若不存在，回到 `../01-prd/` 完成 PRD 后再来。
3. 读 `../../../.speculo/.config/RULES.md` 与 `ARCHITECTURE.md`（若存在），把技术约束载入推理上下文。
4. 读 `../../../.speculo/.config/LESSONS.md`，grep 设计相关历史教训。
5. 若涉及复杂跨模块影响或安全敏感模块，提示用户切换更强模型（如 opus 等）进行推理。

## 阶段

### 1. Arch — 架构设计
- 规范：`design-arch.md`
- 模板：`../_templates/design-arch-template.md`
- 产物：`design-arch.md`
- 完成准则：
  - `design-arch.md` 三章节（整体架构 / 关键决策 / 数据流）填写完成，无残留 `[TODO:]`
  - 至少 1 张架构图（ascii / mermaid 任一），覆盖核心模块及其交互
  - "关键决策"段含 ≥2 个决策条目，每条带备选方案对比（至少 1 个被拒方案 + 拒绝理由）
  - 对照 `../../../.speculo/.config/RULES.md` 完成"宪法 Gate"自检（若 RULES.md 存在），任何违规需在文中显式声明例外原因
  - 数据流段含跨模块输入输出方向，标注同步/异步、是否含敏感数据

### 2. API — API 设计
- 规范：`design-api.md`
- 模板：`../_templates/design-api-template.md`
- 产物：`design-api.md`
- 完成准则：
  - "端点清单"段表格化列出所有端点，每条至少含 `method` / `path` / `参数概要` / `成功返回` / `错误码`
  - "共享 Schema"段定义跨端点复用的数据结构（无则显式写"无"，不留空）
  - 与 `prd.md` 验收标准映射：每条 AC 至少能在端点清单中找到对应支撑路径
  - 错误码与 `RULES.md` / `CONVENTIONS.md` 约定的错误码体系一致（若项目已定义）
  - 推荐使用 `<api>` XML 标签包裹端点细节强调结构（Speculo 允许 .md 内嵌 XML）

## 依赖

- 软依赖（建议先做）：`../01-prd/`（同一 change 下）
- 硬依赖：无

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `arch_decisions` (array) — 关键决策摘要，每项 `{id: "ADR-N", title, decided_at}`
- `api_endpoints_count` (number) — 端点总数（API phase 完成时写入）
- `design_review_decision` (string|null) — 若涉及跨团队评审，记录决议结果；本工作流不强制内部 review，置 `null`

## 完成与状态更新

- 进入 Arch 时：`current_phase` 置 `arch`；`phase_history` 追加 `{phase: "arch", entered_at, status: "in-progress"}`。
- Arch 完成：把对应条目置 `completed`；写入 `arch_decisions`；若本工作流无后续 phase（如 `refactor` 模式仅设计），把 `current_phase` 交给下游或置 `null`。
- 进入 API 时：`current_phase` 置 `api`；`phase_history` 追加 `{phase: "api", entered_at, status: "in-progress"}`。
- API 完成：把对应条目置 `completed`；写入 `api_endpoints_count`；`current_phase` 移交 `../03-implement/` 或后续工作流。
