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

Lead 核对基线、路径、commit、dirty 状态、项目事实与非 E2E 结果；不接受 subagent 自报的 Evidence 或 E2E pass。required implementation 候选进入 dev-worktree candidate-merge；current implementation 由 Lead 在同一 parent branch/current workspace 做 direct-parent 验证。read-only 结果由 Lead 复核后写入对应权威工件。失败返回同一 workspace/worktree 修正或标记 blocked。

**完成标准**：每次写入只有一个 Ticket/owner/worktree；所有 SpecDev 状态由 Lead 落盘；派单和返回可从 Evidence 恢复。
