# Evidence: <Ticket ID> — <Ticket title>

本模板按 Goal Plan 的 workspace/integration 策略记录实际验证环境；不适用的环境明确写 `not-applicable`，不伪造 source、candidate 或 result 链。Direct Spec 使用本模板时写入 `<Path>{roots.state}/specdev/changes/{change}/evidence/direct-spec.md</Path>`，以实施前基线和最终 checkpoint 代替 Ticket 集成链。

- **Change：** `<change>`
- **Ticket：** `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`
- **Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` / 不适用
- **Lead：** `<owner-or-session-locator>`
- **Workspace/branch：** `<workspace_ref>` / `<branch>`
- **Base/implementation-or-source/candidate/result SHA：** `<sha>` / `<sha>` / `<sha>` / `<sha>`
- **状态：** review / done / blocked / deviated / cancelled

## 1. 实现摘要

用可观察行为与已锁定合同说明实际完成内容。Cancelled 时说明为何无需实现及其权威来源。

## 2. Lead Dispatch And Candidate Return

- **Implementation owner：** Lead / `<agent/provider>`
- **Dispatch Packet/checkpoint：** Lead direct / `<locator + immutable checkpoint>`
- **允许动作：** worktree changes / implementation commit / ...
- **返回：** commit、dirty 状态、修改路径、非 E2E 命令、未验证项与恢复条件
- **Lead 独立核对：** pass / fail；实际读取与命令摘要
- **只读 Agent findings：** 无 / 固定输入、来源、结论、Lead 核对

subagent 不写本 Evidence；以上内容由 Lead 从实际 workspace、Git 和返回事实整理。

## 3. 修改范围与路径所有权

| 路径 | 所有权 | 改动目的 |
|---|---|---|
| `<Path>src/example.ts</Path>` | writable / shared:<owner> | ... |

- **read-only 修改：** 无
- **未声明路径：** 无
- **生成文件/锁文件：** 无 / 来源与 owner

## 4. 验收与合同映射

| Contract / Acceptance ID | 验证接缝 | 证据 | 结果 |
|---|---|---|---|
| AC-... | ... | 测试、日志或人工检查摘要 | pass / fail / not-run |

每个 Ticket 验收项恰好落到一行。

## 5. Workspace Verification

按 Goal Plan 记录 current workspace 或 source worktree 检查，并注明运行环境。

| 命令或步骤 | 运行环境 | 结果 | 摘要 |
|---|---|---|---|
| ... | current-workspace | pass / fail / not-run | ... |

- **失败后修复与重跑：** 无 / ...
- **未运行检查：** 无 / 原因与风险
- **E2E：** 按 Goal Plan 的 E2E disposition 记录；未在本环境运行时说明 owner 与原因

## 6. 双轴审查

标准轴与规范轴保持独立，分别记录固定输入、结果和修正。

### 标准轴

- **固定输入：** `<base_sha>..<source_checkpoint>`
- **结果：** pass / request-changes
- **Findings 与修正：** 无 / ...

### 规范轴

- **固定输入与来源：** Spec / Ticket / Goal Plan / source
- **结果：** pass / request-changes / skipped:no-spec
- **Findings 与修正：** 无 / ...

两个轴隔离并按上述顺序记录。

## 7. Integration Verification

按 Goal Plan 记录 direct-parent 或 parent-candidate 集成；未采用的字段写 `null` 或 `not-applicable`。

| 项目 | 结果 |
|---|---|
| Parent before SHA | `<sha>` |
| Implementation/source SHA | `<sha>` / `<sha>` |
| Candidate branch/workspace | current / `<branch>` / `not-applicable` |
| Method/conflicts | direct-parent / fast-forward / merge-commit；无 / paths |
| Integration checks | 命令、运行环境 `current-workspace`、结果 |
| E2E disposition | required / not-required: reason |
| E2E result | pending / passed / failed / not-required；场景与证据 |
| Parent result/re-read | `<sha>`；HEAD/tree/ancestor 核对 |

集成失败时明确父 HEAD 是否推进、失败命令、旧 SHA 和恢复条件。

## 8. 偏差与决策

- **偏差：** 无 / `<deviation-id>`
- **记录：** `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` / 不适用
- **批准来源及影响：** ...

## 9. 残余风险与交付定位

- **残余风险/已知限制：** 无 / ...
- **后续 Ticket：** 无 / `<ticket-id>`
- **监控或回滚触发：** 不适用 / ...
- **Source commit：** `<sha>`
- **Parent result：** `<sha>`
- **Source workspace：** `<workspace_ref>`
- **Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`
