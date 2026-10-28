# 目标规划


Goal Plan 只拥有单个 Ticket 无法独立决定的事情：整体 Outcome、跨 Ticket 顺序与并发、共享所有权、里程碑 Gate、动态派单边界、父分支集成、迁移/发布顺序、偏差升级和恢复。Ticket 继续拥有局部实现合同。

每次 Goal Plan 使用 lead-directed 表示唯一状态和验收 owner；实现团队按要求决定。按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 分别确定票据调度、Agent 编排和 change 工作区；复用已有选择，不修改全局配置。

产物写入 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`。


## 简单无票 Goal

用户要求 Goal，且单 change 无需独立 Ticket 或持续协调时，使用 <Path>{roots.workflows}/specdev/specdev-p-goal-plan/assets/lightweight-goal-plan-template.md</Path>：frontmatter 为 `artifact: lightweight-goal-plan`、`change`、`lead`，正文 `## Tasks`、`## Integration and Verification`、`## Next Steps`。普通只读工具并行或短时无状态任务不改变此选择；Deep 风险仍需适用的完整验收合同。README 保留 scope/acceptance/verification 的规格/验收，任务进度唯一在 Goal 清单。此分支不创建 Ticket/Map/Implementation，也不调用 analyzeMap；完整 Goal 不能因字段缺失自动降级。实际工作和完成仍走原 I/完成门。

下面的 Ticket 输入与完整 schema 只适用于有票的完整模式。

## 何时运行

满足任一条件时运行：

- 跨 Ticket 工作需要持续协调或跨会话恢复；
- 存在 shared path、共享合同或集中 owner；
- Deep 风险、expand-contract、迁移、兼容窗口或不可逆步骤需要跨 Ticket 的阶段控制；
- 多个 Gate、外部审批或发布窗口需要持续协调；
- Ticket DAG 的关键路径、汇合点或恢复策略无法由 Tickets Map 安全表达；
- 用户明确要求正式跨 Ticket Plan。

少量线性或短时独立的 Ready Tickets 可直接进入 I，不要求最小 Goal Plan；workspace、Lead、验证和原授权引用由 I 写原 Evidence。并行可能性本身不触发完整 Goal。完整获批 Direct Spec 也可以直接执行并独立选择 worktree；需要独立调度或逐票追踪才运行 T-tickets。高风险要求相应 Gate，不以增加工件数量代替风险控制。

## 输入

必须读取：

- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`：先枚举 Ticket 入口的 frontmatter、依赖和状态，按 DAG、路径和风险定位需要完整读取的 Ticket。
- 实际执行策略来源；存在真实 config 时只读相关限制

按存在情况读取：

- 当前 change 架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- 当前 change 领域上下文：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- 当前 change 设计日志：`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- 当前 change 诊断：`<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`
- 永久架构决策：`<Path>{roots.state}/specdev/adr/</Path>`
- 永久领域上下文：`<Path>{roots.state}/specdev/context/</Path>`
- 用户提供的合同、标准、参考实现、环境限制、发布窗口和批准策略。

非当前分支的 ADR、CONTEXT、LOG、Diagnosis、Evidence、研究资料和永久目录先通过索引、状态和关键词定位；只有被当前 Gate、依赖、冲突或恢复条件命中的条目才回读原文。Tickets Map、当前计划和决定 DAG 的 Ticket frontmatter 是权威编排输入，仍需完整读取。

永久目录可以为空，静默继续。缺少 Spec 或 Tickets Map 时返回 `<Path>{roots.workflows}/specdev/specdev-s-spec/SKILL.md</Path>` 或 `<Path>{roots.workflows}/specdev/specdev-t-tickets/SKILL.md</Path>`；当前 ADR/CONTEXT 缺失且规划依赖对应决定时返回 `<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/SKILL.md</Path>`，不在 Goal Plan 中补造上游权威。

## 流程

### 1. 验证上游与执行边界

加载 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/planning-modes.md</Path>`：

1. 验证 Spec、Tickets、合同覆盖、DAG、路径所有权和待执行 Deep Ticket 完整性；未来 draft 票按规划输入门记录局部缺口；
2. 只读探索影响调度的代码与项目事实；
3. 识别 migration、high-assurance、reference-conformance、release-coordination 等适用模式；
4. 在 Execution Policy Source 记录 ticket_execution、可选 max_parallel_tickets 及验证尝试上限；显式实现者限制独立核对，不把人数换成票数；
5. 核对本次实现与工作区创建的实际授权；commit/merge 仅在明确交付要求下另行核对，不作为默认每票执行门；
6. 只询问无法发现且会改变 Gate、Wave、owner、迁移、批准或验收的问题。

**完成标准**：计划内 Ticket、范围、覆盖、DAG 与所有权完整；未来 draft 票已记录真实缺口、生产者证据和 DoR 重审条件；Lead、授权状态、票据策略、明确存在的实现者限制和工作区选择可判定。缺执行授权时可交付规划，但 `ready_for_execution` 保持 `false`。

### 2. 构建 Outcome、DAG、Wave 与 Gate

加载 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/orchestration-protocol.md</Path>`：

1. 压缩 Outcome、成功/伪完成、非目标和权威来源；
2. 从 Ticket frontmatter 构建 DAG、关键路径、扇出与汇合点；
3. 为 shared path、共享合同和集中修改指定唯一 owner；
4. 将依赖满足、路径与语义资源无冲突的票分入候选 Wave，按 serial/auto/parallel 和票据上限实际推进；
5. 为合同稳定、垂直路径、迁移完成、发布就绪等状态定义 Gate；
6. 为每个 Ticket 记录开始条件、workspace 策略、验证层级、Evidence 目标、集成顺序和失败恢复。

**完成标准**：DAG、Wave、Gate 与 Tickets Map 一致；每个 Ticket 有明确写集 owner、change 工作区引用和可验证出口。

### 3. 固定 Lead 编排与动态派单合同

加载 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/lead-orchestration.md</Path>`，并按规划阶段读取 `<Path>{roots.references}/coordination/task-brief.md</Path>`：

1. 固定 Lead 的可恢复 owner/session locator；
2. 按 `Execution Policy Source` 声明票据策略、验证尝试上限和明确存在的票据/实现者上限，核对实际 config/平台限制，Lead 实际参与实现时计入人数；
3. 不为只读 review/research/test-observation agent 写 SpecDev 数字上限；
4. 所有执行者复用 change 选定工作区并细分写集；正式状态/Evidence 仍由 Lead 写入；
5. 定义执行期动态 Dispatch Packet、候选返回和 Lead 验收；
6. provider、模型和具体派单在 Ticket 开始时按事实选择，不在 Goal Plan 中预分配。

**完成标准**：Lead 可以在恢复后重建派单边界；任何 任务执行者 都不能成为第二个 SpecDev 状态写入者或父分支 integration owner。

### 4. 定义完成、证据与恢复

加载 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/completion-control.md</Path>`：

1. 定义整体 Definition of Done 和每个 Gate 的关闭证据；
2. 固化不可协商约束与允许的局部实现自由；
3. 每票在选定 change-workspace 冻结实际输入并完成本票检查，Lead 核验整体 Gate；
4. E2E 按 Ticket 实际跨边界风险标记 required 或 not-required；
5. 定义共享资源冲突、检查失败、快照漂移、偏差、暂停和恢复；
6. 定义 change 完成、远程 reconcile、残余风险和回滚要求。

**完成标准**：每个完成声明映射到固定 commit 或工作副本快照、命令、Evidence 或人工批准。

### 5. 写入、导航与验证

使用 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/assets/goal-plan-template.md</Path>` 写入 Goal Plan：

1. 只保留适用 planning modes，不创建条件性 topology addendum；
2. Tickets Map 只增加原 Goal 的 Wave/Gate 导航，执行 owner 与进度仍从 Ticket/Evidence 回读；
3. 对照 `<Path>{roots.workflows}/specdev/common/schemas/goal-plan.schema.json</Path>`；
4. 运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage goal-plan \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

5. 写回 Goal Plan 的 Gate/执行事实与 Map 导航，README 只保留目标/接续并重新读取；
6. 向用户报告 Outcome、关键路径、Wave/Gate、Lead、票据调度与已明确的实现者限制、shared owner、E2E disposition、迁移与主要风险；
7. 未经用户要求，不自动进入实现。

## 决策完备标准

每份 Goal Plan 必须让 Lead 无需重新决定：

- Outcome、权威来源和整体完成；
- 跨 Ticket 先后、Wave、Gate 和关键汇合点；
- shared path 与共享合同 owner；
- 实现执行者 上限及动态派单边界；
- change 唯一工作区、每票固定输入和验证出口，以及明确承诺的 Git 交付；
- E2E disposition、偏差、暂停、批准和恢复路径。

Goal Plan 不复制 Ticket 的局部施工路线、全部文件预测或逐项验收清单。

## 完成标准

- Goal Plan schema v8 且 `ready_for_execution` 与状态一致；
- 规划完成与执行就绪分别报告；允许交付 `draft / ready_for_execution: false`，单 change 不创建父 Implementation Map/Plan；
- 等待上游产物的未来票保持 draft，局部缺口只阻塞依赖闭包；进入执行的票必须重新通过 DoR，上游完成不自动提升 Ready；
- Lead 唯一，Execution Policy Source 可回读，实际存在的 config/平台限制已核对，Lead 实际参与实现时计入；review/research agent 不受 SpecDev 数字限制；
- 每张票有真实工作区引用、checkpoint/快照、验证和 Evidence 出口；
- current/worktree 均可串行或并行票据；所有执行者复用 change 工作区，E2E 由 Lead 在稳定输入上执行；
- 计划只保留当前固定 Lead 与选定 workspace/integration 合同；
- validator 无 error，Tickets Map 导航与合同覆盖正确，用户收到下一步选择。

## 子文件引用

- 规划模式与输入门禁：`<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/planning-modes.md</Path>`
- DAG、Wave、Gate 与集成队列：`<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/orchestration-protocol.md</Path>`
- Lead 与动态派单：`<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/lead-orchestration.md</Path>`
- 完成、证据与恢复：`<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/completion-control.md</Path>`
- Goal Plan 模板：`<Path>{roots.workflows}/specdev/specdev-p-goal-plan/assets/goal-plan-template.md</Path>`
- Agent 交付合同：`<Path>{roots.references}/coordination/task-brief.md</Path>`
