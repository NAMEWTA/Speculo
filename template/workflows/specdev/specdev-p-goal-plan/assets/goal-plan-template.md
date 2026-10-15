---
schema_version: 7
artifact: goal-plan
change: <YYYY-MM-DD-topic>
status: draft
modes: []
orchestration: lead-directed
lead: <owner-or-session-locator>
concurrent_implementation_limit: 3
integration_attempt_limit: 3
ticket_workspace_policy: current
integration_gate: direct-parent
ready_for_execution: false
---

# Goal Plan: <标题>

- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **Tickets Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Ticket 目录：** `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- **Evidence 目录：** `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`

## 1. Outcome and Authority

### Outcome

### Success and False Completion

### Non-goals

### Authoritative Inputs

| 优先级 | 来源 | 负责内容 | 冲突处理 |
|---|---|---|---|
| 1 | 用户最新明确决定 | 产品取舍与批准 | 更新真正拥有该决策的工件 |
| 2 | `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` | 当前 change 架构决定与领域语义 | 返回 `<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/SKILL.md</Path>` 更新真正 owner |
| 3 | `<Path>{roots.state}/specdev/adr/</Path>` 与 `<Path>{roots.state}/specdev/context/</Path>` | 已毕业的永久决定与领域知识 | 当前 change 替代时在 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` 明示 |
| 4 | `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` | 外部行为、范围与验收 | 下游不得改写 |
| 5 | `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>` | 单 Ticket 契约 | Goal Plan 只编排 |
| 6 | `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>` 与当前代码/运行事实 | 已验证根因、现状与可行性 | 冲突时触发偏差并返回真正 owner |

## 2. Execution Graph

### DAG and Critical Path

```text
...
```

### Waves and Ownership

| Wave | Ticket | 前置条件 | 项目写路径 | Shared owner | Gate/集成序号 |
|---|---|---|---|---|---|

### Ticket Quick Reference

未来 draft 票在原 Ticket 的未决问题中记录待交付的上游产物、生产者 Ticket、所需证据和 DoR 重审条件。此表只导航原 Ticket/Evidence；状态、Ready、执行 owner 与工作区结果不复制到 Goal，不以 Goal Ready 代替逐票 Ready。

| ID | Ticket | Evidence |
|---|---|---|
| T-01 | `<Path>{roots.state}/specdev/changes/{change}/ticket/01-<ticket-name>.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` |

## 3. Gates and Completion Evidence

### Overall Definition of Done

### Gates

| Gate | 开启条件 | 关闭证据 | 阻塞范围 | Lead/批准人 | 失败恢复 |
|---|---|---|---|---|---|

### Contract and Reference Coverage

| 合同或参考要求 | 覆盖 Ticket | 验证接缝 | Evidence | 状态 |
|---|---|---|---|---|

## 4. Execution and Integration Protocol

### Lead Orchestration

执行方式独立于下方工作区策略：默认按当前宿主正常执行（mode: lead），App、CLI 等均可，subagent/team 属于宿主能力；明确指定 CLI 交互、Herdr 等方式才按共享编排合同接入。记录本次选择与来源，不逐任务重新询问。

| 项目 | 决定 | 事实依据 |
|---|---|---|
| Lead | `<owner-or-session-locator>` | 唯一 SpecDev 状态、Evidence 与父分支 owner |
| Concurrent implementations | `<concurrent_implementation_limit>`，Lead 实际参与实现时计入；current 始终单 writer | 本计划 Execution Policy Source；核对实际存在的 config、依赖和平台限制 |
| Integration attempts | `<integration_attempt_limit>` | 本计划 Execution Policy Source；核对实际存在的 config 限制 |
| Read-only agents | 无 SpecDev 数字上限 | review/research/test-observation，不写状态 |
| Dispatch | execution-time dynamic | provider/模型/派单按 Ticket 事实选择 |

### Ticket Workspace and Integration

本节拥有跨票工作区策略和集成安排。每票实际 Parent/base、workspace/branch、implementation/source commit、检查/E2E 和 parent result 只记录在原 Ticket Evidence 的 Workspace Execution Record；通过上表导航回读，不在 Goal 再维护一套结果。

当 `ticket_workspace_policy: current` 时，Ticket 必须严格串行。Lead 每次只允许一个 implementation owner 写入当前 workspace；完成非 E2E 检查并形成 commit 后，Lead 在同一父分支/current workspace 运行适用集成检查和 E2E，验证通过后将该 Ticket 的 `result_sha` 记录为其 implementation commit，再开始下一个 Ticket。不得创建 source/candidate worktree。

当 `ticket_workspace_policy: required` 时，Ticket 使用独立 source worktree；source worktree 不运行 E2E，Lead 在最新父分支的 candidate 状态运行集成检查和适用 E2E，通过且父 HEAD 未漂移后才推进父分支。

### Authorization Matrix

| 动作 | 状态 | 目标与条件 |
|---|---|---|
| Current workspace Ticket changes | allowed / not-authorized | 仅 current 模式；严格串行，单一 implementation writer |
| Ticket worktree local changes | allowed / not-authorized | 仅 required 模式；限 writable/shared owner 合同 |
| Implementation commit | allowed / not-authorized | 每 Ticket 必需；缺失则 Plan blocked |
| Local direct-parent verification and parent update | allowed / not-authorized | 仅 current 模式；Lead 核对 Ticket commit 后继续 |
| Local candidate integration and parent update | allowed / not-authorized | 仅 required 模式；Lead-only；缺失则 Plan blocked |
| Push / PR / remote merge | allowed / not-authorized | 不从本计划本地授权继承 |
| Branch/worktree cleanup | allowed / not-authorized | 成功集成不自动继承 |
| Deploy / migration / production actions | allowed / not-authorized | 逐动作、目标和条件 |

### Evidence Return

任务执行者 只返回候选事实与 commit；Lead 独立核对并写 Evidence、状态和最终验收。

## 5. Constraints, Risk and Recovery

### Non-negotiable Constraints

### Verification Integrity

记录判卷接缝、基线、禁止的伪绿色方式，以及 current/direct-parent 或 source/candidate 两层验证边界。

### Migration or Release Sequence

### Risks, Monitoring and Recovery

### Deviation Control

遵循 `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>`。

## 6. Progress and Decisions

### Current Status

只记录本 Goal 独有的当前 Wave/Gate、跨票验收、整体阻塞与下一步；相关 Ticket、implementation/source、candidate/result SHA 与逐票验证只导航原 Ticket/Evidence，不复制状态或结果；不使用主观百分比。

### Pending Decisions and Blockers

### Resume Protocol

恢复时读取 Goal Plan、当前 Ticket 和原 Evidence 的 Workspace Execution Record，并核对实际 Git；从最后通过的父分支 result 或待修正 implementation/source checkpoint 继续。

## Assumptions

只记录低影响且可验证的假设。存在高影响假设时 `ready_for_execution` 必须为 `false`。


## Execution Policy Source

<实际项目/本次约定及可回读出处；填写已有并发和集成尝试字段的真实来源。存在 config 时核对其上限；Lead 自己实现计入，current 严格单 writer。无票轻量 Goal 只使用必要清单/验收，不预造执行记录。>
