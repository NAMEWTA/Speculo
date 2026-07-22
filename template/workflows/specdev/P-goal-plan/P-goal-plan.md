---
id: specdev/goal-plan
type: workflow-entry
workflow: specdev
name: 目标规划
description: 将 spec、tickets 和参考权威综合为一份目标规划文档——编排多 ticket 里程碑的约束、质量门禁和执行协议，桥接"已有 tickets"到"协调执行 20+ tickets"
keywords: [目标规划, 编排, 里程碑, 门禁, Lead, Subagent, 合同, 参考权威]
---

# 目标规划

组合 work——将 spec、tickets、参考权威和领域上下文综合为一份完整的 goal-plan.md 文档，定义多 ticket 里程碑的约束条件、质量门禁、调度顺序和执行协议。

产物统一写入 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`。

在开始规划之前，读取变更的上下文与上游产物：

- **spec.md** —— 当前变更的规格：`<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **tickets-map.md** —— ticket 依赖图与执行清单（格式遵循 `<Path>{roots.workflows}/specdev/T-tickets/tickets-map-template.md</Path>`）：`<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **ADR.md** —— 架构决策记录：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- **CONTEXT.md** —— 领域词汇表：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- **LOG.md** —— 设计决策日志：`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`

如果 spec.md 或 tickets-map.md 不存在，先运行 `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>` 和 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>` 产出上游产物。

## 流程

### 1. 收集输入与检测模式

读取所有上游产物，检测适用的编排模式。委托给 `<Path>{roots.workflows}/specdev/P-goal-plan/input-validation.md</Path>`。

若上游产物（spec、tickets-map、ADR）引用了不熟悉的外部依赖、技术栈或第三方服务，先调用 `<Path>{roots.workflows}/specdev/common/research/SKILL.md</Path>` 了解其能力边界、约束条件和集成方式，再推导编排模式和执行协议。

**完成标准**：上游产物已加载；编排模式已识别（合同模式、参考权威模式、偏差模式、执行模式），输出为模式检测摘要。

### 2. 编写远景章节（§1-3）

编写 Goal、Authoritative Inputs、Definition of Done 三个远景章节。委托给 `<Path>{roots.workflows}/specdev/P-goal-plan/vision-sections.md</Path>`。

**完成标准**：§1 目标声明、§2 权威输入优先级表与冲突裁决顺序、§3 六道门禁 DoD 已草拟并经用户确认。

### 3. 编写执行章节（§4-5）

编写 Ticket DAG 与调度顺序、单 ticket 执行协议。委托给 `<Path>{roots.workflows}/specdev/P-goal-plan/execution-sections.md</Path>`。

**完成标准**：§4 DAG 图（ASCII art）、并发规则、门禁次序、编号对照表已草拟；§5 八步执行协议（含双轴审查、Lead 纪律、回写规则）已定制并经用户确认。

### 4. 编写治理章节（§6-8）

编写里程碑级验收、硬约束、进度回报格式。委托给 `<Path>{roots.workflows}/specdev/P-goal-plan/governance-sections.md</Path>`。

**完成标准**：§6 五项里程碑验收步骤、§7 非协商硬约束、§8 结构化进度回报格式已草拟并经用户确认。

### 5. 可选——添加 Ticket 速查表（§9）

如果 ticket 数量超过 10 个或用户要求，追加 Ticket 一览速查表。委托给 `<Path>{roots.workflows}/specdev/P-goal-plan/quick-reference-table.md</Path>`。

**完成标准**：§9 速查表已添加或已确认跳过。

### 6. 写入产物与停止

将完整 goal-plan.md 写入 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`。更新 `<Path>{roots.state}/specdev/status.json</Path>`：在 `work_history` 中追加条目（含 `change`、`work_id`、`started_at`、`completed_at`、`result`），在 `active` 中更新当前 change 条目的 `works_run` 列表。

向用户汇报产物摘要（ticket 数量、门禁层级、合同/参考权威引用、关键约束），明确询问进入实现阶段（`<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>`）或需要进一步修订。

**完成标准**：goal-plan.md 已写入变更目录，九章节齐全无残留 `[TODO:]`；status.json 已更新；摘要已汇报给用户。

## 子文件引用

本入口及以下子文件按需加载：

| 文件 | 内容 | 触发条件 |
|------|------|----------|
| `<Path>{roots.workflows}/specdev/P-goal-plan/input-validation.md</Path>` | 输入验证与模式检测 | 进入步骤 1「收集输入与检测模式」时加载——包含必需输入检查清单、五题模式检测、冲突裁决顺序推导、模式检测摘要输出格式 |
| `<Path>{roots.workflows}/specdev/P-goal-plan/vision-sections.md</Path>` | 远景章节 §1-3 编写规程 | 进入步骤 2「编写远景章节」时加载——包含 Goal 五要素公式、权威输入优先级表与冲突裁决、六道门禁 DoD 骨架填充规则 |
| `<Path>{roots.workflows}/specdev/P-goal-plan/execution-sections.md</Path>` | 执行章节 §4-5 编写规程 | 进入步骤 3「编写执行章节」时加载——包含 DAG 构造规则、ASCII 图约定、并发控制、八步执行协议模板 |
| `<Path>{roots.workflows}/specdev/P-goal-plan/lead-orchestration-protocol.md</Path>` | Lead 编排协议——派单上下文、handoff 交接、合并冲突、Worktree 隔离、收尾审查 | 经由 `<Path>{roots.workflows}/specdev/P-goal-plan/execution-sections.md</Path>` 在 Lead+Subagent 模型 §5 步骤 2「派单」时加载——覆盖从派单到里程碑收尾的完整 Lead 协调生命周期 |
| `<Path>{roots.workflows}/specdev/P-goal-plan/governance-sections.md</Path>` | 治理章节 §6-8 编写规程 | 进入步骤 4「编写治理章节」时加载——包含里程碑验收仪式、硬约束推导、进度回报格式模板 |
| `<Path>{roots.workflows}/specdev/P-goal-plan/quick-reference-table.md</Path>` | 速查表 §9 编写规程 | ticket 数量 ≥ 10 或用户显式要求时加载——包含五列表格模板与从 tickets-map 提取行数据的规则 |

## 依赖关系

- **上游输入**：依赖 `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>` 产出的 spec.md 和 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>` 产出的 tickets-map.md；强烈建议已有 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>` 产出的 ADR.md、CONTEXT.md、LOG.md。
- **下游消费**：产物 goal-plan.md 被 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` 在实现阶段读取，作为里程碑级约束和门禁次序的权威来源。
