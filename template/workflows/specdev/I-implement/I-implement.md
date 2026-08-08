---
id: specdev/implement
type: workflow-entry
workflow: specdev
name: 实现
description: 基于 Ready Ticket 或获批的小型 Spec 执行设计检查、TDD 红绿循环、持续验证、双轴审查、证据回写和提交。
keywords: [实现, TDD, 代码审查, 模块设计, 证据, ticket]
---

# 实现

本 work 保留深模块设计检查、接缝和依赖分类、design-it-twice、TDD 红→绿垂直循环、隔离双轴审查、项目级验证、提交和状态更新。治理升级增加 Ready、路径所有权、Evidence、完成所有权和偏差门禁。

## 执行模式

### Ticket 模式（默认）

读取一个 Ready Ticket：

- Ticket：`<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`
- Tickets Map：`<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- 可选 Goal Plan：`<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`

Ticket 模式适用于多 Ticket、Standard/Deep、并行、迁移或需要完整证据治理的工作。

Goal Plan 只有包含完整 `## Delegated Execution Addendum` 时才进入 delegated execution 分支。Lead 在派单、恢复或验收候选交付时调用 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/SKILL.md</Path>`；普通 Goal Plan 不建立 Lead/Worker 角色，也不调用该 Skill。

### Direct Spec 模式（保留原能力）

极小、局部、单一行为且不需要独立 Ticket DAG 的工作，可以在用户明确批准后直接基于：

- Spec：`<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- 架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- 领域上下文：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`

执行前必须从 Spec 明确提取并向用户确认一个轻量执行契约：目标、IN/OUT、可写范围、关键不变量、验证命令和验收条件。出现公共 API/schema、迁移、安全、高风险、多个独立行为或并行需求时，必须返回 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`，不得使用 Direct Spec 模式绕过治理。

## 通用输入

按存在情况读取：

- 当前 Spec：`<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- 当前架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- 当前领域上下文：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- 当前设计日志：`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- 永久架构决策：`<Path>{roots.state}/specdev/adr/</Path>`
- 永久领域上下文：`<Path>{roots.state}/specdev/context/</Path>`
- 项目配置：`<Path>{roots.state}/specdev/config.json</Path>`

当前 change 的架构决策或领域上下文缺失，且实现需要这些决定时，先运行 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>` 或请求用户建立上下文。永久目录可以为空，静默继续。

## 流程

Git 已处于 merge/rebase 冲突时，先加载 `<Path>{roots.workflows}/specdev/I-implement/merge-conflict-protocol.md</Path>` 并完成或可恢复地暂停该分支；不要把冲突伪装成普通 TDD 切片。

### 1. 执行前预检

加载 `<Path>{roots.workflows}/specdev/I-implement/execution-preflight.md</Path>`。

Ticket 模式检查：

- `ready: true`；
- 状态允许开始；
- `blocked_by` 全部 done；
- Ticket 与 Spec/ADR/Goal Plan 无冲突；
- 可写、只读、共享路径明确且无并发冲突；
- 并行执行时，Ticket 的 worktree 记录为 `active`，`base_sha` 与派单一致；
- 存在委派附录时，派单块的 execution model、Lead、checkpoint、workspace/session locator、路径合同、修正上限和授权矩阵与当前事实一致；
- 验证命令和 Evidence 位置可用；
- 当前代码事实没有使核心契约失效。

Direct Spec 模式检查：

- 用户已明确批准直接实现；
- 单一行为、局部、低风险、可逆；
- 轻量执行契约完整；
- 不涉及 Deep 条件；
- 可写范围和验证明确。

失败时停止，标记 `blocked` 或 `deviated`，不得边做边补关键决策。

### 2. 设计检查

加载 `<Path>{roots.workflows}/specdev/common/rules/codebase-design.md</Path>`，并严格使用其中的模块、接口、深度、接缝、适配器、杠杆和局部性术语。

在写代码前检查：

- 目标代码属于哪些模块；
- 每个模块的接口、类型、不变量、顺序约束、错误和性能语义；
- 模块是否有足够深度，是否减少调用者认知；
- 接缝在哪里，是否有真实适配器或可替换实现；
- 依赖属于进程内、本地可替换、远程自有或真正外部依赖；
- 测试应在哪个稳定接缝观察行为；
- Ticket/Spec 已锁定的公共契约是否被保持。

存在多个局部接口设计且不改变已锁定契约时，可以运行 `<Path>{roots.workflows}/specdev/I-implement/design-it-twice.md</Path>`。若设计摩擦已经超出当前 Ticket 范围，返回 `<Path>{roots.workflows}/specdev/R-review-architecture/R-review-architecture.md</Path>`；若方案会改变产品行为、公共接口、数据、兼容、安全或范围，返回 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>` 或相应规划工件，不使用 design-it-twice 绕过决策。

若不熟悉外部库、框架 API 或依赖能力边界，调用 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`。

**完成标准**：模块深度、接口、不变量、接缝、适配器和依赖策略已检查，局部设计与上层契约一致。

### 3. TDD 红→绿垂直循环

加载：

- `<Path>{roots.workflows}/specdev/I-implement/tdd-rules.md</Path>`
- `<Path>{roots.workflows}/specdev/I-implement/tdd-test-design.md</Path>`
- `<Path>{roots.workflows}/specdev/I-implement/tdd-mocking.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/code-commenting-rule.md</Path>`

对每个验收行为或关键风险：

1. 选择公共接口或稳定接缝；
2. 编写会因目标行为缺失而失败的测试或可重复验证；
3. 确认失败原因正确；
4. 只写足以通过当前测试的实现；
5. 运行定向验证；
6. 保存 red/green 证据并进入下一条窄垂直切片。

本循环新增或修改代码注释时，使用注释规则判断信息是否应由代码表达，并同步维护受行为变更影响的既有注释。

不得通过删除测试、放宽断言、吞错、永久跳过或只测试 Mock 调用次数来制造绿色。

### 4. 持续验证与范围审计

- 每个安全落点运行定向验证；
- 完成前运行 Ticket 验证矩阵，或 Direct Spec 模式的轻量验证契约；
- 按 `<Path>{roots.state}/specdev/config.json</Path>` 运行适用的类型检查、lint、测试和构建；
- 普通 Goal Plan 下由当前实现者运行适用 E2E；存在委派附录时 Worker 只记录场景与预期结果，由 Lead 在集成阶段执行；
- 检查实际修改均在 `writable_paths` 或获批的 Direct Spec 可写范围内；
- shared path 只由 owner 修改；
- 越界前停止并提出 ownership change，不先改后报；
- 记录新失败、既有失败和环境失败的区别。

完成当前实现审查前运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage implement \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

证据规则见 `<Path>{roots.workflows}/specdev/common/rules/evidence-and-verification.md</Path>`。

### 5. 双轴审查

调用 `<Path>{roots.workflows}/specdev/common/skills/code-review/SKILL.md</Path>`，把当前 Ticket 基线和实现 checkpoint 固定为本地 SHA。

- **标准轴**：正确性、模块设计、代码异味、错误处理、安全、性能、并发、资源释放、测试质量和可维护性；
- **规范轴**：对照 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`、Ticket 的 IN/OUT、实现契约、路径所有权、验证矩阵和 Goal Gate。

标准轴同时复核步骤 3 加载的注释规则：公共 API 契约完整，内部注释只保留非显然的 Why、Invariant 和 Risk，且所有相关注释与当前行为一致。

两个轴使用隔离上下文并按标准轴、规范轴顺序写入 Evidence，不合并或跨轴重排。审查发现局部问题时进入独立修正/重构阶段，随后重跑受影响验证和 review 轴；需要改变上层契约时升级 deviation 并返回 Spec/Ticket/ADR。

### 6. Evidence 与状态

Ticket 模式使用 `<Path>{roots.workflows}/specdev/I-implement/evidence-template.md</Path>` 写入：

```text
<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>
```

Direct Spec 模式写入：

```text
<Path>{roots.state}/specdev/changes/{change}/evidence/direct-spec.md</Path>
```

Evidence 必须包含实际修改范围、命令与结果、验收逐条映射、未运行项、偏差、残余风险和提交引用。

存在委派附录时，加载 `<Path>{roots.workflows}/specdev/I-implement/delegated-evidence-template.md</Path>`，补充 execution model、provider、派单与最终 checkpoint、workspace/session locator、候选交付核对、修正轮次和未验证声明。Lead 使用 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/SKILL.md</Path>` 的 `operation=execute` 分支完成核对；provider 自报结果不能直接标记为 `pass`。普通 Evidence 不包含这些字段或空占位。

Ticket 状态依次为 `ready → in_progress → review → done`；阻塞使用 `blocked`，实际实现与批准契约不一致使用 `deviated`。验证无法运行或存在未批准偏差时不得标 `done`。

最后一个计划内 Ticket 完成后加载 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>`：没有 Goal Plan 或 Goal Plan 不含委派附录时，完成门全部通过后由本 Work 原子设置 change 为 completed；存在完整委派附录时只返回 Evidence，由 Lead 独立验收并关闭 change。若 triage 显示 `pending-close` 或 `close-failed`，下一 Work 为 `<Path>{roots.workflows}/specdev/T-triage/T-triage.md</Path>`；否则进入 Archive。

同步：

- Ticket：`<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`
- Tickets Map：`<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- change 状态：`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`
- 全局状态：`<Path>{roots.state}/specdev/status.json</Path>`

### 7. 提交与返回

1. 运行项目自身的适用验证；
2. 仅在 `<Path>{roots.state}/specdev/config.json</Path>` 和用户授权允许时提交；
3. 提交信息引用 Ticket ID 或 Direct Spec change；
4. 不自动推送、合并、部署、发布或执行不可逆迁移；
5. 返回 Ticket ID 与状态、Evidence 完整路径、`workspace_ref`、commit 或 PR 引用和适用 E2E 结果；委派 Worker 返回待 Lead 执行的 E2E；
6. Direct Spec 模式返回 change、状态和 `<Path>{roots.state}/specdev/changes/{change}/evidence/direct-spec.md</Path>`。

普通 Goal Plan 遵循 `<Path>{roots.workflows}/specdev/P-goal-plan/orchestration-protocol.md</Path>` 的 Evidence 返回协议；存在委派附录时遵循 `<Path>{roots.workflows}/specdev/P-goal-plan/delegated-execution.md</Path>`，同时返回稳定 workspace/session locator、最终 checkpoint、修正轮次和未验证项。

## 完成标准

- 执行前预检通过；
- 设计检查严格使用共享术语，并保留深模块、接缝、适配器和依赖分类能力；
- 每个行为通过真实红→绿循环实现；
- 定向与适用回归验证完成；
- 双轴审查通过；
- Evidence 完整；
- 实际修改未超出授权路径；
- 无未批准 deviation；
- 状态已同步；
- 实现结果可通过 Evidence、状态和代码引用完整定位；
- 提交遵守用户授权。

## 子文件引用

- 执行前预检：`<Path>{roots.workflows}/specdev/I-implement/execution-preflight.md</Path>`
- 代码库设计规则：`<Path>{roots.workflows}/specdev/common/rules/codebase-design.md</Path>`
- Design It Twice：`<Path>{roots.workflows}/specdev/I-implement/design-it-twice.md</Path>`
- TDD 规则：`<Path>{roots.workflows}/specdev/I-implement/tdd-rules.md</Path>`
- TDD 测试设计：`<Path>{roots.workflows}/specdev/I-implement/tdd-test-design.md</Path>`
- TDD Mocking：`<Path>{roots.workflows}/specdev/I-implement/tdd-mocking.md</Path>`
- 代码注释规则：`<Path>{roots.workflows}/specdev/common/rules/code-commenting-rule.md</Path>`
- 双轴审查：`<Path>{roots.workflows}/specdev/common/skills/code-review/SKILL.md</Path>`
- Evidence 模板：`<Path>{roots.workflows}/specdev/I-implement/evidence-template.md</Path>`
- 委派 Evidence 附录：`<Path>{roots.workflows}/specdev/I-implement/delegated-evidence-template.md</Path>`，仅 Goal Plan 含委派附录时加载
- Agent 交付合同：`<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/SKILL.md</Path>`
- Merge/rebase 冲突：`<Path>{roots.workflows}/specdev/I-implement/merge-conflict-protocol.md</Path>`
