---
id: status
type: command
name: Status
description: 汇总已安装 workflow、active changes、异常状态与下一步
keywords: [status, 状态, active, blocked]
---

# Status 命令

1. 扫描 `speculo/workflows/*/WORKFLOW.md`，得到已安装 workflow ids。
2. 对每个 id 读取 `speculo/.speculo/<workflow>/status.json`，再读取 `changes/<change>/.status.json`。
3. 报告 active 数量、current route/phase、最近更新时间、blocked/stale changes 与 malformed 目录。
4. 报告没有 workflow 资产的孤立状态根，以及缺少状态根的已安装 workflow；不自动修复。
5. 用户要求持久化时写入 `speculo/.speculo/commands/status/<YYYY-MM-DD>-workspace-<topic>[-NN].md`，并在报告中列出本次扫描的 workflow 选择。
