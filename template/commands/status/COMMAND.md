---
id: status
description: Summarize installed workflows, active changes, anomalies, and next routes without activating a workflow.
---

# Status 命令

1. 读取 `<Path>{roots.state}/workspace.json</Path>`，解析 `<Path>{roots.config}</Path>`（不存在时以默认值静默降级），获取全部已安装 workflow/state 根。
2. 从 `<Path>{roots.workflows}/{workflow}/manifest.json</Path>` 与领域 `<Path>{roots.workflows}/{workflow}/SKILL.md</Path>` 核对已安装 workflow ids；仅用于发现，不激活 Work。
3. SpecDev 使用上面的工件分支；其他 id 读取 `<Path>{roots.state}/{workflow}/status.json</Path>`，按该 workflow 自己的当前 schema 解释，不把 SpecDev 字段套到其他 workflow。Learning schema v2 的 active/archived entry 携带 stable `change_id`、kind、parent/root、current locator、current_work、Homework 和 retention projection；递归 Change 位于 `changes/**` 或 `archive/**`，位置历史读取 `<Path>{roots.state}/learning/locations.json</Path>`。SpecDev 改走目录发现和 README 唯一 Outcome：changes 直接子目录为当前对象，changes/archive 为新归档，旧 archive/YYYY-MM 仅历史只读；未初始化且没有对象是合法空结果；Ops schema v3 使用 hosts/projects/deployments/allocations/bindings/releases 资源表，运行记录在 hosts/{host_id}/runs/{run_id} 或 releases/{run_id}。其他 schema 列为异常，停止解释该分支并保留原件，不转换或兼容读取。不得按 change 名跨 workflow 合并；按 (project, workflow, change-name) 去重，同身份多位置列异常，不重复合计或静默覆盖。
4. 按各域模型报告 active 数量；以下调用镜像仅用于原模型仍定义的领域，报告各 Change 的 `current_work`、去重后的 `works_run`、生命周期、parent/root、最近更新时间和停滞 Change（`.status.json` 超过 14 天未更新）。SpecDev 报告 README 接续点、active/completed/cancelled 与已结束未归档对象；更新时间无可靠来源时为 unknown，不以 mtime 推断 14 天停滞；调查 Assignment 按实际票回读，另报triage `external_action` / `publish_action`，以及 active+archive `<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>` 汇总的 `published_issues`（含 `origin:local` / `origin:intake`）、`publish_skipped`、`publish_failed`；并报告 workspace `<Path>{roots.state}/specdev/capture.md</Path>` 的 `inbox_open` / `inbox_intaken` / `inbox_waived`（缺失视为空 inbox，不计入 `published_issues`）。数字以本地账本为准，不扫 GitHub 当权威。可用 `<Path>{roots.workflows}/specdev/specdev-t-triage/scripts/publish-status.mjs</Path>` 与 `<Path>{roots.workflows}/specdev/specdev-t-triage/scripts/capture-status.mjs</Path>`。Learning 额外报告 domain/topic、Lesson/Homework、immediate/retention 和 synthesis 状态；Ops 按主机和 APP/公共服务分别展示 deployment_id、observed_version、路径、最后部署时间、共享绑定、plan/approval/run 状态与双边 docs-receipt。docs_pending/unknown 必须列异常；普通状态报告不读取或输出 private 明文账本，不把 OPS 资源套入 active/archived Change 统计。
5. 报告 archived 数量和完整 scope/project/change locator；Learning 同时读取 `context/REVIEW.md` 汇总到期 Review、topic evidence status 和需要刷新内容。按各域协议检查预期归档目录/权威工件缺失、active/archived 重叠、parent cycle、位置登记不一致、未知 schema、断开链接和 malformed 目录均列为异常，不自动修复。
6. 报告没有 workflow 资产的孤立状态根，以及按领域协议应存在而缺失的状态根；SpecDev 无业务对象不视为损坏，不自动修复。
7. 用户要求持久化时写入 `<Path>{roots.state}/commands/status/{date}-workspace-{topic}[-NN].md</Path>`，并在报告中列出本次扫描的 workflow 选择。
