# Lead 编排与动态派单协议

## 1. 唯一 Lead

Lead 是主会话中的唯一编排 owner，保留需求解释、DAG/Wave/Gate、路径分配、权限、SpecDev 状态、Evidence、候选验收、父分支集成和最终回复责任。恢复时以 Goal Plan 的 `lead` locator 和权威工件继续；更换会话只转移 Lead 身份，不产生第二写入者。

## 2. 派单类型

- **implementation**：写入 Goal Plan 选择的 current workspace 或 Ticket worktree 的授权项目路径，运行非 E2E 检查并返回 implementation/source commit；
- **review**：只读审查固定 checkpoint，返回 findings；
- **research**：只读收集代码或外部事实，返回来源与结论；
- **test-observation**：只读运行或观察已授权检查，返回命令与结果，不拥有 E2E Gate。

Lead 在 Ticket 可以独立执行、写路径不冲突、上下文足够且平台支持时派单。派单是执行期决定，不写回 Goal Plan 作为固定拓扑。

## 3. 并发

required 模式 implementation subagent 上限取 Goal Plan、config 与平台能力的最小值；current 模式保持单 writer 串行安全不变量；Lead 不计入。review/research/test-observation agent 不设置 SpecDev 数字上限，但 Lead 必须避免测试资源冲突、重复工作和上下文失控。

## 4. 写入边界

implementation subagent 只写分配的 current workspace 或 worktree 中的项目路径和其 Git commit，不写 Ticket、Map、Goal Plan、Evidence、change status 或父分支。current 模式 commit 直接落在 parent branch；required 模式 commit 落在 source branch。其他 subagent 全部只读。Lead 接收返回后独立核对，再写所有 SpecDev 状态。

## 5. 动态 Dispatch Packet

每次派单必须绑定 Ticket、Goal Plan、依赖 Evidence、不可变 `base_sha`、branch/workspace locator、workspace strategy、writable/read-only/shared paths、provider、允许动作、非 E2E 验证、停止条件和返回格式。provider 或模型按当次能力与授权选择；外部 provider 需要独立的数据发送授权。

implementation 返回至少包含：Ticket ID、workspace locator、最终 commit、dirty 状态、修改路径、检查命令/结果、未验证项、冲突与阻塞。review/research 返回固定输入、findings、来源和未验证声明。

## 6. Lead 验收

Lead 核对基线、路径、commit、dirty 状态、项目事实与非 E2E 结果；不接受 subagent 自报的 Evidence 或 E2E pass。required implementation 候选进入 dev-worktree candidate-merge；current implementation 由 Lead 在同一 parent branch/current workspace 做 direct-parent 验证。read-only 结果由 Lead 复核后写入对应权威工件。首次失败可返回同一 workspace/worktree 修正或标记 blocked。

同一 Ticket 在 implementation/review 反复返回相同 blocker、下一轮没有产生新证据，或 integration attempts 达到有效 Plan 的 `integration_attempt_limit` 时，停止把相同请求直接退回原 implementation owner。Lead 保留 workspace、commit/candidate 与失败事实，在现有 Ticket Evidence 中回答四项：共同失败模式、最可能原因、下一轮具体改变、下一 owner/路由。Lead 可改写指导、调整 Ticket 内实现路径、更换 implementation owner 或自行实现；若发现 Ticket、Goal、父 Plan、Spec/ADR 已失效，则返回对应 owner。

只有 Lead 的复盘决定已写入 Evidence，才可将当前 Ticket 的 `attempts` 重置为 `0` 并发出新 Dispatch Packet；新 Packet 必须引用该 Evidence 并明确相较上一轮改变了什么。没有实质变化时不得重新派发同一请求。上限因此是 Lead 复盘触发点，不是 Ticket 的永久失败终态。

**完成标准**：每次写入只有一个 Ticket/owner/worktree；所有 SpecDev 状态由 Lead 落盘；派单、返回与重复失败后的 Lead 决定可从 Evidence 恢复。
