---
id: ops/postmortem
category: ops
name: 复盘工作流
description: 事后复盘与 LESSONS 沉淀
keywords: [postmortem, 复盘, 回顾, 总结]
---

# 复盘工作流执行指引

本工作流为已结束的事故或重大变更**做事后复盘**：把单次事件升华为组织知识，把抽象失败模式写回 `.speculo/.config/LESSONS.md`，把改进项注册到 `.speculo/.config/CONVENTIONS.md` 或 `RULES.md` 候选清单。

与 `../04-incident/` 的根因分析的差异：incident 阶段重在"止损 + 即时根因"；postmortem 阶段重在"流程改进 + 知识沉淀 + 跨项目模式识别"。

AI 进入本工作流时的前置动作：

1. 读 `../../../.speculo/ops-status.json` 锁定目标事件（通常是 `../04-incident/` 完成后衔接，也可独立触发用于重大变更复盘）。
2. 读对应 incident change 的 `incident.md`、根因分析、止损动作记录。
3. 读 `../../../.speculo/.config/LESSONS.md`，识别本次模式是否已有历史条目；命中即更新而非新增重复。
4. 读最近 N 次同类型 change 的归档（如有），找跨项目共性。

## 阶段

### 1. Review — 复盘报告
- 规范：`postmortem-checklist.md`
- 模板：`../_templates/postmortem-template.md`
- 产物：`postmortem.md`
- 完成准则：
  - `postmortem.md` 五章节（时间线 / 影响评估 / 做对的事 / 做错的事 / 改进项与指令）填写完成，无残留 `[TODO:]`
  - "时间线"段含至少 3 个关键节点（事件发生 / 检测 / 止损 / 恢复 / 复盘 等），每点含 ISO 时间戳
  - "影响评估"段含量化数据（影响用户数 / 服务降级时长 / 数据丢失情况）
  - "做对的事"+"做错的事"各 ≥2 条；做错的事不允许指责个人，聚焦流程与工具
  - "改进项与指令"段 ≥1 条 actionable item，每条含负责人、截止时间、跟踪载体（issue / PR / RULES 修订）
  - 必做收尾：抽象模式追加到 `../../../.speculo/.config/LESSONS.md`；改进项候选追加到 `LESSONS.md` 或对应 .config 文件

## 依赖

- 软依赖（建议先做）：`../04-incident/`（同一 incident change 下）
- 硬依赖：无（可独立触发用于重大变更或非事故性复盘）

## 状态扩展字段

本工作流需在 incident/postmortem change 的 `.status.json` 追加：

- `postmortem_for` (string|null) — 关联的 incident change name（独立复盘置 `null`）
- `timeline_events` (number) — 时间线事件数（至少 3）
- `improvement_items` (array) — 改进项清单，每项 `{description, owner, due, tracker_url}`
- `lessons_appended` (boolean) — 是否已写回 LESSONS.md
- `rules_change_proposed` (boolean) — 是否提议修订 `.speculo/.config/RULES.md`
- `archive_ready` (boolean) — 复盘完成且无遗留 → 可由 `commands/archive.md` 归档

## 完成与状态更新

- 进入 Review 时：`current_phase` 置 `postmortem-review`；`phase_history` 追加。
- 复盘报告完成：写入 `timeline_events` 与 `improvement_items`；置 phase `completed`。
- 必做收尾：`lessons_appended=true`；若提议修订 RULES.md，`rules_change_proposed=true` 并把候选条目追加到 LESSONS.md 末尾的"## RULES.md 修订建议"段（不直接改 RULES.md）。
- 复盘完成 + 所有改进项有承担方：`archive_ready=true`；`current_phase` 置 `null`；等待 `commands/archive.md` 归档。
