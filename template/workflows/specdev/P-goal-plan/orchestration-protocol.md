# Goal Plan 核心编排协议

本文件定义所有 Goal Plan 都需要的 DAG、Wave、Gate、路径所有权、Evidence 返回和集成规则。它不建立 Lead/subagent 角色或 Agent 交付合同。

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
- 源码基线和外部合同版本一致。

最大并发从 `<Path>{roots.state}/specdev/config.json</Path>` 读取。并发上限是资源约束，不是必须填满的目标；Wave 也不意味着必须使用多个 Agent。

## 3. Gate

Gate 由可验证状态定义，不用“完成若干 Ticket”作为唯一条件。每个 Gate 必须写明业务或工程状态、开启条件、关闭证据、阻塞范围、owner/批准人和失败恢复。

常见 Gate 包括共享合同稳定、首条垂直路径通过、迁移完成、旧调用点归零、发布就绪和观察期结束。名称按项目语义自定义。

## 4. Shared path 与共享合同

规则遵循 `<Path>{roots.workflows}/specdev/common/rules/path-ownership.md</Path>`：

1. 由专用 owner Ticket 或计划指定的唯一 owner 修改共享路径；
2. 形成可验证稳定基线；
3. 下游消费者在新基线上重新运行 preflight；
4. 才允许扇出或继续后续 Ticket；
5. 共享契约需要变化时暂停消费者并修订上游，不通过多个执行者同时修改解决。

## 5. Expand-contract

标准顺序：

1. **expand**：新旧形式并存，既有调用者继续工作；
2. **migrate**：按可独立验证的影响范围分批迁移；
3. **observe**：扫描旧调用点、旧数据或旧协议使用量；
4. **contract**：收缩条件有证据后删除旧形式；
5. **verify**：运行兼容、数据、回归、监控和回滚检查。

收缩不得仅以“所有迁移 Ticket 已完成”为依据。

## 6. Ticket 执行、Evidence 与集成

每个计划 Ticket 必须写明开始条件、依赖 Evidence、项目路径合同、适用 Gate、必跑验证、Evidence 目标和失败恢复。实际执行仍由 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` 与 Ticket 拥有，不在 Goal Plan 复制局部施工步骤。

每个实现者完成或阻塞时：

1. 写入 `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`；
2. 同步 Ticket、Tickets Map、Goal Plan 和 change 状态；
3. 检查依赖、路径所有权、合同覆盖和适用 Gate；
4. 返回 Ticket 状态、Evidence 路径、代码引用、未验证项和恢复条件。

最后一个计划内 Implement 按 `<Path>{roots.workflows}/specdev/P-goal-plan/completion-control.md</Path>` 汇总核心计划的 Gate 和 Evidence。委派分支的候选交付与 Lead 集成由独立委派协议拥有，不写入本文件。

**完成标准**：每个执行结果可追溯到代码状态和 Evidence；普通 Goal Plan 可以在不建立角色交付合同的情况下完整恢复和完成。
