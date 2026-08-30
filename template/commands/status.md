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
3. 对每个 id 读取 `<Path>{roots.state}/{workflow}/status.json</Path>`，按该 workflow 自己的 schema 解释，不把 SpecDev 字段套到其他 workflow。SpecDev schema v5 和 Learning schema v1 均按 `active` 与 `archived` 分块；对 active 再读取 `changes/<change>/.status.json`，对 archived 按 `archive/YYYY-MM/<change>/.status.json` 定位。
4. 报告 active 数量、各 change 的 `current_work`、去重后的 `works_run`、change 业务状态、最近更新时间和停滞 change（`.status.json` 超过 14 天未更新）。SpecDev 额外报告调查 claims 与 triage `external_action`；Learning 额外报告 domain/topic、即时/保持测验、`next_review_at`、阻塞性误解和 `ready_to_archive`，不把 `awaiting_retention` 误报为可归档。
5. 报告 archived 数量和名称；Learning 同时读取 `context/REVIEW.md` 汇总已到期、即将到期和 `needs_refresh` 知识。预期归档目录或归档 `.status.json` 缺失、active/archived 重叠、重复名称、未知 schema、断开的 review 知识链接和 malformed 目录均列为异常，不自动修复。
6. 报告没有 workflow 资产的孤立状态根，以及缺少状态根的已安装 workflow；不自动修复。
7. 用户要求持久化时写入 `<Path>{roots.state}/commands/status/{date}-workspace-{topic}[-NN].md</Path>`，并在报告中列出本次扫描的 workflow 选择。
