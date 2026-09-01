---
id: specdev/orchestrate-implementation
type: workflow-entry
workflow: specdev
name: 编排实现
description: 将两个或以上已完成 Ready Spec 与 Ready Tickets 的 change 编译为跨 change implementation super-DAG，并由单一 Lead 在一个会话中持续调度实现、验证和集成。
keywords: [实现编排, 父 change, super-DAG, Ticket, Lead, agent team, worktree, 冲突]
---

# 编排实现

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

本 Work 只编排实现。它不创建或补写子 change 的 Triage、Grill、Wayfinder、Spec、Ticket 或普通 Goal Plan。父 change 创建前，每个输入 change 都必须已有 Ready Spec、Tickets Map 和决策完备的 Ready Tickets；缺一项就停止并报告具体缺口。

父 change 将所有子 Ticket 投影为 `<member-change>::<ticket-id>` 组合节点，以跨 change implementation super-DAG、全局 workspace 策略、serialization、agent 配额和 integration queue 持续驱动 I-implement。子 Spec/Ticket/Evidence/Git 继续是行为与实现权威，父工件只拥有跨 change 实现编排。

父 change 的主产物是 `<Path>{roots.state}/specdev/changes/{change}/implementation-map.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/implementation-plan.md</Path>`；整体验证写入 `<Path>{roots.state}/specdev/changes/{change}/evidence/implementation-orchestration.md</Path>`。

## 激活输入

创建模式必须获得至少两个用户明确指定的 change。恢复模式由用户指定父 change，或从 active change 中唯一满足 `current_work=specdev/orchestrate-implementation` 且存在父实现产物者确定。

创建父 change 前必须读取并验证：

- `<Path>{roots.state}/specdev/status.json</Path>` 与 `<Path>{roots.state}/specdev/config.json</Path>`；
- 每个成员的 `<Path>{roots.state}/specdev/changes/{member-change}/.status.json</Path>`；
- 每个成员的 `<Path>{roots.state}/specdev/changes/{member-change}/spec.md</Path>`；
- 每个成员的 `<Path>{roots.state}/specdev/changes/{member-change}/tickets-map.md</Path>`；
- 每个成员的 `<Path>{roots.state}/specdev/changes/{member-change}/ticket/</Path>`；
- 存在时读取子 Goal Plan、ADR、CONTEXT、LOG、Diagnosis 与 Evidence；
- 当前 repository、branch、HEAD、dirty 状态、项目 Agent 指令与可用验证命令。

加载 `<Path>{roots.workflows}/specdev/O-orchestrate-implementation/input-readiness.md</Path>` 和 `<Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path>`。任何成员未实现就绪、已归档、等于父 change、属于另一个未完成父实现 change，或本身是父实现 change 时，不创建父 change。

## 流程

### 1. 先验证全部子 Change，再创建父 Change

对每个成员穷尽检查 Ready Spec、Tickets Map、Ticket frontmatter、合同覆盖、内部 DAG、路径所有权、验证矩阵和高影响未知项。部分 Ticket 可以已经 done/cancelled；其余待实现 Ticket 必须 `ready: true` 且处于可执行状态。全部 Ticket 已终态的成员只作为 satisfied baseline，不占执行 frontier。

只有所有成员通过输入门后，才从 change status 模板创建普通父 change，在全局 `active` 添加仅含 `change` 的索引，把父 `current_work` 设置为 `specdev/orchestrate-implementation`，再写父 Map/Plan。任何预检失败都不得留下半创建父 change。

**完成标准**：父创建是 all-or-nothing；输入成员不少于两个；没有用父 Work 修补任何上游工件。

### 2. 编译 Implementation Super-DAG

加载 `<Path>{roots.workflows}/specdev/O-orchestrate-implementation/super-dag.md</Path>` 与 `<Path>{roots.workflows}/specdev/O-orchestrate-implementation/conflict-and-drift.md</Path>`。

1. 将每个子 Ticket 映射为唯一组合节点；
2. 将所有子 Ticket `blocked_by` 精确提升为组合 dependency；
3. 只为真实合同/产物前置关系增加跨 change dependency；
4. 为无语义依赖但不能并发的 Ticket 增加无方向 serialization pair；
5. 比较所有待实现 Ticket 的 writable/shared paths、公共合同、repository/ref 和迁移资源；
6. 检测循环、缺失节点、重复边、无 owner overlap 和子图漂移。

使用 `<Path>{roots.workflows}/specdev/O-orchestrate-implementation/implementation-map-template.md</Path>` 写父 Map。Map 是子 Ticket 图的可重算投影；子 Ticket 变化时先重读权威，再递增 Map revision。

**完成标准**：父 Map 的 members/tasks/internal edges 与全部子工件精确一致；跨 change 边有来源；DAG 无环；每个并行冲突已依赖化、串行化或阻塞。

### 3. 一次决定全局执行策略

只询问一次是否开启 Ticket worktree，默认不开启，并把选择写入父 Plan：

- `current/direct-parent`：全部成员的待实现 Ticket 全局严格串行，只允许一个 current workspace implementation writer；
- `required/candidate-merge`：依赖满足且无 serialization/path/resource 冲突的 Tickets 可跨 change 并行，每个 Ticket 使用自己的 source worktree。

从 config 读取 implementation agent 与 integration attempt 上限，父 Plan 可以降低但不能提高。Lead 不计入实现 agent 数；review/research/test-observation agents 只读且不受该数字限制。同一 repository/ref 的 integration 永远串行。

使用 `<Path>{roots.workflows}/specdev/O-orchestrate-implementation/implementation-plan-template.md</Path>` 写父 Plan。已有子 Goal Plan 只提供子 change 内的额外 Gate/约束；其 workspace 策略与父 Plan 冲突时阻塞，不能覆盖父级全局选择。

Implementation Plan 固定使用 `orchestration: lead-directed`，并显式持久化 `implementation_agent_limit`、`integration_attempt_limit`、workspace/integration 策略和唯一 Lead；恢复时不得从会话记忆重建这些值。

**完成标准**：Lead、workspace/integration 策略、全局 agent 上限、frontier、Wave、serialization owner 和 integration queue 可从父 Plan 恢复。

### 4. 在一个会话中持续执行

加载 `<Path>{roots.workflows}/specdev/O-orchestrate-implementation/execution-loop.md</Path>`。父 Lead 自动循环，不要求用户逐个激活子 change：

1. 重读父 Map/Plan、所有子 Ticket/status 和 Git；
2. 计算依赖满足、lock 可用且配额允许的 ready frontier；
3. current 模式选择一个 Ticket，required 模式选择一组互不冲突的 Tickets；
4. 将子 `current_work` 设置为 `specdev/implement`，按组合 ID 调用 I-implement；
5. implementation agent 仅写授权 workspace，Lead 验收 commit/diff/验证/Evidence；
6. 按 repository/ref queue 串行完成 direct-parent 或 candidate integration；
7. 先原子提交子 Ticket/change 状态，再更新父 Plan 投影；
8. 父 HEAD、Map revision 或子合同变化后使旧 dispatch/candidate stale，并重新 preflight；
9. 仍有 frontier 时立即进入下一轮，否则完成或持久化 blocker。

I-implement 是实际实现 owner；父 Work 不复制 TDD、代码审查、Evidence 或 worktree 逻辑。用户只在合同冲突、高影响偏差、缺失授权、不可逆动作或无合法 frontier 时被打断。

**完成标准**：单次父激活可以连续完成多个子 Ticket；没有第二个 SpecDev 状态 writer、超限 agent、并发 parent integration 或绕过子 I-implement 完成门。

### 5. 关闭子 Changes 与父 Change

一个成员的全部计划内 Ticket done/cancelled 且其 Goal/Evidence/Git 门通过时，父 Lead 按 change completion 关闭该子 change；不等待其他成员才关闭，也不自动归档。

全部成员 completed 后，Lead 运行跨 change aggregate test/typecheck/lint/build 与适用 E2E，核对跨 change 合同、依赖顺序、共享路径、迁移/恢复和最终 Git checkpoint，并使用 `<Path>{roots.workflows}/specdev/O-orchestrate-implementation/implementation-evidence-template.md</Path>` 写整体验证。

只有父 Map/Plan completed、全部成员 completed、无 blocker/deviation/active dispatch/candidate/lock 且整体验证通过时，才清空父 `current_work`、去重加入 `specdev/orchestrate-implementation` 到 `works_run` 并关闭父 change。归档、push、PR、remote merge、deploy 和生产迁移保持独立授权。

运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage orchestrate-implementation \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

## 完成标准

- 父 change 只接受 Spec/Tickets 已 Ready 的成员；
- Implementation Map/Plan 可恢复完整组合 DAG、全局策略、frontier 和 integration queue；
- 子工件保持权威，父投影与子 Ticket 精确一致；
- current 全局串行，required 只并行无冲突 Ticket，全部实现受父级 agent cap 约束；
- I-implement 自动回到父循环，全部子 change 和父 change completed；
- aggregate Evidence 与 validator 通过；
- 无未经授权的归档、远程 Git、部署或生产副作用。

## 子文件引用

- 输入就绪门：`<Path>{roots.workflows}/specdev/O-orchestrate-implementation/input-readiness.md</Path>`
- Super-DAG：`<Path>{roots.workflows}/specdev/O-orchestrate-implementation/super-dag.md</Path>`
- 执行循环：`<Path>{roots.workflows}/specdev/O-orchestrate-implementation/execution-loop.md</Path>`
- 冲突与漂移：`<Path>{roots.workflows}/specdev/O-orchestrate-implementation/conflict-and-drift.md</Path>`
- Map 模板：`<Path>{roots.workflows}/specdev/O-orchestrate-implementation/implementation-map-template.md</Path>`
- Plan 模板：`<Path>{roots.workflows}/specdev/O-orchestrate-implementation/implementation-plan-template.md</Path>`
- Evidence 模板：`<Path>{roots.workflows}/specdev/O-orchestrate-implementation/implementation-evidence-template.md</Path>`
- 共享规则：`<Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path>`
