# Evidence: <Ticket ID> — <Ticket title>

- **Change：** `<change>`
- **Ticket：** `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`
- **Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **Tickets Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` / 不适用
- **基线/分支：**
- **Worktree 引用：** 不适用 / `<workspace_ref>`
- **实现者：**
- **开始/结束：**
- **状态：** review / done / blocked / deviated

## 1. 实现摘要

用用户可观察行为和已锁定契约说明实际完成了什么，不复述提交日志。

## 2. 修改范围

| 路径 | 所有权 | 改动目的 |
|---|---|---|
| `<Path>src/example.ts</Path>` | writable / shared:<owner> | ... |

## 3. 验收与合同映射

| Contract / Acceptance ID | 验证接缝 | 证据 | 结果 |
|---|---|---|---|
| AC-... | ... | 测试、截图、日志或人工检查摘要 | pass / fail / not-run |

每个 Ticket 验收项必须恰好落到一行；不能用“一般测试已通过”替代逐项证据。

## 4. 验证执行

| 命令或步骤 | 运行环境 | 结果 | 摘要或附件 |
|---|---|---|---|
| ... | ... | pass / fail / not-run | ... |

- **失败后修复与重跑：** 无 / ...
- **未运行检查：** 无 / 原因与风险 ...
- **E2E：** 不适用 / 场景、执行者与结果
- **反向验证：** 不适用 / 受控失败信号与恢复结果
- **外部声明：** 无 / 已核对 / `unverified`：原因

## 5. 双轴审查

### 标准轴

- **结果：** pass / request-changes
- **来源：** 仓库标准 + Fowler baseline
- **Findings：** 无 / ...
- **修正与重跑：** 不适用 / ...

### 规范轴

- **结果：** pass / request-changes / skipped:no-spec
- **来源：** Spec / Ticket / source / 无
- **Findings：** 无 / ...
- **修正与重跑：** 不适用 / ...

两轴保持独立顺序，不合并或跨轴重排 finding。

## 6. 路径所有权审计

- **writable 内修改：**
- **shared 修改与 owner 批准：** 无 / ...
- **read-only 修改：** 无
- **未声明路径：** 无
- **生成文件或锁文件：** 无 / 来源与 owner ...

## 7. 偏差与决策

- **偏差：** 无 / `<deviation-id>`
- **偏差记录：** `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` / 不适用
- **批准人或决策来源：**
- **对范围、契约、依赖或后续 Ticket 的影响：** 无 / ...

偏差处理遵守 `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>`，不得静默修改 Ticket 目标或验收。

## 8. 残余风险与后续

- **残余风险：** 无 / ...
- **已知限制：** 无 / ...
- **后续 Ticket：** 无 / `<ticket-id>`
- **监控或回滚触发条件：** 不适用 / ...

## 9. 交付定位

- **Commit / PR：**
- **最终 Workspace 引用：** 不适用 / `<workspace_ref>`
- **Evidence 文件：** `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`
