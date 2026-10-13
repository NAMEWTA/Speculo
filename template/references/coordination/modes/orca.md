# Orca 编排

仅在当前任务选择 Orca 时读取。先读取本机当前版本提供的 Orca CLI 与 orchestration 指南；使用指南指向的实际命令。记录实际版本、指南来源和任务 locator，不在 Speculo 内固定 agent、模型或 runner 列表。

1. 确认用户项目、当前工作区以及当前 Lead 的责任。需要保留 Lead 连续推进时使用受监督任务方式；完整 handoff 会转移责任，只有用户明确选择该交接时才使用。
2. 沿当前工具提供的任务、工作区、会话和消息接口建立目标。Orca 管理的 worktree 由 Orca 操作；允许工具支持的 folder workspace，不凭空要求所有项目必须有 Git worktree。
3. 使用 <Path>{roots.references}/coordination/task-brief.md</Path> 的真实入口和任务说明。保存工具返回的任务/尝试/session locator；不要以标题猜句柄。
4. 区分投递已接收、任务开始、任务返回、写入停止和业务验收。工具已有生命周期由工具管理，不再建调度器。
5. 处理该任务的 question、完成及升级请求；已有权威答案由 Lead 回答，额外权限或产品决定再交用户。确认已处理必要消息后才按工具合同确认收件。
6. 状态不明时重读任务和收件事实。旧句柄失效时按当前指南查询，不同时向旧、新目标重复发送。
7. 接收、取消、保留或释放工作区按当前指南及真实授权操作。释放不等于取消，完成消息不等于旧写入者已经停止。

核对返回和候选后按 <Path>{roots.references}/coordination/result-and-recovery.md</Path> 接续原 Goal。工具或所需能力不可用时准确报告当前阻塞，不自行安装升级。
