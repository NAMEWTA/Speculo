---
id: specdev/implement
type: workflow-entry
workflow: specdev
name: 实现
description: 基于 Ready Ticket 或获批小型 Spec 执行设计检查、TDD、动态派单、双轴审查、按 Goal Plan 选择的 current workspace 或 Ticket worktree 提交、直接父分支或候选合并验证和 Lead Evidence 回写。
keywords: [实现, TDD, Lead, subagent, worktree, current workspace, direct-parent, candidate-merge, 代码审查, 证据]
---

# 实现

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

本 work 保留模块设计检查、design-it-twice、TDD 红绿循环、双轴审查和证据治理。Ticket 模式按子 Goal Plan 或父 Implementation Plan 的 `ticket_workspace_policy` 选择 current workspace 串行直接父分支或独立 worktree candidate-merge；Lead 根据实际情况自行实现或动态派单。

若当前 change 是未完成父 Implementation Map 的成员，必须读取 `<Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path>`、父 Map 与父 Plan。父 Plan 提供跨 change dependency/serialization、全局 workspace 策略、组合派单标识、implementation agent cap 和 integration queue；子 Goal Plan 只能增加子内 Gate，不能放宽或冲突。

## 执行模式

### Ticket 模式（默认）

读取 Ready Ticket、Tickets Map、可选子 Goal Plan 和可选父 Implementation Plan。存在父 Plan 时使用其 Lead、workspace/integration 策略和全局门，即使子 Goal Plan 不存在也可以执行；两者都存在时必须策略一致。没有父 Plan 时沿用子 Goal Plan；两者都不存在时，当前主会话作为该 Ticket 的 Lead，并按 Direct Spec 规则执行，不推断 worktree 策略。`required` 模式每个 Ticket 建立独立 worktree；`current` 模式所有受同一计划约束的 Ticket 严格串行，使用当前分支和当前 workspace。

### Direct Spec 模式

只有极小、局部、单一行为、低风险、可逆且无需 Ticket DAG 的工作，才可在用户批准后直接基于 Spec/ADR/CONTEXT 在 current workspace 执行。先确认目标、IN/OUT、唯一写入 owner、可写范围、关键不变量、验证和验收。出现公共 API/schema、迁移、安全、高风险、多个行为或并行需求时返回 T-tickets。

## 输入

两种模式都必须读取：

- 当前 Spec：`<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- 项目配置：`<Path>{roots.state}/specdev/config.json</Path>`

Ticket 模式还必须读取当前 Ticket `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`；存在 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` 时必须读取。若当前 change 被父 Implementation Map 声明，还必须读取该父 change 的 Map/Plan。Direct Spec 模式必须读取用户对轻量执行合同和直接实现的明确批准。

按存在情况读取：

- 当前 change 架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- 当前 change 领域上下文：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- 当前 change 设计日志：`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- 当前 change 诊断：`<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`
- 永久架构决策：`<Path>{roots.state}/specdev/adr/</Path>`
- 永久领域上下文：`<Path>{roots.state}/specdev/context/</Path>`

永久目录可以为空，静默继续。当前 ADR/CONTEXT 缺失且实施需要对应决定时，返回 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`；Spec、Ticket 或 Goal Plan 与代码事实冲突时按 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>` 返回真正 owner，不在实现中覆盖。

Git 已处于 merge/rebase 冲突时，先加载 `<Path>{roots.workflows}/specdev/I-implement/merge-conflict-protocol.md</Path>`；不把冲突伪装成普通 TDD。

## 流程

### 1. 执行前预检与 workspace

加载 `<Path>{roots.workflows}/specdev/I-implement/execution-preflight.md</Path>`。

Ticket 模式：

1. 验证 Ready、依赖 Evidence、Spec/ADR/Goal Plan、一致性、路径 owner 和验证接缝；
2. 确认子 Goal Plan schema v6（若存在）与父 Implementation Plan schema v1（若存在）、唯一 Lead、workspace 策略、动态 implementation/integration 上限与授权；
3. `required` 模式以 `purpose=ticket, operation=create|restore` 调用 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>`；`current` 模式读取当前 branch、HEAD、dirty 状态并确认没有其他 Ticket implementation writer；
4. Lead 把 Ticket 设为 `in_progress`；`required` 模式将 change worktree 记录设为 `active`，`current` 模式建立 current workspace 执行记录；
5. 当前代码使合同失效时停止并返回对应上游 owner。

Direct Spec 模式验证用户批准、轻量合同和 current workspace 唯一写入 owner；不创建虚假 Ticket/worktree 状态。

**完成标准**：按策略完成 workspace、基线、owners、权限与实际 Git 一致；current 模式只有一个 implementation writer 且 Ticket 串行可恢复。

### 2. Lead 决定自行实现或动态派单

Ticket 模式下，Lead 根据 Ticket 独立性、路径冲突、上下文、风险和平台能力决定。派单时以 `operation=dispatch` 调用 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/SKILL.md</Path>`。`current` 模式仍可派遣一个 implementation subagent 写当前 workspace，但必须等待其返回、Lead 验收并形成 commit 后才进入下一个 Ticket；`required` 模式 implementation subagent 绑定独立 Ticket worktree。Direct Spec 模式由 Lead 作为 current workspace 唯一写入 owner，不派遣 implementation subagent 写入。

- implementation subagent 同时取适用子 Goal Plan、父 Implementation Plan、config 和平台能力的共同上限；current 模式保持单 writer 串行安全不变量；Lead 不计入；
- 父实现编排存在时，派单与返回都使用 `<member-change>::<ticket-id>`，并占用父 Plan 的 task/serialization/integration slot；
- review/research/test-observation agent 不设置 SpecDev 数字上限，但保持只读；
- implementation Packet 按策略绑定唯一 Ticket workspace 或 current workspace、checkpoint、路径、非 E2E 检查与 commit 返回；
- subagent 不写 SpecDev 工件、Evidence、父分支或 E2E 结果；
- Lead 自行实现时仍遵循相同 worktree、commit 与返回事实合同。

**完成标准**：current 模式只有一个 implementation owner 写当前 workspace；required 模式只有一个 owner 写当前 Ticket worktree；Direct Spec 只有 Lead 写 current workspace；所有 SpecDev 写入仍由 Lead 拥有。

### 3. 设计检查

加载 `<Path>{roots.workflows}/specdev/common/rules/codebase-design.md</Path>`，检查模块、接口、类型、不变量、顺序/错误/性能语义、接缝、适配器、依赖分类、测试观察点和既有公共合同。

存在多个不改变上层契约的局部设计时，可运行 `<Path>{roots.workflows}/specdev/I-implement/design-it-twice.md</Path>`。超出 Ticket 或改变产品/公共合同/数据/兼容/安全时，返回架构审查、Grill、Spec 或 Ticket owner。陌生外部依赖使用 research Skill。

**完成标准**：局部设计与上层契约一致，稳定接缝和依赖策略明确。

### 4. TDD 红→绿垂直循环

加载 `<Path>{roots.workflows}/specdev/I-implement/tdd-rules.md</Path>`、`<Path>{roots.workflows}/specdev/I-implement/tdd-test-design.md</Path>`、`<Path>{roots.workflows}/specdev/I-implement/tdd-mocking.md</Path>` 和 `<Path>{roots.workflows}/specdev/common/rules/code-commenting-rule.md</Path>`。对每个验收行为或关键风险：

1. 选择公共接口或稳定接缝；
2. 编写因目标行为缺失而失败的测试/验证并确认失败原因；
3. 只写足以通过当前测试的实现；
4. 运行定向非 E2E 验证；
5. 保存 red/green 事实并进入下一条窄切片。

不得删除测试、放宽断言、吞错、永久跳过或只验证 Mock 调用次数来制造绿色。

新增或修改代码注释时，先判断信息能否由命名、类型或结构表达，并同步维护受行为变化影响的既有注释。

### 5. 实现检查、commit 与 Lead 接收

Ticket 模式的 implementation owner 按 Goal Plan 策略在当前 workspace 或来源 worktree：

- 运行 Ticket 要求的单元、组件、静态、类型、lint/build 等非 E2E 检查；
- 审计 writable/shared/read-only 路径和新/既有/环境失败；
- 在已授权时创建引用 Ticket ID 的实现 commit；current 模式 commit 直接落在父分支，required 模式落在 Ticket branch；
- 返回 commit、dirty 状态、实际路径、命令/结果、未运行项和恢复条件。

Ticket 模式中，Lead 以 `operation=accept` 调用 subagent-delivery，重读 Git 状态、branch tip、commit、diff 和命令事实。无改动时将 Ticket 改为 `cancelled` 并记录原因；不得 empty commit 或 Evidence-only Done。required 模式来源 worktree 不运行 E2E；current 模式适用 E2E 留给 Lead 的 direct-parent 验证。

Direct Spec 模式由 Lead 在 current workspace 运行轻量合同要求的定向非 E2E 检查，审计获批可写范围，并在获得 implementation commit 授权后创建引用 change 的非空 commit；无需改动时记录事实并取消直接实现，不创建 empty commit。记录实施前基线、最终 checkpoint、dirty 状态、实际路径、命令结果、未运行项和恢复条件。

**完成标准**：required 模式 Ticket worktree clean 且 `source_checkpoint` 精确等于 branch tip；current 模式 workspace clean 且 Ticket `result_sha` 精确等于父分支上的 implementation commit；或 Direct Spec 的 current workspace checkpoint、路径和轻量合同一致。

### 6. 双轴审查

调用 `<Path>{roots.workflows}/specdev/common/skills/code-review/SKILL.md</Path>`。required Ticket 以 `base_sha` 与 `source_checkpoint` 为固定点；current Ticket 以 Ticket 实施前基线与 implementation commit 为固定点；Direct Spec 以实施前基线与 current workspace 最终 checkpoint 为固定点：

- 标准轴：正确性、模块设计、错误、安全、性能、并发、资源、测试与可维护性；
- 规范轴：Spec/Ticket IN/OUT、实现合同、路径所有权、验证矩阵与 Goal Gate。

标准轴同时复核 `<Path>{roots.workflows}/specdev/common/rules/code-commenting-rule.md</Path>`：公共 API 契约完整，内部注释只保留非显然的 Why、Invariant 和 Risk，且相关注释与当前行为一致。

两个轴隔离并按标准轴、规范轴顺序返回 Lead。局部 finding 在当前模式的实现 workspace 修正、创建新 checkpoint 并重跑；改变上层契约则登记 deviation。Ticket 进入 `review` 或 Direct Spec 进入最终验证前，两轴必须通过。

### 7. 最终集成与适用 E2E

`required` Ticket 模式中，Lead 以 `purpose=ticket, operation=finalize` 调用 dev-worktree：

1. 在最新父分支的 Lead-owned candidate checkout 组合 source commit；
2. 运行受影响集成/回归、项目父状态检查和 Ticket 标记 required 的 E2E；
3. candidate 失败时父分支不动，Ticket 回 `in_progress`/`blocked`；
4. 父 HEAD 漂移时废弃本轮 candidate，基于最新父分支重建并重跑；
5. 全部通过后父分支 fast-forward 到 candidate/result SHA；
6. 重读父 HEAD/tree 和 ancestor 关系后，才允许 Ticket Done。

E2E 是否需要由 Ticket/Goal Plan 的实际跨边界风险决定，不限于 UI；不适用必须记录原因。

`current` Ticket 模式跳过 source worktree、candidate merge 和 candidate checkout。Lead 在当前 workspace 运行 Ticket 要求的适用集成/回归与 E2E，记录运行环境、命令、退出码和摘要；E2E 不得派给其他 agent。失败时不声明完成，保留 Ticket commit、父 HEAD 和恢复条件。全部通过后重读父 HEAD/tree 并记录 `result_sha`。Direct Spec 模式同样跳过 source worktree、candidate merge 和父分支推进。

### 8. Evidence、状态与完成

Lead 使用 `<Path>{roots.workflows}/specdev/I-implement/evidence-template.md</Path>` 写入 Ticket Evidence；Direct Spec 按该模板的 Direct Spec 适配说明写 `<Path>{roots.state}/specdev/changes/{change}/evidence/direct-spec.md</Path>`。Ticket Evidence 按策略记录 implementation/source、适用 candidate/result SHA、派单/返回、两层验证、双轴审查、E2E disposition、路径审计、偏差和残余风险；Direct Spec Evidence 使用实施前基线与 current workspace 最终 checkpoint，不伪造 Ticket/worktree/candidate 字段。

Ticket 正常状态：`ready → in_progress → review → done`。`required` 的 `done` 要求 change worktree 已完成集成（`integrated` 或 `removed`）、父 HEAD=result SHA 且包含 source commit；`current` 的 `done` 要求 current workspace clean、direct-parent 验证通过且父 HEAD=result SHA。阻塞使用 `blocked`，契约偏差使用 `deviated`，无需改动使用 `cancelled`。Direct Spec 由当前 I-implement owner 按 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>` 关闭 change。

按存在和当前模式同步 Ticket、Tickets Map、Goal Plan、`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 和全局状态；Direct Spec 不创建缺失的 Ticket/Map/Goal Plan。最后一个计划内 Ticket 完成后，Goal Plan 的 Lead 按 change completion 关闭；无 Goal Plan 的当前 I owner 承担同一门禁。需要远程 reconcile 时返回 T-triage，否则进入 Archive。

当前 change 属于未完成父实现 change 时，单个组合 Ticket 的子状态与 Evidence 验证完成后必须自动返回 `<Path>{roots.workflows}/specdev/O-orchestrate-implementation/O-orchestrate-implementation.md</Path>`，由父 Lead 重读全部成员并继续下一 frontier；不得要求用户逐个重新激活，不得直接归档子 change，也不得从本 Work 实现另一个成员。

运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage implement \
  --repo <project-root> \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

### 9. 返回

Ticket 模式返回 Ticket/change 状态、Evidence 完整路径、workspace locator、implementation/source、适用 candidate/result SHA、父分支、E2E disposition、未验证项和下一路由。Direct Spec 返回 change 状态、`<Path>{roots.state}/specdev/changes/{change}/evidence/direct-spec.md</Path>`、current workspace、实施前/最终 checkpoint、适用 E2E 和下一路由。push、PR、remote merge、deploy、migration、生产动作及来源 branch/worktree cleanup 只在独立授权时执行。

## 完成标准

- Ticket 模式按策略完成 current workspace/direct-parent 或 worktree/implementation commit/candidate gate；Direct Spec 的轻量合同、current workspace checkpoint、双轴审查和最终验证完整；
- current Ticket 的适用 E2E 由 Lead 在 current workspace 运行；required Ticket 的适用 E2E 由 Lead 在 parent-candidate 运行；Direct Spec 适用 E2E 由 Lead 在 current workspace 运行；
- Lead 独立核对并写全部 SpecDev 工件；
- current Ticket 父分支只推进到通过的 direct-parent 验证 commit；required Ticket 父分支只推进到通过的 candidate；两者 Ticket Done 都必须与实际 Git 一致；Direct Spec 的完成状态与 current workspace 最终 checkpoint 一致；
- 实际路径、验证、偏差和状态可由 Evidence 恢复；
- validator 无 error。

## 子文件引用

- 执行前预检：`<Path>{roots.workflows}/specdev/I-implement/execution-preflight.md</Path>`
- 代码库设计：`<Path>{roots.workflows}/specdev/common/rules/codebase-design.md</Path>`
- Design It Twice：`<Path>{roots.workflows}/specdev/I-implement/design-it-twice.md</Path>`
- TDD：`<Path>{roots.workflows}/specdev/I-implement/tdd-rules.md</Path>`、`<Path>{roots.workflows}/specdev/I-implement/tdd-test-design.md</Path>`、`<Path>{roots.workflows}/specdev/I-implement/tdd-mocking.md</Path>`
- 代码注释：`<Path>{roots.workflows}/specdev/common/rules/code-commenting-rule.md</Path>`
- Evidence：`<Path>{roots.workflows}/specdev/I-implement/evidence-template.md</Path>`
- Agent 交付：`<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/SKILL.md</Path>`
- Worktree：`<Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>`
- 冲突处理：`<Path>{roots.workflows}/specdev/I-implement/merge-conflict-protocol.md</Path>`
