---
id: specdev/goal-plan
type: workflow-entry
workflow: specdev
name: 目标规划
description: 在协调复杂度需要时，将 Ready Spec、Tickets、架构决策与外部约束综合为决策完备的跨 Ticket 计划，并仅在用户选择时加入严格角色委派。
keywords: [目标规划, 编排, DAG, Gate, Wave, Lead, Subagent, checkpoint, 派单, 迁移, 证据]
---

# 目标规划

Goal Plan 只解决单个 Ticket 无法独立决定的事情：跨 Ticket 顺序、并发、共享所有权、里程碑 Gate、集成验证、迁移与发布顺序、偏差升级和恢复。它不是 Ticket 的放大版，也不按固定章节数量衡量质量。

Lead/subagent 是可选的委派分支，不是 Goal Plan 的固有角色。每次运行都先由用户选择普通 Goal Plan 或委派 Goal Plan；普通计划不写 execution model、Lead、Provider、Delivery Contract、Dispatch Packet、Worker、会话 locator 或修正轮次，也不写“未启用”或“不适用”占位。

产物写入 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`。

## 何时运行

满足任一条件时运行：

- 多个 Ticket 可以或需要并行；
- 存在 shared path、共享合同或集中 owner；
- 存在 Deep Ticket、expand-contract、数据迁移、兼容窗口或不可逆步骤；
- 存在多个里程碑、外部审批、发布窗口、参考符合性或高事故半径；
- Ticket DAG 虽不大，但关键路径、汇合点或恢复策略不能仅由 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 安全表达；
- 用户明确要求正式跨 Ticket Plan。

少量、线性、低风险且路径不冲突的 Ready Tickets 可以跳过本 work，直接由 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` 按 Tickets Map 执行。

## 输入

必须读取：

- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- `<Path>{roots.state}/specdev/config.json</Path>`

按存在情况读取：

- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- `<Path>{roots.state}/specdev/adr/</Path>`
- `<Path>{roots.state}/specdev/context/</Path>`
- 用户提供的合同、标准、参考实现、环境限制、发布窗口与批准策略。

Spec 或 Tickets Map 不存在时，返回 `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>` 或 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`，不得在 Goal Plan 中临时补造上游工件。

## 流程

### 1. 验证上游并确认角色分支

加载 `<Path>{roots.workflows}/specdev/P-goal-plan/planning-modes.md</Path>`：

1. 验证 Spec Ready、Ticket Ready、合同覆盖、DAG、路径所有权和 Deep Ticket 完整性；
2. 只读探索会影响调度的代码事实和项目约束；
3. 识别 coordination、migration、high-assurance、reference-conformance 等可组合规划模式；
4. 每次向用户询问选择普通 Goal Plan 或委派 Goal Plan，不按复杂度静默启用角色委派；
5. 用户选择委派时，再在 `native-subagent` 与 `external-web-subagent` 中选择实际交付通道；普通分支不形成或持久化执行模式；
6. 只对无法发现且会改变 Gate、Wave、owner、迁移或批准点的问题继续提问；
7. 不熟悉的外部标准或依赖使用 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`。

任何硬停止问题都必须退回拥有该决策的上游工件，不得用 Goal Plan 覆盖。

### 2. 构建跨 Ticket 核心计划

加载 `<Path>{roots.workflows}/specdev/P-goal-plan/orchestration-protocol.md</Path>`：

1. 从 Ticket frontmatter 构建 DAG 和关键路径；
2. 将 Ready 且项目写路径不相交的 Ticket 分配到 Wave；
3. 为 shared path、共享合同和集中变更指定唯一 owner；
4. 为行为闭环、合同稳定、迁移完成、发布就绪等关键状态定义 Gate；
5. 明确 expand → migrate → contract、Evidence 返回和集成规则；
6. 定义每个 Ticket 的开始条件、执行顺序、验证、Evidence 目标和失败恢复，不复制 Ticket 全文。

**完成标准**：DAG、Wave、Gate 与 Tickets Map 一致；每个计划 Ticket 都有唯一 owner、可验证开始条件、Evidence 目标和恢复路径。

### 3. 按确认加载委派分支

只有用户在本次运行选择委派 Goal Plan 时：

1. 加载 `<Path>{roots.workflows}/specdev/P-goal-plan/delegated-execution.md</Path>`；
2. 以 `operation=plan` 调用 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/SKILL.md</Path>`；
3. 固定唯一 Lead、native/external provider、不可变 checkpoint、可恢复 locator、逐动作授权和修正上限；
4. 生成里程碑 Delivery Contract 与每个 Ticket 的独立 Dispatch Packet；
5. 并行写代码时按需调用 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>`。

普通 Goal Plan 跳过本步骤，不加载上述委派能力，也不在最终产物中留下该分支的标题、字段或占位。

### 4. 定义整体完成、证据与恢复

加载 `<Path>{roots.workflows}/specdev/P-goal-plan/completion-control.md</Path>`：

1. 将整体目标、非目标和权威来源压缩为一个可审查摘要；
2. 定义整体 Definition of Done 和每个 Gate 的关闭证据；
3. 固化跨 Ticket 不可协商约束；
4. 区分不可违反约束与可由实现者调整的建议；
5. 定义实测基线、反向验证、防伪完成、偏差等级、暂停范围、批准人和恢复动作；
6. 定义进度回报、Evidence 汇总、残余风险和回滚要求。

**完成标准**：所有完成声明能映射到实际命令、代码状态、Evidence 或人工批准；没有自报即通过的门禁。

### 5. 写入自适应 Goal Plan

使用 `<Path>{roots.workflows}/specdev/P-goal-plan/goal-plan-template.md</Path>` 写入 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`。

核心模板包含六个职责区，但只保留适用内容：

1. Outcome and Authority；
2. Execution Graph；
3. Gates and Completion Evidence；
4. Execution and Integration Protocol；
5. Constraints, Risk and Recovery；
6. Progress and Decisions。

用户选择委派时，在第 4 节加入 `<Path>{roots.workflows}/specdev/P-goal-plan/delegated-execution-template.md</Path>` 的完整内容；没有选择时不加入任何委派痕迹。Ticket 较多时在 Execution Graph 内增加速查表，不创建独立的第二套状态来源。

### 6. 同步与验证

1. 将 Wave、Gate 和 owner 投影同步到 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`；
2. 对照 `<Path>{roots.workflows}/specdev/common/schemas/goal-plan.schema.json</Path>`；schema 不记录角色分支；
3. 运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage goal-plan \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

4. 更新 `<Path>{roots.state}/specdev/status.json</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`；
5. 原子写入 Goal Plan 和同步投影后重新读取，确认核心 DAG/Wave/Gate/owner/授权一致；存在委派附录时额外确认 Lead、checkpoint、locator、Delivery Contract 与 Dispatch Packet 完整一致；
6. 向用户汇报规划模式、关键路径、Wave、Gate、shared owner、迁移策略、主要风险和 Ready 状态；选择委派时再汇报交付通道与 Lead；
7. 未经用户要求，不自动进入实现。

## 决策完备标准

每份 Goal Plan 必须让实现者无需重新决定：

- 跨 Ticket 先后、并发 Wave 和关键汇合点；
- shared path 与共享合同的 owner；
- Gate 开启、关闭和证据；
- 迁移、兼容、收缩、发布和回滚顺序；
- Evidence 返回、集成、偏差、暂停和批准路径。

委派 Goal Plan 还必须锁定 Agent 派单上下文、execution model、Lead、checkpoint、locator、修正上限和逐动作授权。普通 Goal Plan 不包含这些内容。

Goal Plan 不应重复 Ticket 的局部执行路线、全部文件预测、局部验收 checklist 或 Spec 的完整用户故事。

## 完成标准

- `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` 已写入且只包含适用内容；
- 所有计划内 Ticket Ready，DAG 无环，合同覆盖明确；
- Wave、Gate、owner、集成、偏差和恢复可执行；
- 普通计划没有委派角色、交付合同或空占位；
- 委派计划的 Delivery Contract 与每个 Dispatch Packet 完整可恢复；
- Tickets Map 投影已同步；
- 无未批准高影响假设或硬停止问题；
- `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>` 无 error；
- 用户收到摘要和下一步选择。

## 子文件引用

- 规划模式与输入门禁：`<Path>{roots.workflows}/specdev/P-goal-plan/planning-modes.md</Path>`
- DAG、Wave、Gate 与核心集成：`<Path>{roots.workflows}/specdev/P-goal-plan/orchestration-protocol.md</Path>`
- 委派执行协议：`<Path>{roots.workflows}/specdev/P-goal-plan/delegated-execution.md</Path>`，仅用户选择委派时加载
- 完成、证据、偏差与恢复：`<Path>{roots.workflows}/specdev/P-goal-plan/completion-control.md</Path>`
- Goal Plan 核心模板：`<Path>{roots.workflows}/specdev/P-goal-plan/goal-plan-template.md</Path>`
- 委派附录模板：`<Path>{roots.workflows}/specdev/P-goal-plan/delegated-execution-template.md</Path>`，仅用户选择委派时加载
- Agent 交付合同：`<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/SKILL.md</Path>`，仅用户选择委派时调用
