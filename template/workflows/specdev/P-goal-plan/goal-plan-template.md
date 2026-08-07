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
| 2 | `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` | 已接受架构决策 | 通过新决策替代 |
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

<!-- Ticket 较多或执行者需要时添加；数据从 Ticket 与 Tickets Map 提取。 -->

| ID | Ticket | 行为产出 | Depth/Risk | Dependencies | Wave/Gate | Owner | Evidence |
|---|---|---|---|---|---|---|---|
| T-01 | `<Path>{roots.state}/specdev/changes/{change}/ticket/01-<name>.md</Path>` | ... | standard/medium | — | W0/G0 | lead | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` |

## 3. Gates and Completion Evidence

### Overall Definition of Done

### Gates

| Gate | 开启条件 | 关闭证据 | 阻塞范围 | Owner/批准人 | 失败恢复 |
|---|---|---|---|---|---|

### Contract and Reference Coverage

| 合同或参考要求 | 覆盖 Ticket | 验证接缝 | Evidence | 状态 |
|---|---|---|---|---|

## 4. Execution and Integration Protocol

### Delivery Contract

| 字段 | 值 |
|---|---|
| Execution model | direct / native-subagent / external-web-subagent |
| Lead / Provider | `<owner>` / `<provider-or-none>` |
| Repository / Branch | `<repository-or-local>` / `<branch-or-n/a>` |
| Checkpoint policy | immutable SHA / local baseline |
| Source delivery | none / repository-url / source-package / combination |
| Max concurrency / corrections | `<n>` / `3` |
| Review | standards + spec + Lead verification + conditional E2E |

### Authorization Matrix

| 动作 | 状态 | 目标与条件 |
|---|---|---|
| Local changes | allowed / not-authorized | ... |
| Commit | allowed / not-authorized | ... |
| Push / PR / Merge | allowed / not-authorized | ... |
| Deploy / Migration | allowed / not-authorized | ... |
| Production configuration / feature / real user data | allowed / not-authorized | ... |

### Per-Ticket Dispatch Packets

#### Dispatch: T-01

- **Goal / observable result：**
- **Priority on conflict：** correctness > contract completeness > speed，或当前项目裁决
- **Implement / Ticket：** `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>`；`<Path>{roots.state}/specdev/changes/{change}/ticket/01-<name>.md</Path>`
- **Authority / dependencies：** 相关合同、ADR/CONTEXT、已完成依赖 Evidence
- **Wave / Gate / hard constraints：**
- **Writable / read-only / shared owner：**
- **Baseline / branch / workspace or session locator / package hash：**
- **Preflight receipt：** 在 `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` 记录目标、顺序、最大风险和基线差异，不超过 10 行
- **Verification / baseline / reverse check：**
- **Authorization / deviation / correction limit：**
- **Return：** 状态、Evidence、locator、最终 checkpoint、commit/PR、未验证项、待 Lead E2E

并行写代码时记录统一 `base_sha`，并为每个 Ticket 指定分支、`workspace_ref` 和 worktree owner。每个派单块可以独立投递，但不复制完整 Ticket 或历史对话。

### Ticket Execution

引用 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` 和对应 `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`，不复制 Ticket 全文。

### Evidence Return and Integration

Worker 将 Ticket 推进到 `review`，返回 Ticket ID 与状态、Evidence 路径、`workspace_ref`、commit 或 PR 引用，以及条件性 Lead E2E；Lead 负责集成、回归和 worktree 收尾。

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

记录 Wave/Gate、Ticket、checkpoint、workspace/session locator、修正轮次和未验证项；不使用主观百分比。

### Pending Decisions and Blockers

达到修正上限时记录最后可信 checkpoint、失败命令、已通过行为、owner 和恢复条件。

### Resume Protocol

恢复时读取本 Goal Plan、当前 Ticket、最新 Evidence 和 change 状态，从最后已验证 checkpoint 继续。

### Reporting Format

## Assumptions

仅记录低影响、可逆且有验证方式的假设。高影响假设存在时，`ready_for_execution` 必须为 `false`。
