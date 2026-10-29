# Lead 编排与动态派单

共同方法读取 <Path>{roots.references}/coordination/coordination-contract.md</Path>；票据调度和工作区规则读取 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path>。

## 唯一 Lead 与实际执行者

Lead 保留需求解释、DAG/Wave/Gate、路径分配、授权、正式状态、Evidence、整体 E2E 和最终回复。Lead 是职责，不是单 Agent 拓扑；实现可由单 Agent、subagent 或团队完成，按用户/项目/Work 要求安排。按执行策略决定复用或新派，同一个主 Agent 或受派 Agent 可连续执行多个 Ticket，票据边界不自动结束其会话。独立 reviewer 不参与本范围实现。

## 调度与并发

serial 完成一票的实现、审查和验证后再开始下一票，同票内部仍可合作。auto/parallel 只推进 Ready、依赖满足、路径和语义资源无冲突的票；max_parallel_tickets 计量票据，显式实现者限制另行核对。Wave 不是填满 Agent 数的目标。review/research/test-observation 默认只读，不额外占票据槽；review 状态的原票仍计入活动票数。

## 写集与派单

所有本 change 执行者使用 README 的同一工作区；细分授权写集，shared path 有唯一 owner。Git index、commit/checkout/merge 串行协调；没有具体授权不操作。计划、Ticket、Map 可由获分配的 worker 直接写入；正式状态、审批、Evidence 和 Outcome 由原 owner 在验收后维护。

实际派遣按 <Path>{roots.references}/coordination/task-brief.md</Path> 绑定票据/Spec、依赖证据、不可变基线、选定工作区、允许路径/动作、验证、停止条件和返回位置。按 <Path>{roots.references}/coordination/session-files.md</Path> 根据实际恢复与审计需要选择即时返回或持久 TASK/REPORT，外部 CLI/Orca/Herdr 与原生协作遵循同一规则；持久任务的冻结输入、可选日志定位及投递/回收校验沿该合同，不建 Agent 注册表。返回包含实际实现者、路径、checkpoint 或快照、dirty 状态、命令结果、未验证项及 blocker。

## 验收与恢复

Lead 回读实际工具和工作区事实，在稳定输入上完成审查和检查；REPORT completed 不等于 Ticket done。E2E Gate 仍由 Lead 执行并核验，实施者自报不替代。输入漂移后仅使相关证据失效。

重复同一 blocker 无新证据或达到有效尝试上限时停止重复派单；原 Evidence 保存共同失败模式、可能原因、下一轮改变和 owner/路由。形成有实质变化的新 Dispatch Packet 才能重置 attempts；仅换 Agent、重置计数或重问同一问题不构成恢复。契约失效返回真正 owner，其他独立票可继续。
