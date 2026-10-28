---
schema_version: 3
artifact: implementation-plan
change: <YYYY-MM-DD-topic>
status: blocked
source_map_revision: 1
orchestration: lead-directed
lead: <owner-or-session-locator>
integration_attempt_limit: 3
ticket_execution: auto
ready_for_execution: false
---

# Implementation Plan: <父目标>

本模板服务父多 change 编排。P 填写真实输入、范围、授权和 Gate 后才设置 ready / ready_for_execution: true；规划完成本身不授权实施。有明确票数或人数限制才分别增加 max_parallel_tickets / concurrent_implementation_limit。

## 1. Outcome and Authority

说明整体成功与伪完成、非目标、用户决定来源及唯一 Lead。编排采用外部依据时保留原研究定位、关键原始 URL 和适用限制。父 Map 拥有组合依赖；子 Spec/Ticket/Evidence 保持原权威。

## 2. Ready Frontier and Waves

记录当前可运行集合的依据、跨成员 Gate 和下一次回读条件；逐票进度从原 Ticket 读取。新型批量任务按 <Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/representative-ticket.md</Path> 判断是否先用第一票验证完整交付路径。

## 3. Workspace and Dispatch Contract

| Member | README Execution Context | 原 owner | 允许写集与共享资源 |
|---|---|---|---|

各成员保留自己的唯一 current/worktree 选择。TASK、验证与回收沿 <Path>{roots.workflows}/specdev/common/rules/coordination.md</Path>；票数、实际实现者人数与工作区数量分别核对。

## 4. Repository Integration Queue

列出 Git index/ref、共享验证环境的串行 owner。仅登记明确承诺且获授权的跨分支集成；没有该动作时说明依据，不制造 merge 或提交前置。

## 5. Gates and Aggregate Verification

| Gate | 开启条件 | 验证命令/观察与固定输入 | owner | 失败阻塞范围 |
|---|---|---|---|---|

成员完成后按 <Path>{roots.workflows}/specdev/specdev-p-goal-plan/assets/implementation-evidence-template.md</Path> 记录实际整体验证。风险适配双轴审查覆盖全部组合交付；子通过或模板字段齐全不代替 aggregate Evidence。

## 6. Conflict, Drift and Recovery

记录未知 writer、合同漂移、验证失败、外部未知结果的保全与恢复条件。局部阻塞只影响相关成员/票及依赖闭包；新证据或实质改变才允许重试，复用仍有效的授权。

## 7. Progress and Decisions

只保存父独有的 Gate、整体阻塞、决定与下一合法动作，导航子 Ticket/Evidence，不复制子状态。Outcome 仍归父 README。

## Execution Policy Source

填写真实用户/项目要求、ticket_execution、尝试上限及已有明确的票数/实现者限制出处；不能把模板缺省当成用户授权。完整路径与验收见 <Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/multi-change-plan.md</Path>。

