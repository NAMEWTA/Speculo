# Goal Plan 编排协议

本文件定义 DAG、Wave、Gate、路径所有权、Lead/Subagent、worktree、Evidence 返回和集成规则。

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

## 6. Lead/Subagent

Lead 负责基线、DAG、Wave、shared owner、Gate、Evidence 汇总和集成；不抢做已派发 Ticket 的实现。

并行写代码且配置允许时，Lead 为每个 Ticket 调用 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>`：

- 所有并行 Ticket 固定同一 `base_sha`，每个 Ticket 使用独立分支和 `workspace_ref`；
- Lead 创建、恢复、集成和清理；Worker 只把状态推进到 `review`；
- 只读调查和顺序执行不为形式创建 worktree。

每个 Agent 的最小读取顺序：

1. `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>`；
2. `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`；
3. `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` 中适用的 Wave、Gate 和硬约束；
4. `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` 中相关合同；
5. `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 和 `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` 中相关条目；
6. 项目级 Agent 指令和当前代码事实。

不把完整历史对话、全部 Ticket 或无关研究塞入 Agent 上下文。

## 7. 派单载荷

派单必须包含：

- Ticket ID 与 `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`；
- 基线 SHA、分支和 `workspace_ref`；
- 项目写、只读和 shared 路径；
- 已完成依赖及其 Evidence；
- 合同 ID；
- 适用 Wave、Gate 和跨 Ticket 约束；
- 必须执行的验证矩阵；
- 偏差升级方式和禁止修改事项。

## 8. Evidence 返回与集成

Agent 完成或阻塞时：

1. 写入 `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`；
2. 同步 Ticket、Tickets Map、Goal Plan 和 change 状态；
3. 向 Lead 返回 Ticket ID 与状态、Evidence 完整路径、`workspace_ref`、commit 或 PR 引用，以及仅在用户界面交互受影响时由 Lead 执行的待办 E2E。

Lead 集成时：

1. 读取 Ticket、Evidence、Goal Plan 和对应代码引用；
2. 检查路径授权；
3. 复跑定向验证；
4. 合并或应用变更；
5. 运行受影响回归；
6. 仅当用户界面交互受影响时，由 Lead 运行最小 E2E；
7. 按 dev-worktree Skill 更新或清理 worktree；
8. 同步 Ticket、Map、Evidence 和 Goal Plan；
9. 检查 Gate 是否可关闭。

逻辑冲突返回契约和 owner 解决，不机械选择某一侧版本。
