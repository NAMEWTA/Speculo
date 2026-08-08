# Goal Plan 委派执行协议

只有用户在本次 P-goal-plan 运行中选择委派 Goal Plan 时加载。该分支同时启用唯一 Lead 与 native/external subagent；不支持 Lead-only，也不把本协议用于普通 Goal Plan。

## 1. Lead 与 Delivery Contract

Lead 负责源码基线、DAG、Wave、shared owner、Gate、权限、Evidence 汇总和集成；已派发 Ticket 的实现由对应执行者负责，Lead 不制造双重 owner。

委派分支选择唯一 execution model：`native-subagent` 或 `external-web-subagent`。Lead 以 `operation=plan` 调用 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/SKILL.md</Path>` 生成里程碑 Delivery Contract；Implement 阶段以 `operation=execute` 调用同一 Skill 做恢复和验收。

Delivery Contract 必须固定：

- execution model、Lead、provider 和可恢复 workspace/session locator；
- repository、branch、不可变 checkpoint 与源码交付方式；
- 最大并发和默认 3 轮的 `max_correction_rounds`；
- 标准轴、规范轴、Lead 独立验证和条件性 E2E；
- local changes、commit、push、PR、merge、deploy、migration 和生产动作的逐项授权；
- 完成、阻塞、偏差、恢复和返回协议。

并行写代码且配置允许时，Lead 为每个 Ticket 调用 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>`。所有并行 Ticket 固定同一 `base_sha`，每个 Ticket 使用独立分支和 `workspace_ref`；Lead 创建、恢复、集成和清理，Worker 只推进到 `review`。

## 2. Dispatch Packet

每个计划 Ticket 都生成一个可独立投递的 Dispatch Packet，至少包含：

1. Ticket ID、目标、可观察完成结果和优先级冲突裁决；
2. `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` 与具体 Ticket；
3. 相关 Spec 合同、ADR/CONTEXT 条目、Wave、Gate 和不可协商约束；
4. 已完成依赖及其 Evidence；
5. 项目 writable/read-only/shared 路径与唯一 shared owner；
6. `base_sha`、branch、workspace/session locator 和 source package hash；
7. 必跑验证、基线、反向验证和明确不适用项；
8. 当前授权、偏差升级、修正上限、Evidence 路径和返回字段。

派单块将不可违反项写为 Hard Constraints，将低影响实现自由写为 Guidance。执行者先核对 checkpoint、项目指令、路径和验证命令，再在 Ticket Evidence 写入不超过 10 行的开工回执。事实不一致时停止受影响路径并升级。

## 3. 候选交付、Evidence 与 Lead 集成

Worker 完成或阻塞时写入 Ticket Evidence，同步状态，并向 Lead 返回 Ticket ID、Evidence、workspace/session locator、最终 checkpoint、commit/PR、未验证项和条件性 Lead E2E。

Lead 接收候选交付时：

1. 读取 Dispatch Packet、Ticket、Evidence、Goal Plan 和代码引用；
2. 检查 checkpoint、附件 hash、路径授权、依赖和敏感信息边界；
3. 在隔离基线上应用交付并复跑定向验证和受影响回归；
4. 仅当 UI 交互受影响时运行最小 E2E；
5. provider 声明、模拟结果和静态推断在独立证据前保持 `unverified`；
6. 验证通过后集成，并按 dev-worktree Skill 更新或清理 worktree；
7. 同步 Ticket、Map、Evidence 和 Goal Plan，检查 Gate 是否可关闭。

同一验收项达到修正上限时标记 blocker，记录最后 checkpoint、错误、已通过行为、责任方和恢复条件。

**完成标准**：完整委派附录包含唯一 Lead、完整 Delivery Contract、每 Ticket Dispatch Packet 和候选交付验收协议；任何一部分缺失都不得视为 Ready。
