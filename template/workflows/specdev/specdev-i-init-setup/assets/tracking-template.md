# 变更追踪约定

SpecDev 只使用本地 Markdown/JSON 工件跟踪开发。远程 Issue、URL 或指定内容必须先由 Triage 冻结为 `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`；远程状态、label、assignee 和 dependency 不替代本地 change、Ticket、Map、Goal Plan 或 Evidence。

- change 根：`<Path>{roots.state}/specdev/changes/</Path>`。
- 单个 change：`<Path>{roots.state}/specdev/changes/{change}/</Path>`，其中 `{change}` 使用 `<YYYY-MM-DD>-<kebab-topic>`。
- 一个 change 表示一个可独立说明、实现、验证和归档的目标。
- <Path>{roots.state}/specdev/changes/{change}/README.md</Path> 顶层唯一 Outcome 表示整体 active/completed/cancelled；归档由实际目录位置与回执表示。
- Ticket 文件是 Ticket 状态权威；`<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 只作导航、依赖和覆盖图，不复制进度。
- 简单任务由 README 清单负责；无票 Goal 由计划清单负责；有票由 Ticket/Evidence 负责，其他位置仅导航。
- 完成条件：全部必需 Ticket 为 `done` 或有批准的 `cancelled`，证据齐全，无未批准 deviation，change 级验证通过。
- 归档后的 `<Path>{roots.state}/specdev/changes/archive/{change}/</Path>` 默认只读；后续纠正通过新 change 和 supersedes 链完成。
- 可关闭的远程来源在本地完成后由 Delivery reconcile；`closed`、显式 `waived` 或 `not-applicable` 后才归档。完成后若要把 Ticket 记到 GitHub，由 D-delivery publish 写入 `<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>`；`pending`/`publish-failed` 不可归档。尚未成 Change 的记事项由 T-triage capture 写入 `<Path>{roots.state}/specdev/capture.md</Path>`（缺失合法），Issue 保持 open，不创建 change。发布计数与 inbox 计数都以对应本地账本为准，标签词表见 公共 request-classification。远程 Issue 仍不是开发权威。
