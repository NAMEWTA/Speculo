# Goal Plan 核心编排协议

共同编排见 <Path>{roots.references}/coordination/coordination-contract.md</Path>；执行选择见 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path>。

## DAG、Wave 与调度

依赖权威来自 Ticket blocked_by，Map 是投影。边只表示真实开始条件，不表达 Agent 交接偏好。计算关键路径、扇出/汇合与共享合同 owner；Wave 内票据 Ready、依赖 Evidence 完整、路径与语义资源无冲突且 Gate 已打开。

serial 逐票实现、审查和验证；auto/parallel 按条件推进合法集合，不受 current/worktree 类型影响。控制器分别输出 eligible、conflicts 和 suggested_batch；建议 Wave 不是唯一合法组合，也不是执行授权。Lead 可在全部条件内选另一批次，不将 ID 排序当业务优先级。max_parallel_tickets 计票，既有实现者限制单独遵守。只读探索和同票团队协作不改变票据调度。

新型批量重复任务且派单或验收方法尚未验证时，读取 <Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/representative-ticket.md</Path>，用第一张真实 Ticket 验证整条交付路径后再从同类 eligible 节点选择后续无冲突组合。已验证方法不增加此门。

## Gate 与 shared owner

Gate 写明工程/业务状态、开启条件、关闭证据、阻塞范围、owner/批准人和失败恢复。共享合同稳定、垂直路径、迁移、发布、观察期均按实际风险设门，不以完成票数代替。

按 <Path>{roots.workflows}/specdev/common/rules/path-ownership.md</Path> 指定 shared path 的专用 owner Ticket，消费者等其验收后开始。每票都在 change 选定工作区工作；输入变化重新 preflight，不为下游创建 worktree。

## 稳定输入与验收顺序

Git index 操作和共享环境检查串行协调；停止相关 writer 后冻结实际交付，Lead 与适用的独立 reviewer 检查相同输入；是否需要独立 reviewer 按风险及用户/项目要求决定，standards/specification 内容不等同固定执行者。单票可用实际 commit 或未提交快照，Evidence 引用 README 唯一工作区，不复制生命周期。整体 Gate 覆盖全部票据交付。

验证失败保留现场，按原上限复盘；不创建候选 worktree、不强制每票提交/合并。明确承诺的跨分支集成按具体授权串行执行并重验结果。

## Expand-contract

顺序保持 expand → migrate → observe → contract → verify，每批有可恢复 checkpoint、验证和所需批准；提交与部署按实际项目交付约定执行。收缩依据旧调用/数据/协议归零证据。

**完成标准**：票据依赖、资源和验收可恢复，实际交付与 Evidence 一致，额外 Git/发布动作有独立授权和结果。
