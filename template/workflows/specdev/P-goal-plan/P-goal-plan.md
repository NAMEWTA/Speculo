---
id: specdev/goal-plan
type: workflow-entry
workflow: specdev
name: 目标规划
description: 在跨 Ticket 协调复杂度需要时，以固定 Lead、动态派单、DAG/Gate 和候选合并门禁生成决策完备且可恢复的执行计划。
keywords: [目标规划, Lead, Subagent, DAG, Gate, Wave, worktree, candidate-merge, 证据]
---

# 目标规划

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

Goal Plan 只拥有单个 Ticket 无法独立决定的事情：整体 Outcome、跨 Ticket 顺序与并发、共享所有权、里程碑 Gate、动态派单边界、父分支集成、迁移/发布顺序、偏差升级和恢复。Ticket 继续拥有局部实现合同。

每次 Goal Plan 都采用 `lead-directed`：当前主会话是唯一 Lead，负责计划、SpecDev 状态、Evidence、派单、验收、父分支推进和最终回复。形成 Goal Plan 时必须询问是否开启 worktree 开发，默认不开启；选择写入当前 Goal Plan，不修改全局配置。不开启时 Ticket 严格串行，允许动态派遣 implementation subagent，但同一时间只有一个 implementation owner 可写当前 workspace；开启时沿用每 Ticket 独立 worktree 与 candidate-merge。

产物写入 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`。

## 何时运行

满足任一条件时运行：

- 多个 Ticket 可以或需要并行；
- 存在 shared path、共享合同或集中 owner；
- 存在 Deep Ticket、expand-contract、迁移、兼容窗口或不可逆步骤；
- 存在多个 Gate、外部审批、发布窗口或高事故半径；
- Ticket DAG 的关键路径、汇合点或恢复策略无法由 Tickets Map 安全表达；
- 用户明确要求正式跨 Ticket Plan。

少量、线性、低风险的 Ready Tickets 可以跳过本 work，由 I-implement 按当前 Goal Plan 的 workspace 策略执行。没有 Ticket 的获批小型 Direct Spec 不受 Ticket workspace 合同约束；一旦需要切片，先运行 T-tickets。

## 输入

必须读取：

- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- `<Path>{roots.state}/specdev/config.json</Path>`

按存在情况读取：

- 当前 change 架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- 当前 change 领域上下文：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- 当前 change 设计日志：`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- 当前 change 诊断：`<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`
- 永久架构决策：`<Path>{roots.state}/specdev/adr/</Path>`
- 永久领域上下文：`<Path>{roots.state}/specdev/context/</Path>`
- 用户提供的合同、标准、参考实现、环境限制、发布窗口和批准策略。

永久目录可以为空，静默继续。缺少 Spec 或 Tickets Map 时返回 `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>` 或 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`；当前 ADR/CONTEXT 缺失且规划依赖对应决定时返回 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`，不在 Goal Plan 中补造上游权威。

## 流程

### 1. 验证上游与执行边界

加载 `<Path>{roots.workflows}/specdev/P-goal-plan/planning-modes.md</Path>`：

1. 验证 Spec、Tickets、合同覆盖、DAG、路径所有权和 Deep Ticket 完整性；
2. 只读探索影响调度的代码与项目事实；
3. 识别 migration、high-assurance、reference-conformance、release-coordination 等适用模式；
4. 从 config 读取 `max_implementation_agents` 与 `max_integration_attempts`，将实际值快照到 `implementation_agent_limit` 与 `integration_attempt_limit`；本计划可以降低但不得超过 config 或平台能力，Lead 不计入；
5. 根据 workspace 策略确认实现 commit 与 direct-parent/candidate integration 已获授权；缺一项则计划保持 blocked；
6. 只询问无法发现且会改变 Gate、Wave、owner、迁移、批准或验收的问题。

**完成标准**：所有计划内 Ticket Ready；Lead、授权、实现并发上限和父分支可判定；没有用 Goal Plan 掩盖上游缺口。

### 2. 构建 Outcome、DAG、Wave 与 Gate

加载 `<Path>{roots.workflows}/specdev/P-goal-plan/orchestration-protocol.md</Path>`：

1. 压缩 Outcome、成功/伪完成、非目标和权威来源；
2. 从 Ticket frontmatter 构建 DAG、关键路径、扇出与汇合点；
3. 为 shared path、共享合同和集中修改指定唯一 owner；
4. 将依赖满足且项目写路径不相交的 Ticket 分入 Wave；current 模式仍按依赖顺序串行执行，不得把 Wave 当作并发授权；
5. 为合同稳定、垂直路径、迁移完成、发布就绪等状态定义 Gate；
6. 为每个 Ticket 记录开始条件、workspace 策略、验证层级、Evidence 目标、集成顺序和失败恢复。

**完成标准**：DAG、Wave、Gate 与 Tickets Map 一致；每个 Ticket 有唯一项目写 owner、worktree 合同和可验证集成出口。

### 3. 固定 Lead 编排与动态派单合同

加载 `<Path>{roots.workflows}/specdev/P-goal-plan/lead-orchestration.md</Path>`，并以 `operation=plan` 调用 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/SKILL.md</Path>`：

1. 固定 Lead 的可恢复 owner/session locator；
2. 声明 implementation subagent 的 config/平台约束上限，Lead 不计入；
3. 不为只读 review/research/test-observation agent 写 SpecDev 数字上限；
4. current 模式固定只有一个 implementation writer 写项目路径，Lead 仍是唯一 SpecDev 工件与状态写入者；required 模式 implementation owner 写自己的 Ticket worktree；
5. 定义执行期动态 Dispatch Packet、候选返回和 Lead 验收；
6. provider、模型和具体派单在 Ticket 开始时按事实选择，不在 Goal Plan 中预分配。

**完成标准**：Lead 可以在恢复后重建派单边界；任何 subagent 都不能成为第二个 SpecDev 状态写入者或父分支 integration owner。

### 4. 定义完成、证据与恢复

加载 `<Path>{roots.workflows}/specdev/P-goal-plan/completion-control.md</Path>`：

1. 定义整体 Definition of Done 和每个 Gate 的关闭证据；
2. 固化不可协商约束与允许的局部实现自由；
3. 按 workspace 策略为每个 Ticket 明确 current-workspace/direct-parent 检查或 source-worktree/parent-candidate 检查；
4. E2E 按 Ticket 实际跨边界风险标记 required 或 not-required；
5. 定义 direct-parent 验证失败、candidate 冲突/失败、父 HEAD 漂移、偏差、暂停、批准和恢复动作；
6. 定义 change 完成、远程 reconcile、残余风险和回滚要求。

**完成标准**：每个完成声明映射到不可变 commit、候选/父分支 SHA、命令、Evidence 或人工批准。

### 5. 写入、同步与验证

使用 `<Path>{roots.workflows}/specdev/P-goal-plan/goal-plan-template.md</Path>` 写入 Goal Plan：

1. 只保留适用 planning modes，不创建条件性 topology addendum；
2. 将 Wave、Gate 和 owner 投影同步到 Tickets Map；
3. 对照 `<Path>{roots.workflows}/specdev/common/schemas/goal-plan.schema.json</Path>`；
4. 运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage goal-plan \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

5. 原子更新 Goal Plan、Tickets Map、全局/current change 状态并重新读取；
6. 向用户报告 Outcome、关键路径、Wave/Gate、Lead、实现 agent 上限、shared owner、E2E disposition、迁移与主要风险；
7. 未经用户要求，不自动进入实现。

## 决策完备标准

每份 Goal Plan 必须让 Lead 无需重新决定：

- Outcome、权威来源和整体完成；
- 跨 Ticket 先后、Wave、Gate 和关键汇合点；
- shared path 与共享合同 owner；
- implementation subagent 上限及动态派单边界；
- 每 Ticket workspace、implementation commit、对应验证和父分支推进规则；
- E2E disposition、偏差、暂停、批准和恢复路径。

Goal Plan 不复制 Ticket 的局部施工路线、全部文件预测或逐项验收清单。

## 完成标准

- Goal Plan schema v6 且 `ready_for_execution` 与状态一致；
- Lead 唯一，implementation subagent 上限来自 config/平台能力，review/research agent 不受 SpecDev 数字限制；
- 每个实现 Ticket 都有 workspace、commit、对应 integration gate 和 Evidence 出口；
- current 模式不创建 source/candidate worktree，适用 E2E 由 Lead 在 current workspace 运行；required 模式保持 source/parent-candidate 边界；
- 计划只保留当前固定 Lead 与选定 workspace/integration 合同；
- validator 无 error，Tickets Map 投影同步，用户收到下一步选择。

## 子文件引用

- 规划模式与输入门禁：`<Path>{roots.workflows}/specdev/P-goal-plan/planning-modes.md</Path>`
- DAG、Wave、Gate 与集成队列：`<Path>{roots.workflows}/specdev/P-goal-plan/orchestration-protocol.md</Path>`
- Lead 与动态派单：`<Path>{roots.workflows}/specdev/P-goal-plan/lead-orchestration.md</Path>`
- 完成、证据与恢复：`<Path>{roots.workflows}/specdev/P-goal-plan/completion-control.md</Path>`
- Goal Plan 模板：`<Path>{roots.workflows}/specdev/P-goal-plan/goal-plan-template.md</Path>`
- Agent 交付合同：`<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/SKILL.md</Path>`
