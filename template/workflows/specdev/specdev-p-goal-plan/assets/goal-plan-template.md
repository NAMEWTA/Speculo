---
schema_version: 8
artifact: goal-plan
change: <YYYY-MM-DD-topic>
status: draft
modes: []
orchestration: lead-directed
lead: <owner-or-session-locator>
integration_attempt_limit: 3
ticket_execution: auto
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

编排采用既有研究时，记录原条目定位、关键原始 URL 和对当前 Gate/依赖的影响；完整比较和成员决定保持原 owner，不把参考方案当作已批准合同。

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

**执行入口：** 获得实现授权后，Lead 与实现执行者读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`，再按当前输入实际调用适用项目 Skill。I 负责实现、风险适配双轴审查、验证与 Evidence；计划本身不授予实现或 Git 操作权限。

### Lead Orchestration

执行方式独立于下方工作区策略：默认按当前宿主正常执行（mode: host），App、CLI 等均可，subagent/team 属于宿主能力；明确指定 CLI 调用、Herdr 等方式才按共享编排合同接入。记录本次选择与来源，不逐任务重新询问。

| 项目 | 决定 | 事实依据 |
|---|---|---|
| Lead | `<owner-or-session-locator>` | 唯一 SpecDev 状态、Evidence 与交付验收 owner |
| Ticket scheduling | `ticket_execution: auto`；有明确票据上限时增加 max_parallel_tickets | DAG、路径/资源、用户与项目要求 |
| Implementation agents | 有明确要求才记录 concurrent_implementation_limit；核对已有 config/宿主人数限制 | 不从票数或工作区数量推导 |
| Integration attempts | `<integration_attempt_limit>` | 检查失败后的 Lead 复盘上限 |
| Read-only agents | 不额外占票据槽，review 中的票仍计入 | 当前 Work 的独立审查/工具要求仍生效 |
| Dispatch | execution-time dynamic | 单 Agent、subagent 或团队按事实选择 |

### Change Workspace and Verification

工作区实际事实只在 change README 的 Execution Context，所有票据和执行者复用。未指定时使用 current，明确要求才创建/复用一个 change worktree。父计划只导航成员选择；串并行不改变工作区数量。

serial 完成当前票的实现、审查和验证后开始下一票；auto/parallel 推进无冲突 Ready 票。shared owner、Git index 操作与全局验证协调串行。验收固定真实 commit 或未提交快照；Lead-owned E2E 在稳定 change-workspace 上执行，不创建 candidate checkout。

### Authorization Matrix

| 动作 | 状态 | 目标与条件 |
|---|---|---|
| Change workspace implementation | allowed / not-authorized | 授权范围和唯一写集 owner |
| Change worktree creation | allowed / not-requested | 一个 change 的明确选择，不从并行继承 |
| Change workspace verification | allowed / not-authorized | 固定输入、适用双轴审查与 Lead E2E |
| Implementation commit | allowed / not-requested | 仅明确要求且获授权时执行 |
| Merge / parent update | allowed / not-requested | 具体目标与交付约定，不是每票默认门 |
| Push / PR / remote merge | allowed / not-authorized | 不从实现授权继承 |
| Branch/worktree cleanup | allowed / not-authorized | 精确授权目标，保全可恢复产物 |
| Deploy / migration / production actions | allowed / not-authorized | 逐动作、目标和条件 |

### Evidence Return

任务执行者 只返回候选事实与 checkpoint/快照；Lead 独立核对并写 Evidence、状态和最终验收。

## 5. Constraints, Risk and Recovery

### Non-negotiable Constraints

### Verification Integrity

记录判卷接缝、基线、禁止的伪绿色方式，以及选定 change 工作区内每票与整体交付的验证边界。

### Migration or Release Sequence

### Risks, Monitoring and Recovery

### Deviation Control

遵循 `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>`。

## 6. Progress and Decisions

### Current Status

只记录本 Goal 独有的当前 Wave/Gate、跨票验收、整体阻塞与下一步；相关 Ticket、固定 checkpoint/快照与逐票验证只导航原 Ticket/Evidence，不复制状态或结果；不使用主观百分比。

### Pending Decisions and Blockers

### Resume Protocol

恢复时读取 Goal Plan、README 的 Execution Context、当前 Ticket 和原 Evidence 的 Workspace Execution Record，并核对选定工作区、实际 Git 与 writer；从最后可信 checkpoint/快照及未决事项继续。

## Assumptions

只记录低影响且可验证的假设。存在高影响假设时 `ready_for_execution` 必须为 `false`。


## Execution Policy Source

记录用户/项目约定的可回读出处；说明 ticket_execution、可选票据上限、明确人数限制和验证尝试上限。缺少人数或票数要求时不填固定数字；工作区引用 change README。轻量无票 Goal 继续使用必要清单和验收，不预造运行记录。

