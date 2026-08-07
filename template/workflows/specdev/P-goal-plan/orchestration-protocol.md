# Goal Plan 编排协议

本文件定义 DAG、Wave、Gate、路径所有权、Delivery Contract、Dispatch Packet、Evidence 返回和集成规则。

## 1. DAG 与关键路径

- 依赖权威来自 `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>` frontmatter 的 `blocked_by`；
- `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 是投影，不是第二套依赖真相；
- 计算根节点、扇出、汇合点、关键路径、共享合同 owner 和最终收缩点；
- 依赖只表示真实开始条件，不表示偏好、人员交接或“最好先做”；
- 无法独立保持可验证状态的迁移批次必须有隔离集成策略和最终集成 Gate。

## 2. Wave

Wave 内 Ticket 必须同时满足：

- `ready: true`；
- 所有依赖已完成并有 Evidence；
- 项目写路径不相交；
- shared path 已由 owner 稳定；
- 适用 Gate 已打开；
- 基线和外部合同版本一致。

最大并发从 `<Path>{roots.state}/specdev/config.json</Path>` 读取。并发上限是资源约束，不是强制填满的目标。

## 3. Gate

Gate 由可验证状态定义，不用“完成若干 Ticket”作为唯一条件。每个 Gate 必须写明：

- 业务或工程状态；
- 开启条件；
- 关闭证据；
- 阻塞范围；
- owner 与批准人；
- 失败时恢复动作。

常见 Gate 包括共享合同稳定、首条垂直路径通过、迁移完成、旧调用点归零、发布就绪和观察期结束。名称按项目语义自定义。

## 4. Shared path 与共享合同

规则遵循 `<Path>{roots.workflows}/specdev/common/rules/path-ownership.md</Path>`：

1. 由专用 owner Ticket 或 Lead 修改共享路径；
2. 形成可验证稳定基线；
3. 下游消费者在新基线上重新运行 preflight；
4. 才允许扇出并行；
5. 共享契约需要变化时暂停消费者并修订上游，不通过多个 Agent 同时修改解决。

## 5. Expand-contract

标准顺序：

1. **expand**：新旧形式并存，既有调用者继续工作；
2. **migrate**：按可独立验证的影响范围分批迁移；
3. **observe**：扫描旧调用点、旧数据或旧协议使用量；
4. **contract**：收缩条件有证据后删除旧形式；
5. **verify**：运行兼容、数据、回归、监控和回滚检查。

收缩不得仅以“所有迁移 Ticket 已完成”为依据。

## 6. Lead 与 Delivery Contract

Lead 负责源码基线、DAG、Wave、shared owner、Gate、权限、Evidence 汇总和集成；已派发 Ticket 的实现由对应执行者负责，Lead 不制造双重 owner。

Goal Plan 选择唯一 execution model：`direct`、`native-subagent` 或 `external-web-subagent`。Lead 以 `operation=plan` 调用 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/SKILL.md</Path>`，生成里程碑级 Delivery Contract；Implement 阶段以 `operation=execute` 调用同一 Skill 做恢复和验收。

Delivery Contract 必须固定：

- execution model、Lead、provider 和可恢复 workspace/session locator；
- repository、branch、不可变 checkpoint 与源码交付方式；
- 最大并发和默认 3 轮的 `max_correction_rounds`；
- 标准轴、规范轴、Lead 独立验证和条件性 E2E；
- local changes、commit、push、PR、merge、deploy、migration 和生产动作的逐项授权；
- 完成、阻塞、偏差、恢复和返回协议。

并行写代码且配置允许时，Lead 为每个 Ticket 调用 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>`。所有并行 Ticket 固定同一 `base_sha`，每个 Ticket 使用独立分支和 `workspace_ref`；Lead 创建、恢复、集成和清理，Worker 只推进到 `review`。只读调查和顺序执行不为形式创建 worktree。

**完成标准**：整个 Goal Plan 只有一个 execution model 和 Lead；每个高影响动作都有明确授权状态。

## 7. Dispatch Packet

每个计划 Ticket 都生成一个可独立投递的 Dispatch Packet。它不是 Ticket 副本，而是进入权威工件和当前基线的紧凑入口，至少包含：

1. Ticket ID、目标、可观察完成结果和优先级冲突裁决；
2. `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`；
3. 相关 Spec 合同、ADR/CONTEXT 条目、Wave、Gate 和不可协商约束；
4. 已完成依赖及其 `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`；
5. 项目 `writable_paths`、`read_only_paths`、`shared_paths` 与唯一 shared owner；
6. `base_sha`、branch、workspace/session locator 和 source package hash；
7. 必跑验证、基线指标、可静默失效门禁的反向验证，以及明确不适用项；
8. 当前授权、偏差升级、修正上限、Evidence 路径和返回字段。

派单块将不可违反项写为 Hard Constraints，将低影响实现自由写为 Guidance。执行者必须先核对 checkpoint、项目指令、路径和验证命令，再在 Ticket Evidence 记录不超过 10 行的开工回执：目标、执行顺序、最大风险和发现的基线差异。事实不一致时停止受影响路径并升级，不用更详细文字掩盖失效前提。

Agent 的最小读取顺序为 Implement work、当前 Ticket、Goal Plan 中适用的 Delivery Contract/Dispatch Packet、相关 Spec/ADR/CONTEXT、项目 Agent 指令和当前代码事实。不投递完整历史对话、全部 Ticket 或无关研究。

**完成标准**：每个 Dispatch Packet 可在新上下文中定位全部权威输入、边界、基线、验证、恢复点和返回目标。

## 8. Evidence 返回与集成

Agent 完成或阻塞时：

1. 写入 `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`，包含实际修改、命令与退出状态、验收映射、反向验证、修正轮次、checkpoint 和未验证项；
2. 同步 Ticket、Tickets Map、Goal Plan 和 change 状态；
3. 向 Lead 返回 Ticket ID 与状态、Evidence 完整路径、workspace/session locator、最终 checkpoint、commit/PR 引用和条件性 Lead E2E。

Lead 接收原生或外部候选交付时：

1. 读取 Dispatch Packet、Ticket、Evidence、Goal Plan 和对应代码引用；
2. 检查 checkpoint、附件 hash、路径授权、依赖和敏感信息边界；
3. 在隔离基线上应用交付，复跑定向验证和受影响回归；
4. 仅当用户界面交互受影响时，由 Lead 运行最小 E2E；
5. 将 provider 声明、模拟结果和静态推断保持为 `unverified`，直到有独立证据；
6. 验证通过后集成，并按 dev-worktree Skill 更新或清理 worktree；
7. 同步 Ticket、Map、Evidence 和 Goal Plan，检查 Gate 是否可关闭。

同一验收项达到修正上限时标记 blocker，记录最后 checkpoint、错误、已通过行为、责任方和恢复条件。逻辑冲突返回契约 owner 解决，不机械选择某一侧版本。

**完成标准**：每个完成声明可追溯到 Lead 核对的代码状态和 Evidence；失败也具有可恢复的最后可信 checkpoint。
