# 变更追踪约定

SpecDev 只使用本地 Markdown/JSON 工件跟踪开发。远程 Issue、URL 或指定内容必须先由 Triage 冻结为 `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`；远程状态、label、assignee 和 dependency 不替代本地 change、Ticket、Map、Goal Plan 或 Evidence。

- change 根：`<Path>{roots.state}/specdev/changes/</Path>`。
- 单个 change：`<Path>{roots.state}/specdev/changes/{change}/</Path>`，其中 `{change}` 使用 `<YYYY-MM-DD>-<kebab-topic>`。
- 一个 change 表示一个可独立说明、实现、验证和归档的目标。
- `<Path>{roots.state}/specdev/status.json</Path>` 维护全局活动索引；`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 维护单个 change 生命周期。
- Ticket 文件是 Ticket 状态权威；`<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 是同步投影。
- 工件状态应在同一次操作中同步，避免入口状态、Ticket 状态与 Map 状态漂移。
- 完成条件：全部必需 Ticket 为 `done` 或有批准的 `cancelled`，证据齐全，无未批准 deviation，change 级验证通过。
- 归档后的 `<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/</Path>` 默认只读；后续纠正通过新 change 和 supersedes 链完成。
- 可关闭的远程来源在本地完成后由 Triage reconcile；`closed`、显式 `waived` 或 `not-applicable` 后才归档。
