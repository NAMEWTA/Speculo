---
id: status
type: command
name: Status
description: 汇总已安装 workflow、active changes、异常状态与下一步
keywords: [status, 状态, active, blocked]
---

# Status 命令

1. 读取 `speculo/.speculo/workspace.json`，解析 `speculo/config.json`（不存在时以默认值静默降级），获取全部已安装 workflow/state 根。
2. 扫描 `speculo/workflows/*/INDEX.md`，得到已安装 workflow ids。
3. 对每个 id 读取 `speculo/.speculo/<workflow>/status.json`。SpecDev schema v4 直接按 `active` 与 `archived` 分块；对 active 再读取 `changes/<change>/.status.json`，对 archived 按 `archive/YYYY-MM/<change>/.status.json` 定位。
4. 报告 active 数量、各 change 的 `current_work`、去重后的 `works_run`、change 业务状态、最近更新时间、调查 claims，以及停滞 change（`.status.json` 超过 14 天未更新）。SpecDev change 存在 `triage.md` 时同时读取 `external_action`，把 `pending-close`、`close-failed` 和可归档状态分开显示；不执行远程动作。
5. 报告 archived 数量和名称；预期归档目录或归档 `.status.json` 缺失、active/archived 重叠、重复名称、未知 schema 和 malformed 目录均列为异常，不自动修复。
6. 报告没有 workflow 资产的孤立状态根，以及缺少状态根的已安装 workflow；不自动修复。
7. 用户要求持久化时写入 `speculo/.speculo/commands/status/<YYYY-MM-DD>-workspace-<topic>[-NN].md`，并在报告中列出本次扫描的 workflow 选择。
