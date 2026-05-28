---
id: dev/implement
category: dev
name: 实现工作流
description: 编码实现，可拆任务
keywords: [实现, implement, 编码, 开发]
---

# 实现工作流执行指引

本工作流把 `design-arch.md` + `design-api.md` 转化为**可运行、有 verify 输出、原子提交**的代码改动。本工作流的自治特性：**可按需创建 `tasks/` 子目录拆分实现任务**，每个 `T0N.md` 代表一个独立实现单元，整体进度由 `tasks/00-INDEX.md` 汇总，并由 `.status.json` 的 `tasks` 扩展字段反映。

AI 进入本工作流时的前置动作：

1. 读 `../../../.speculo/dev-status.json` 锁定目标 change。
2. 读同 change 的 `design-arch.md` 与 `design-api.md`；若缺失，回到 `../02-design/`。
3. 读 `../../../.speculo/.config/{RULES.md, CONVENTIONS.md, LESSONS.md}`（如存在），把强制约束与历史教训载入推理上下文。
4. 判断是否需要 `tasks/` 子目录：若实现涉及 ≥3 个独立可并行单元，或预计单次 fresh context 跑不完，**必须**拆 tasks。

## 阶段

### 1. Plan — 实现计划
- 规范：`implement-core.md`
- 模板：`../_templates/plan-template.md`
- 产物：`plan.md`
- 完成准则：
  - `plan.md` 三章节（任务拆分 / 关键路径 / 风险与依赖）填写完成，无残留 `[TODO:]`
  - 若启用 `tasks/`：列出全部 `T0N` 任务，每条标注 `[P]`（可并行）或 `[S]`（串行）及前置依赖
  - 每个任务声明 `read_files`（允许读路径范围）与 `write_files`（允许改路径范围），用于提交前 diff 边界 verify
  - 关键路径已用箭头或编号显式说明
  - 风险段含 ≥1 条已识别风险或显式"暂无"声明

### 2. Execute — 编码执行
- 规范：`implement-core.md` + `implement-checklist.md`
- 模板：`../_templates/implement-template.md`
- 产物：`implement.md`（及按需 `tasks/T0N.md`）
- 完成准则：
  - 每个任务完成时贴出 verify 命令的真实输出（构建/单测/lint 任一）；禁止空声明"完成"
  - 每个任务一次原子提交，message 含 change 标识符，格式参考 `implement-checklist.md`
  - 触发"破坏性变更"或"Schema 变更"任一条件时，按 `implement-checklist.md` 对应清单逐项满足
  - `implement.md` 的"完成度检查"段对照 `implement-checklist.md` 逐项确认勾选
  - 提交前用 `git diff --name-only HEAD` 与对应 `tasks/T0N.md` 的 `write_files` 字段比对，越界改动必须回滚或显式扩大授权

## 依赖

- 软依赖（建议先做）：`../02-design/`（同一 change 下）
- 硬依赖：无（hotfix 模式可跳过 design）

## 状态扩展字段

本工作流可在同 change 的 `.status.json` 追加：

- `tasks` (object) — 任务级进度，键为 `T01` / `T02` / ...，值为 `pending` / `in-progress` / `completed` / `blocked`
- `verify_log` (array) — 每次 verify 输出摘要，每项 `{task_id, command, exit_code, summary, at}`
- `breaking_changes` (boolean) — 是否触发破坏性变更门槛（默认 false）

## 完成与状态更新

- 进入 Plan 时：`current_phase` 置 `plan`；`phase_history` 追加 `{phase: "plan", entered_at}`。
- Plan 完成：写入 `tasks` 字段（若启用），全部条目置 `pending`；`current_phase` 置 `execute`。
- 每个任务开始执行：把对应 `tasks[T0N]` 置 `in-progress`；完成且 verify 通过后置 `completed`；遇阻塞置 `blocked` 并在 `tasks/T0N.md` 内说明。
- 全部任务 `completed`：把 execute phase 置 `completed`；`current_phase` 移交 `../04-test/` 或后续工作流。
- 触发破坏性变更：把 `breaking_changes` 置 true；并在 commit message 显式声明（参见 `implement-checklist.md`）。
