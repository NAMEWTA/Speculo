# Ops 持久化与注册

本 Work 已作为 `<Path>{roots.workflows}/ops/H-computer-hygiene/H-computer-hygiene.md</Path>` 注册。id 为 `ops/computer-hygiene`。

## 状态根

| 产物 | 路径 | Owner |
| --- | --- | --- |
| 运行报告 | `<Path>{roots.state}/ops/changes/{change}/hygiene/runs/{date}/{time}-{run-id}/</Path>` | H |
| Q 审批 | `<Path>{roots.state}/ops/changes/{change}/hygiene/approvals/</Path>` | H |
| 主机隔离区 | 本机 `~/.speculo-hygiene/quarantine/{run-id}/` | 用户主机，external mutation |
| Change 状态 | `<Path>{roots.state}/ops/changes/{change}/.status.json</Path>` | 当前 Work |
| 全局索引 | `<Path>{roots.state}/ops/status.json</Path>` | I 创建；H 可追加 hygiene-only global entry |

`template/workflows/ops/_state/` 只是种子。Work 静态目录只保存脚本、规则、模板和示例，不保存用户主机报告。

## hygiene-only 完成

未进入 P/E 的 global hygiene change 可以由 H 设为 `completed` + `ready_to_archive`，`latest_attempt_id` 必须为 null。归档仍走 `<Path>{roots.workflows}/ops/A-archive-and-learn/A-archive-and-learn.md</Path>`。含 plan/attempt 的部署 change 仍由 E 拥有 completed 转换。

## 校验

```bash
node <Path>{roots.workflows}/ops/common/tools/validate-ops.mjs</Path> --workflow-root <Path>{roots.workflows}/ops</Path>
python3 -m unittest discover -s <Path>{roots.workflows}/ops/H-computer-hygiene/tests</Path> -v
```
