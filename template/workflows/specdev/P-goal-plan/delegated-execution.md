# Goal Plan 委派执行协议

只有用户在本次 P-goal-plan 运行中明确选择 `coordination_mode: lead-team` 时加载。该分支启用唯一 Lead 与 native/external Worker，但不决定 workspace strategy；Agent Team 可以只做只读分工，也可以与独立 worktree 组合。

## 1. Lead 与 Delivery Contract

Lead 负责源码基线、DAG、Wave、shared owner、Gate、权限、Evidence 汇总和最终验收；已派发写入 Ticket 的实现由对应执行者负责，Lead 不制造双重 owner。只有 workspace addendum 将 Lead 指定为 integration owner 时，Lead 才拥有对应 Git 集成。

委派分支选择唯一 execution model：`native-subagent` 或 `external-web-subagent`。Lead 以 `operation=plan` 调用 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/SKILL.md</Path>` 生成里程碑 Delivery Contract；Implement 阶段以 `operation=execute` 调用同一 Skill 做恢复和验收。

Delivery Contract 必须固定：

- execution model、Lead、provider 和可恢复 workspace/session locator；
- repository、branch、不可变 checkpoint 与源码交付方式；
- 最大并发和默认 3 轮的 `max_correction_rounds`；
- 标准轴、规范轴、Lead 独立验证和条件性 E2E；
- local changes、commit、push、PR、merge、deploy、migration 和生产动作的逐项授权；
- 完成、阻塞、偏差、恢复和返回协议。

每个 Dispatch Packet 必须标记 mutation role：

- `read-only`：Worker 只返回调查、审查、测试观察或建议；可用于任何 workspace strategy；
- `lead-write`：Lead 是该 Ticket 唯一写入者，可在 current 或分配给自己的 worktree 执行；
- `worker-write`：Worker 拥有 Ticket 写入，必须引用 Isolated Workspace Addendum 中唯一的 branch、`workspace_ref` 和 integration owner，不得写入 current workspace。

多个 Worker 需要项目写入时，workspace 决策通常会因 `parallel-write` 触发 worktree，但触发来自写入事实而不是 Lead Team 身份。Worktree 生命周期继续由角色中立的 dev-worktree Skill 管理。

## 2. Dispatch Packet

每个计划 Ticket 都生成一个可独立投递的 Dispatch Packet，至少包含：

1. Ticket ID、目标、可观察完成结果和优先级冲突裁决；
2. `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` 与具体 Ticket；
3. 相关 Spec 合同、ADR/CONTEXT 条目、Wave、Gate 和不可协商约束；
4. 已完成依赖及其 Evidence；
5. 项目 writable/read-only/shared 路径与唯一 shared owner；
6. mutation role、workspace allocation、`base_sha`、workspace/session locator 和 source package hash；
7. 必跑验证、基线、反向验证和明确不适用项；
8. 当前授权、偏差升级、修正上限、Evidence 路径和返回字段。

派单块将不可违反项写为 Hard Constraints，将低影响实现自由写为 Guidance。执行者先核对 checkpoint、项目指令、路径和验证命令，再在 Ticket Evidence 写入不超过 10 行的开工回执。事实不一致时停止受影响路径并升级。

## 3. 候选交付、Evidence 与 Lead 集成

Worker 完成或阻塞时写入 Ticket Evidence，同步状态，并向 Lead 返回 Ticket ID、Evidence、workspace/session locator、最终 checkpoint、commit/PR、未验证项和条件性 Lead E2E。

Lead 接收候选交付时：

1. 读取 Dispatch Packet、Ticket、Evidence、Goal Plan 和代码引用；
2. 检查 checkpoint、附件 hash、路径授权、依赖和敏感信息边界；
3. 按 mutation role 和 workspace allocation 核对交付，在声明基线上复跑定向验证和受影响回归；
4. 仅当 UI 交互受影响时运行最小 E2E；
5. provider 声明、模拟结果和静态推断在独立证据前保持 `unverified`；
6. 验证通过后接受候选交付；存在 `terminal_action=integrate` 的 workspace 时交给其 integration owner 自动本地集成，否则按 current workspace 或 retain 合同继续；
7. 同步 Ticket、Map、Evidence 和 Goal Plan，检查 Gate 是否可关闭。

同一验收项达到修正上限时标记 blocker，记录最后 checkpoint、错误、已通过行为、责任方和恢复条件。

**完成标准**：完整委派附录包含唯一 Lead、完整 Delivery Contract、每 Ticket Dispatch Packet、mutation role 和候选交付验收协议；它不隐式创建 worktree，任何一部分缺失都不得视为 Ready。
