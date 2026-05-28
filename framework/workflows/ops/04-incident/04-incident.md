---
id: ops/incident
category: ops
name: 事故响应工作流
description: 事故响应（严重度分级 + 根因分析）
keywords: [incident, 事故, 故障, 应急响应]
---

# 事故响应工作流执行指引

本工作流处理**生产或关键环境的运行时故障**：分级严重度、控制爆炸半径、识别根因、协调回滚或修复，并把抽象失败模式写回 LESSONS.md 供未来 dev/ops 工作流 grep。

事故场景与 dev workflow 的差异：**时间紧、信息少、决策窗口短**；本工作流的章节设计偏向"先止损后复盘"，复盘交给 `../05-postmortem/`。

AI 进入本工作流时的前置动作：

1. 读 `../../../.speculo/ops-status.json` 锁定触发事故的 change（如来自 `../03-monitor/` 触发回滚）。
2. 读对应 change 的 `deploy.md` 与 `deploy-rollback.md`（如存在），把已有回滚预案载入推理上下文。
3. 读 `../../../.speculo/.config/{RULES.md, LESSONS.md}`；grep 事故相关历史教训。
4. 立即创建独立 incident change 目录 `../../../.speculo/ops/<YYYY-MM-DD>-incident-<topic>/` 隔离产物（事故与触发它的 change 分开归档）。

## 阶段

### 1. Triage — 严重度分级与止损
- 规范：`incident-response.md`
- 模板：`../_templates/incident-template.md`
- 产物：`incident.md`
- 完成准则：
  - `incident.md` 四章节（事件摘要 / 严重度分级 / 止损动作 / 根因分析）填写完成，无残留 `[TODO:]`
  - 严重度三档之一：`P0`（全站不可用 / 数据安全风险） / `P1`（关键功能受损） / `P2`（非关键功能或局部受损）
  - 止损动作含至少一条已执行命令（贴出输出），常见动作：回滚、切流、降级、限流
  - 根因分析使用 5 Whys 或等价证据链方法，明确根因层级（即时原因 / 中间原因 / 根本原因）
  - 严重度 `P0`：必须在止损动作里执行了 `../02-deploy/deploy-rollback.md` 或等价隔离动作

## 依赖

- 软依赖：无
- 硬依赖：无（可独立触发；若涉及回滚，依赖 `../02-deploy/deploy-rollback.md` 的预案已就绪）

## 状态扩展字段

本工作流需在 incident change 的 `.status.json` 追加：

- `incident_severity` (string) — `P0` / `P1` / `P2`
- `triggered_by` (string|null) — 触发本事故的源 change name（如 `2026-05-28-user-auth`）；独立事件置 `null`
- `triage_actions` (array) — 止损动作清单，每项 `{action, executed_at, by, outcome}`
- `root_cause` (object) — `{immediate, intermediate, root}` 三层根因
- `lessons_appended` (boolean) — 是否已写回 LESSONS.md
- `postmortem_required` (boolean) — 是否需要进入 `../05-postmortem/`（默认 P0/P1=true，P2 可选）

## 完成与状态更新

- 进入 Triage 时：`current_phase` 置 `triage`；`phase_history` 追加；写入 `incident_severity`。
- 每条止损动作：实时追加到 `triage_actions`，含执行时间、执行人、结果。
- 根因明确：写入 `root_cause` 三层结构。
- 必做收尾：抽象事故失败模式追加到 `../../../.speculo/.config/LESSONS.md`，`lessons_appended=true`。
- 严重度 P0/P1：`postmortem_required=true`；`current_phase` 移交 `../05-postmortem/`。
- 严重度 P2：`postmortem_required` 由用户决定；可置 phase `completed` 后归档。
