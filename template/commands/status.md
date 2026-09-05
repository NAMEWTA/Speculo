---
id: status
type: command
name: Status
description: 汇总已安装 workflow、active changes、异常状态与下一步
keywords: [status, 状态, active, blocked]
---

# Status 命令

1. 读取 `<Path>{roots.state}/workspace.json</Path>`，解析 `<Path>{roots.config}</Path>`（不存在时以默认值静默降级），获取全部已安装 workflow/state 根。
2. 扫描 `<Path>{roots.workflows}/{workflow}/INDEX.md</Path>`，得到已安装 workflow ids。
3. 对每个 id 读取 `<Path>{roots.state}/{workflow}/status.json</Path>`，按该 workflow 自己的 schema 解释，不把 SpecDev 字段套到其他 workflow。Learning schema v2 的 active/archived entry 携带 stable `change_id`、kind、parent/root、current locator、current_work、Homework 和 retention projection；递归 Change 位于 `changes/**` 或 `archive/**`，位置历史读取 `<Path>{roots.state}/learning/locations.json</Path>`。SpecDev 继续使用 schema v5 根级 `changes/<change>`/`archive/YYYY-MM/<change>`；Ops schema v2 仍使用 `<Path>{roots.state}/ops/projects/{project_id}/changes/{change}/.status.json</Path>` 或对应 `archive/YYYY-MM/{change}/.status.json`。不得按 change 名跨 workflow 合并。
4. 报告 active 数量、各 Change 的 `current_work`、去重后的 `works_run`、生命周期、parent/root、最近更新时间和停滞 Change（`.status.json` 超过 14 天未更新）。SpecDev 额外报告调查 claims 与 triage `external_action`；Learning 额外报告 domain/topic、Lesson/Homework、immediate/retention 和 synthesis 状态；Ops 额外报告 scope/project、phase、outcome、current plan/approval、latest attempt 和 blockers，并把同名不同项目 Change 分行展示。
5. 报告 archived 数量和完整 scope/project/change locator；Learning 同时读取 `context/REVIEW.md` 汇总到期 Review、topic evidence status 和需要刷新内容。预期归档目录或 `.status.json` 缺失、active/archived 重叠、parent cycle、位置登记不一致、未知 schema、断开链接和 malformed 目录均列为异常，不自动修复。
6. 报告没有 workflow 资产的孤立状态根，以及缺少状态根的已安装 workflow；不自动修复。
7. 用户要求持久化时写入 `<Path>{roots.state}/commands/status/{date}-workspace-{topic}[-NN].md</Path>`，并在报告中列出本次扫描的 workflow 选择。
