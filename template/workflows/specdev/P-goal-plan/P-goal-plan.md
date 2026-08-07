---
id: specdev/goal-plan
type: workflow-entry
workflow: specdev
name: 目标规划
description: 在协调复杂度需要时，将 Ready Spec、Tickets、架构决策与外部约束综合为决策完备的跨 Ticket 编排计划。
keywords: [目标规划, 编排, DAG, Gate, Wave, Lead, Subagent, checkpoint, 派单, 迁移, 证据]
---

# 目标规划

Goal Plan 只解决单个 Ticket 无法独立决定的事情：跨 Ticket 顺序、并发、共享所有权、里程碑 Gate、Agent 交付、集成验证、迁移与发布顺序、偏差升级和恢复。它不是 Ticket 的放大版，也不按固定章节数量衡量质量；每个 Ticket 的独立 Dispatch Packet 是 Goal Plan 的执行入口，不是第二份 Ticket。

产物写入 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`。

## 何时运行

满足任一条件时运行：

- 多个 Ticket 可以或需要并行；
- 存在 shared path、共享合同、集中 owner 或 Lead/Subagent；
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

### 1. 验证上游与选择规划模式

加载 `<Path>{roots.workflows}/specdev/P-goal-plan/planning-modes.md</Path>`：

1. 验证 Spec Ready、Ticket Ready、合同覆盖、DAG、路径所有权和 Deep Ticket 完整性；
2. 只读探索会影响调度的代码事实和项目约束；
3. 识别 coordination、migration、high-assurance、reference-conformance 等可组合规划模式；
4. 在 `direct`、`native-subagent`、`external-web-subagent` 中选择唯一 execution model，并固定 Lead、源码 checkpoint、上下文交付和逐动作授权；
5. 只对无法发现且会改变 Gate、Wave、owner、执行模型、迁移或批准点的问题向用户提问；
6. 不熟悉的外部标准或依赖使用 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`。

任何硬停止问题都必须退回拥有该决策的上游工件，不得用 Goal Plan 覆盖。

### 2. 构建跨 Ticket 执行模型

加载 `<Path>{roots.workflows}/specdev/P-goal-plan/orchestration-protocol.md</Path>`：

1. 从 Ticket frontmatter 构建 DAG 和关键路径；
2. 将 Ready 且项目写路径不相交的 Ticket 分配到 Wave；
3. 为 shared path、共享合同和集中变更指定唯一 owner；
4. 为行为闭环、合同稳定、迁移完成、发布就绪等关键状态定义 Gate；
5. 明确 expand → migrate → contract、Evidence 返回和集成规则；并行写代码时使用 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>`；
6. 以 `operation=plan` 调用 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/SKILL.md</Path>`，生成里程碑 Delivery Contract 和每个 Ticket 可独立投递的 Dispatch Packet；
7. 派单块只携带实现所需的权威引用、边界、基线、验证、恢复和返回字段，不复制完整历史对话或 Ticket 全文。

**完成标准**：DAG、Wave、Gate 与 Tickets Map 一致；每个计划 Ticket 都有唯一 owner、基线和可恢复派单块。

### 3. 定义整体完成、证据与恢复

加载 `<Path>{roots.workflows}/specdev/P-goal-plan/completion-control.md</Path>`：

1. 将整体目标、非目标和权威来源压缩为一个可审查摘要；
2. 定义整体 Definition of Done 和每个 Gate 的关闭证据；
3. 固化跨 Ticket 不可协商约束；
4. 区分不可违反约束与可由实现者调整的建议；
5. 定义实测基线、反向验证、防伪完成、偏差等级、修正上限、暂停范围、批准人和恢复动作；
6. 定义进度回报、Evidence 汇总、残余风险和回滚要求。

**完成标准**：所有完成声明能映射到实际命令、代码状态、Evidence 或人工批准；没有 provider 自报即通过的门禁。

### 4. 写入自适应 Goal Plan

使用 `<Path>{roots.workflows}/specdev/P-goal-plan/goal-plan-template.md</Path>` 写入 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`。

模板包含六个职责区，但只保留适用内容：

1. Outcome and Authority；
2. Execution Graph；
3. Gates and Completion Evidence；
4. Execution and Integration Protocol；
5. Constraints, Risk and Recovery；
6. Progress and Decisions。

Ticket 较多时在 Execution Graph 内增加速查表；不创建独立的第二套状态来源。

Goal Plan 不受单次 `/goal` 字符上限约束。需要粘贴到外部 Agent 时，只投递对应 Ticket 的 Dispatch Packet 及其指向的权威材料。

### 5. 同步与验证

1. 将 Wave、Gate 和 owner 投影同步到 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`；
2. 对照 `<Path>{roots.workflows}/specdev/common/schemas/goal-plan.schema.json</Path>`；
3. 运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

4. 更新 `<Path>{roots.state}/specdev/status.json</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`；
5. 原子写入 Goal Plan 和同步投影后重新读取，确认 execution model、Lead、checkpoint、授权、Wave/Gate 与派单块一致；
6. 向用户汇报规划模式、execution model、关键路径、Wave、Gate、shared owner、checkpoint、迁移策略、主要风险和 Ready 状态；
7. 未经用户要求，不自动进入实现。

## 决策完备标准

Goal Plan 必须让执行 Lead 或实现者无需重新决定：

- 跨 Ticket 先后、并发 Wave 和关键汇合点；
- shared path 与共享合同的 owner；
- Gate 开启、关闭和证据；
- 迁移、兼容、收缩、发布和回滚顺序；
- Agent 派单上下文、Evidence 返回和集成规则；
- execution model、Lead、checkpoint、上下文交付、修正上限和逐动作授权；
- 偏差等级、暂停范围和批准路径。

Goal Plan 不应重复：

- Ticket 的完整局部执行路线；
- 每个 Ticket 的全部文件预测；
- 每条局部验收 checklist；
- Spec 中的完整用户故事和产品背景。

## 完成标准

- `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` 已写入且只包含适用内容；
- 所有计划内 Ticket Ready，DAG 无环，合同覆盖明确；
- Wave、Gate、owner、集成、偏差和恢复可执行；
- 每个计划 Ticket 的 Dispatch Packet 可独立定位权威输入、路径合同、验证和恢复点；
- Tickets Map 投影已同步；
- 无未批准高影响假设或硬停止问题；
- `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>` 无 error；
- 用户收到摘要和下一步选择。

## 子文件引用

- 规划模式与输入门禁：`<Path>{roots.workflows}/specdev/P-goal-plan/planning-modes.md</Path>`
- DAG、Wave、Gate 与 Lead 编排：`<Path>{roots.workflows}/specdev/P-goal-plan/orchestration-protocol.md</Path>`
- 完成、证据、偏差与恢复：`<Path>{roots.workflows}/specdev/P-goal-plan/completion-control.md</Path>`
- Goal Plan 模板：`<Path>{roots.workflows}/specdev/P-goal-plan/goal-plan-template.md</Path>`
- 并行 Ticket worktree：`<Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>`
- Agent 交付合同：`<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/SKILL.md</Path>`
