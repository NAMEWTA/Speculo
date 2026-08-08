---
schema_version: 3
artifact: goal-plan
change: <YYYY-MM-DD-topic>
status: draft
modes: [coordination]
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
| 2 | `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` | 当前 change 架构决定 | 通过新决定替代 |
| 3 | `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` | 外部行为、范围与验收 | 下游不得改写 |
| 4 | `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>` | 单 Ticket 契约 | Goal Plan 只编排 |
| 5 | 当前代码事实 | 现状与可行性 | 冲突时触发偏差 |

## 2. Execution Graph

### DAG and Critical Path

```text
...
```

### Waves and Ownership

| Wave | Ticket | 前置条件 | 项目写路径 | Shared owner | 集成点 |
|---|---|---|---|---|---|

### Ticket Quick Reference

| ID | Ticket | 行为产出 | Depth/Risk | Dependencies | Wave/Gate | Owner | Evidence |
|---|---|---|---|---|---|---|---|
| T-01 | `<Path>{roots.state}/specdev/changes/{change}/ticket/01-<name>.md</Path>` | ... | standard/medium | — | W0/G0 | `<owner>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` |

## 3. Gates and Completion Evidence

### Overall Definition of Done

### Gates

| Gate | 开启条件 | 关闭证据 | 阻塞范围 | Owner/批准人 | 失败恢复 |
|---|---|---|---|---|---|

### Contract and Reference Coverage

| 合同或参考要求 | 覆盖 Ticket | 验证接缝 | Evidence | 状态 |
|---|---|---|---|---|

## 4. Execution and Integration Protocol

### Ticket Execution Order

| Ticket | 开始条件 | 执行 owner | 必跑验证 | Evidence | 集成条件 |
|---|---|---|---|---|---|

### Authorization Matrix

| 动作 | 状态 | 目标与条件 |
|---|---|---|
| Local changes | allowed / not-authorized | ... |
| Commit | allowed / not-authorized | ... |
| Push / PR / Merge | allowed / not-authorized | ... |
| Deploy / Migration | allowed / not-authorized | ... |
| Production configuration / feature / real user data | allowed / not-authorized | ... |

### Evidence Return and Integration

每个实现者按 I-implement 与对应 Ticket 执行，写入 Evidence 并同步 Ticket/Map/Goal Plan。最后一个计划内 Implement 汇总 Gate、运行适用集成验证，并按完成合同关闭 change。

## 5. Constraints, Risk and Recovery

### Non-negotiable Constraints

每条包含来源和违反后果；局部实现自由进入 Guidance。

### Verification Integrity

记录不可修改的判卷接缝、基线非退化条件、禁止的伪绿色方式，以及仅对静默失败风险执行的受控反向验证。

### Migration or Release Sequence

### Risks, Monitoring and Recovery

### Deviation Control

遵循 `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>`。

## 6. Progress and Decisions

### Current Status

记录 Wave/Gate、Ticket、最近验证证据和未验证项；不使用主观百分比。

### Pending Decisions and Blockers

记录失败命令、已通过行为、owner 和恢复条件。

### Resume Protocol

恢复时读取本 Goal Plan、当前 Ticket、最新 Evidence 和 change 状态，从最后已验证事实继续。

### Reporting Format

## Assumptions

仅记录低影响、可逆且有验证方式的假设。高影响假设存在时，`ready_for_execution` 必须为 `false`。
