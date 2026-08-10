---
id: specdev/implement
type: workflow-entry
workflow: specdev
name: 实现
description: 基于 Ready Ticket 或获批小型 Spec 执行设计检查、TDD、动态派单、双轴审查、Ticket worktree commit、候选合并验证和 Lead Evidence 回写。
keywords: [实现, TDD, Lead, subagent, worktree, candidate-merge, 代码审查, 证据]
---

# 实现

本 work 保留模块设计检查、design-it-twice、TDD 红绿循环、双轴审查和证据治理。Ticket 模式固定使用来源 worktree、实现 commit 和 parent-candidate 集成；Lead 根据实际情况自行实现或动态派单。

## 执行模式

### Ticket 模式（默认）

读取 Ready Ticket、Tickets Map 和可选 Goal Plan。存在 Goal Plan 时使用其中的 Lead；没有 Goal Plan 时，当前主会话作为该 Ticket 的 Lead。每个 Ticket 都建立独立 worktree，无论实现者是 Lead 还是 implementation subagent。

### Direct Spec 模式

只有极小、局部、单一行为、低风险、可逆且无需 Ticket DAG 的工作，才可在用户批准后直接基于 Spec/ADR/CONTEXT 在 current workspace 执行。先确认目标、IN/OUT、唯一写入 owner、可写范围、关键不变量、验证和验收。出现公共 API/schema、迁移、安全、高风险、多个行为或并行需求时返回 T-tickets。

## 输入

两种模式都必须读取：

- 当前 Spec：`<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- 项目配置：`<Path>{roots.state}/specdev/config.json</Path>`

Ticket 模式还必须读取当前 Ticket `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`；存在 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` 时必须读取。Direct Spec 模式必须读取用户对轻量执行合同和直接实现的明确批准。

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

### 1. 执行前预检与来源 worktree

加载 `<Path>{roots.workflows}/specdev/I-implement/execution-preflight.md</Path>`。

Ticket 模式：

1. 验证 Ready、依赖 Evidence、Spec/ADR/Goal Plan、一致性、路径 owner 和验证接缝；
2. 确认 Goal Plan schema v4（若存在）、Lead、implementation agent 上限与授权；
3. 以 `purpose=ticket, operation=create|restore` 调用 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>`；
4. Lead 把 Ticket 设为 `in_progress`，change worktree 记录设为 `active`；
5. 当前代码使合同失效时停止并返回对应上游 owner。

Direct Spec 模式验证用户批准、轻量合同和 current workspace 唯一写入 owner；不创建虚假 Ticket/worktree 状态。

**完成标准**：Ticket 来源 worktree、基线、owners、权限与实际 Git 一致；Direct Spec 的小型边界可判定。

### 2. Lead 决定自行实现或动态派单

Ticket 模式下，Lead 根据 Ticket 独立性、路径冲突、上下文、风险和平台能力决定。派单时以 `operation=dispatch` 调用 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/SKILL.md</Path>`。Direct Spec 模式由 Lead 作为 current workspace 唯一写入 owner；可以派遣只读 review/research/test-observation agent，不派遣 implementation subagent 写 current workspace。

- implementation subagent 同时最多取 Goal Plan/config/平台上限的最小值且不超过三个；Lead 不计入；
- review/research/test-observation agent 不设置 SpecDev 数字上限，但保持只读；
- implementation Packet 绑定唯一 Ticket worktree、checkpoint、路径、非 E2E 检查与 commit 返回；
- subagent 不写 SpecDev 工件、Evidence、父分支或 E2E 结果；
- Lead 自行实现时仍遵循相同 worktree、commit 与返回事实合同。

**完成标准**：只有一个 implementation owner 写当前 Ticket worktree，或 Direct Spec 只有 Lead 写 current workspace；所有 SpecDev 写入仍由 Lead 拥有。

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

Ticket 模式的 implementation owner 在来源 worktree：

- 运行 Ticket 要求的单元、组件、静态、类型、lint/build 等非 E2E 检查；
- 审计 writable/shared/read-only 路径和新/既有/环境失败；
- 在已授权时创建引用 Ticket ID 的实现 commit；
- 返回 commit、dirty 状态、实际路径、命令/结果、未运行项和恢复条件。

Ticket 模式中，Lead 以 `operation=accept` 调用 subagent-delivery，重读 Git 状态、branch tip、commit、diff 和命令事实。无改动时将 Ticket 改为 `cancelled` 并记录原因；不得 empty commit 或 Evidence-only Done。来源 worktree 不运行 E2E。

Direct Spec 模式由 Lead 在 current workspace 运行轻量合同要求的定向非 E2E 检查，审计获批可写范围，并在获得 implementation commit 授权后创建引用 change 的非空 commit；无需改动时记录事实并取消直接实现，不创建 empty commit。记录实施前基线、最终 checkpoint、dirty 状态、实际路径、命令结果、未运行项和恢复条件。

**完成标准**：Ticket worktree clean 且 `source_checkpoint` 精确等于 branch tip；或 Direct Spec 的 current workspace checkpoint、路径和轻量合同一致。

### 6. 双轴审查

调用 `<Path>{roots.workflows}/specdev/common/skills/code-review/SKILL.md</Path>`。Ticket 模式以 `base_sha` 与 `source_checkpoint` 为固定点；Direct Spec 以实施前基线与 current workspace 最终 checkpoint 为固定点：

- 标准轴：正确性、模块设计、错误、安全、性能、并发、资源、测试与可维护性；
- 规范轴：Spec/Ticket IN/OUT、实现合同、路径所有权、验证矩阵与 Goal Gate。

标准轴同时复核 `<Path>{roots.workflows}/specdev/common/rules/code-commenting-rule.md</Path>`：公共 API 契约完整，内部注释只保留非显然的 Why、Invariant 和 Risk，且相关注释与当前行为一致。

两个轴隔离并按标准轴、规范轴顺序返回 Lead。局部 finding 在当前模式的实现 workspace 修正、创建新 checkpoint 并重跑；改变上层契约则登记 deviation。Ticket 进入 `review` 或 Direct Spec 进入最终验证前，两轴必须通过。

### 7. 最终集成与适用 E2E

Ticket 模式中，Lead 以 `purpose=ticket, operation=finalize` 调用 dev-worktree：

1. 在最新父分支的 Lead-owned candidate checkout 组合 source commit；
2. 运行受影响集成/回归、项目父状态检查和 Ticket 标记 required 的 E2E；
3. candidate 失败时父分支不动，Ticket 回 `in_progress`/`blocked`；
4. 父 HEAD 漂移时废弃本轮 candidate，基于最新父分支重建并重跑；
5. 全部通过后父分支 fast-forward 到 candidate/result SHA；
6. 重读父 HEAD/tree 和 ancestor 关系后，才允许 Ticket Done。

E2E 是否需要由 Ticket/Goal Plan 的实际跨边界风险决定，不限于 UI；不适用必须记录原因。

Direct Spec 模式跳过 source worktree、candidate merge 和父分支推进。Lead 在 current workspace 运行轻量合同要求的适用回归与 E2E，记录运行环境、命令、退出码和摘要；E2E 不得派给其他 agent。失败时不声明完成，保留最后可信 checkpoint 和恢复条件。全部通过后重读 Git 状态与最终 checkpoint。

### 8. Evidence、状态与完成

Lead 使用 `<Path>{roots.workflows}/specdev/I-implement/evidence-template.md</Path>` 写入 Ticket Evidence；Direct Spec 按该模板的 Direct Spec 适配说明写 `<Path>{roots.state}/specdev/changes/{change}/evidence/direct-spec.md</Path>`。Ticket Evidence 包含 source/candidate/result SHA、派单/返回、两层验证、双轴审查、E2E disposition、路径审计、偏差和残余风险；Direct Spec Evidence 使用实施前基线与 current workspace 最终 checkpoint，不伪造 Ticket/worktree/candidate 字段。

Ticket 正常状态：`ready → in_progress → review → done`。`done` 要求 change worktree 已完成集成（`integrated`，或集成后已清理的 `removed`）、父 HEAD=result SHA 且包含 source commit。阻塞使用 `blocked`，契约偏差使用 `deviated`，无需改动使用 `cancelled`。Direct Spec 由当前 I-implement owner 按 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>` 关闭 change。

按存在和当前模式同步 Ticket、Tickets Map、Goal Plan、`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 和全局状态；Direct Spec 不创建缺失的 Ticket/Map/Goal Plan。最后一个计划内 Ticket 完成后，Goal Plan 的 Lead 按 change completion 关闭；无 Goal Plan 的当前 I owner 承担同一门禁。需要远程 reconcile 时返回 T-triage，否则进入 Archive。

运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage implement \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

### 9. 返回

Ticket 模式返回 Ticket/change 状态、Evidence 完整路径、source workspace、source/candidate/result SHA、父分支、E2E disposition、未验证项和下一路由。Direct Spec 返回 change 状态、`<Path>{roots.state}/specdev/changes/{change}/evidence/direct-spec.md</Path>`、current workspace、实施前/最终 checkpoint、适用 E2E 和下一路由。push、PR、remote merge、deploy、migration、生产动作及来源 branch/worktree cleanup 只在独立授权时执行。

## 完成标准

- Ticket 模式的 worktree、实现 commit、双轴审查和 candidate gate 完整；Direct Spec 的轻量合同、current workspace checkpoint、双轴审查和最终验证完整；
- source worktree 无 E2E，Ticket 适用 E2E 由 Lead 在 parent-candidate 运行，Direct Spec 适用 E2E 由 Lead 在 current workspace 运行；
- Lead 独立核对并写全部 SpecDev 工件；
- Ticket 父分支只推进到通过的 candidate，Ticket Done 与实际 Git 一致；Direct Spec 的完成状态与 current workspace 最终 checkpoint 一致；
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
