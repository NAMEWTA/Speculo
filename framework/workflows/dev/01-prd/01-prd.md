---
id: dev/prd
category: dev
name: PRD 工作流
description: 需求定义与评审
keywords: [prd, 需求, feature, 产品]
---

# PRD 工作流执行指引

本工作流把"模糊想法或用户诉求"转化为**结构化、可验证、范围明确的产品需求文档**，并完成一轮内部评审，作为下游设计、实现、测试的真相源。

AI 进入本工作流时的前置消歧动作：

1. 读 `../../../.speculo/dev-status.json` 索引，列出当前 `active` change。
2. 若用户未指明目标 change：询问"针对哪个 change？"或提议创建 `YYYY-MM-DD-<kebab>` 新目录。
3. 若已锁定 change，读对应 `.status.json` 的 `current_phase`，判断本工作流应进入 Core 还是 Review。
4. 读 `../../../.speculo/.config/RULES.md`（若存在），把项目级强制约束载入推理上下文。
5. 读 `../../../.speculo/.config/LESSONS.md`（若存在），grep PRD 相关失败模式，避免重蹈。

## 阶段

### 1. Core — 核心 PRD 填写
- 规范：`prd-core.md`
- 模板：`../_templates/prd-template.md`
- 产物：`prd.md`
- 完成准则：
  - `prd.md` 四个章节（项目背景 / 核心需求 / 范围与非范围 / 验收标准）全部填写，无残留 `[TODO:]`
  - 核心需求至少 3 条用户故事，格式"作为 <角色>，我希望 <能力>，以便 <价值>"
  - 验收标准每条满足 Given/When/Then 三要素或等价可测语句
  - 显式列出 ≥1 条"非范围"项
  - 所有歧义已用 `[NEEDS-CLARIFY: ...]` 标注并附答复路径（用户回复 / 待评审决议）

### 2. Review — 评审
- 规范：`prd-review.md`
- 模板：`../_templates/prd-review-template.md`
- 产物：`prd-review.md`
- 完成准则：
  - 评审决议三档之一：`通过` / `通过-小修` / `不通过`
  - 每条意见携带定位引用（如 `prd.md#核心需求` 或 `prd.md:行号`）
  - 若决议为"通过-小修"或"不通过"，待修订项清单非空；待修订项处理完毕后允许补一份"二次评审记录"段（同文件内追加）
  - 决议为"通过"或"通过-小修+已修订"才允许 `phase_history` 标记 review 为 `completed`

## 依赖

- 软依赖（建议先做）：无
- 硬依赖：无

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `stakeholders` (array) — 干系人清单，每项 `{name, role}`
- `priority` (string) — `P0` / `P1` / `P2` / `P3` 之一
- `prd_review_decision` (string) — `通过` / `通过-小修` / `不通过`（Review phase 完成时写入）
- `clarifications_open` (number) — 仍未解决的 `[NEEDS-CLARIFY:]` 数量（Core 完成时归零）

## 完成与状态更新

- 进入 Core 时：在 `phase_history` 追加 `{ phase: "core", entered_at, status: "in-progress" }`；`current_phase` 置 `core`。
- Core 完成时：把对应条目的 `completed_at` 与 `status: "completed"` 写入；`current_phase` 置 `review`；写入 `clarifications_open=0`。
- 进入 Review 时：追加 `{ phase: "review", entered_at, status: "in-progress" }`。
- Review 决议为"通过"或"通过-小修+已修订"时：把 review 条目置 `completed`；写入 `prd_review_decision`；若是本工作流为本 change 的最后一个 phase，则把 `change_status` 置 `completed`，否则保持 `active` 并让下游工作流接管 `current_phase`。
- 决议为"不通过"：保留 review 为 `in-progress`，不推进；等修订后重跑 Core → Review。
