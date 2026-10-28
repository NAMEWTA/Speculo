# Implementation Super-DAG

## 组合身份

每个节点使用 `<member-change>::<ticket-id>`。父 Map 的 `tasks` 必须与所有成员 Ticket 一一对应，包括已经 done/cancelled 的节点；不得用标题、文件名或局部 Ticket ID 代替组合身份。

## Dependency

- 子 change 内部 dependency 从 Ticket `blocked_by` 精确提升，不得遗漏或改序；
- 跨 change dependency 只表达后置 Ticket 实际消费前置 Ticket 的合同、代码、迁移或产物；
- 格式为 `dependent <- prerequisite`；端点必须存在；自依赖、重复边和循环阻塞 Ready。

## Serialization

serialization 格式为 `task-a <> task-b`，只表示两个无语义依赖的 Ticket 因 writable/shared path、repository/ref、环境、迁移窗口或唯一资源不能同时执行。无方向重复 pair 非法。

依赖与串行不能互相冒充。Map 正文必须记录跨 change 边或 serialization 的事实来源、owner、开始 Gate 和解除证据。

## Eligibility、冲突与建议批次

<Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path> 是只读分析器：`eligible` 列出所有自身 Ready、owner 明确、依赖成功、无局部 blocker、与活动 writer 无冲突且有当前配额的候选。`dependencies` 保留原依赖，`conflicts` 单列写集、语义资源与显式 serialization 冲突；`suggested_batch` 只是一个稳定排序后贪心选出的可行建议，不是唯一合法顺序，不代表模型调度或用户授权。`deferred` 中的 suggestion-only 仅表示未被该建议选中，不把合法候选变成硬阻塞。

Lead 可以按用户优先级、关键路径、上下文复用和真实能力选择另一 eligible 子集，仍需核验全部 pair 冲突、父/子配额、授权、writer 状态与实际依赖产物。cancelled 是终态但不是成功交付；下游保持阻塞，取消单票不改变 README 的整体 Outcome。

工作区、Ticket 调度和 Agent 数量独立，唯一策略读取 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path>。current 同样可并行不相交的授权写集；worktree 不提供资源锁。不再按旧 current/required 枚举固定 Wave 大小。共享路径、Git index/commit/merge、迁移和不可并发资源须唯一 owner 或串行协调；有多个候选不等于必须创建多个 Agent。

## 漂移

每轮从子 Ticket 重新构建预期 task set 和内部 edges。与父 Map 不一致时停止派单、递增 revision、更新 Map 与 Plan，再重新计算；不能用旧投影覆盖子权威。

