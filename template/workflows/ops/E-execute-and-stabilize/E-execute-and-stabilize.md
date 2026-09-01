---
id: ops/execute-and-stabilize
type: workflow-entry
workflow: ops
name: 执行、诊断并稳定部署
description: 以不可覆盖 attempt 执行批准计划或只读验证，在失败时诊断并路由重新规划或回滚，最终用稳定性证据完成 change。
keywords: [执行, attempt, 调试, 诊断, 回滚, 验证, 稳定性]
---

# 执行、诊断并稳定部署

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/ops/README.md</Path>`，再执行本入口。

E 是正常部署、批准回滚、attempt 诊断、验证和 completed 转换的唯一 owner。它不补写计划或批准，也不把命令退出零当作部署完成。

## 模式

- `deploy`：执行当前批准计划；
- `remediation`：执行失败 attempt 触发并重新批准的修订计划；
- `rollback`：执行当前计划已批准的恢复批次或 automatic trigger；
- `verification-only`：global inventory-only change 的定向只读重读，不伪造部署 run。

## 流程

### 1. 恢复与预检

读取所有既有 attempts、当前 status、request、inventory、deployment model、target profile、plan/approval、`<Path>{roots.workflows}/ops/common/rules/execution-loop.md</Path>` 与 `<Path>{roots.workflows}/ops/common/rules/target-profile-and-release-gates.md</Path>`。除 verification-only 外必须通过 `--stage pre-execute`，重建 plan/profile 摘要、source、target、路径包含、整体控制面身份、权限、容量、端口、Gate、数据保护、preview 和 rollback material。

在第一条 mutation 前重采集 identity assertions 并按 exact/ordered-list/set/digest 比较。任何 profile/identity/构件漂移、新 mutation、新权限或计划外写入都会零 mutation 停止，令 approval invalidated 并返回 I/P。发现同一 target/deployment root 正被另一 change 执行时阻塞。

旧 plan v2 与 attempt v1 只读，不得追加 journal、补写字段或作为新 pre-execute/pre-close 证据。需要继续或关闭此类 change 时，保留旧工件，由 I/P 在需要 mutation 时生成 plan v3；无新增 mutation 时创建绑定当前 target profile 的 verification-only attempt v2。只有该 v2 attempt 的 verification state 与 HANDOFF 通过，change 才能重新进入 pre-close/pre-archive。

### 2. 创建 Attempt

分配最小未占用 ATTEMPT-NNN，创建 `execution/attempts/{attempt-id}/`，从 `<Path>{roots.workflows}/ops/E-execute-and-stabilize/attempt-summary-template.md</Path>` 初始化 summary，并写符合 attempt v2 schema 的 `attempt.json`。创建 append-only `journal.jsonl`，每一行独立符合 `<Path>{roots.workflows}/ops/common/schemas/journal-event.schema.json</Path>`；先持久化 attempt-start，再设置 phase=executing/latest_attempt_id。

每个 required Gate 通过后才能开始其约束的 batch。每个 operation 先写 intent/precondition，再执行 apply，随后写 exit、脱敏摘要、postcondition 和 evidence。Gate failed/blocked 后立即停止新 operation，后续 Gate 只记 skipped；不得提升活动指针或删除候选。恢复会话时先核对连续 journal sequence 和真实 postcondition；无法证明幂等则停止。

### 3. 失败诊断与循环

operation、postcondition 或验证失败时立即停止后续 batch，使用 `<Path>{roots.workflows}/ops/E-execute-and-stabilize/diagnosis-template.md</Path>` 写 `diagnosis.md`：记录错误 signature、现场、假设、证据、确认/排除根因、已尝试动作和建议修复。

只读、scope 内、不会写 cache/产生业务负载的诊断可继续并写 journal。任何修复 mutation、命令、write set、权限或事故半径变化都把 phase 设为 diagnosing，返回 `<Path>{roots.workflows}/ops/P-plan-and-approve/P-plan-and-approve.md</Path>` 创建新计划并批量批准。不得临场修改旧计划。

### 4. 回滚

仅当 rollback 已在当前批准 batch 内，或 operation rollback mode=automatic 且触发条件确定命中时执行。使用 `<Path>{roots.workflows}/ops/E-execute-and-stabilize/rollback-template.md</Path>` 记录 checkpoint、反向依赖顺序、数据/流量影响和恢复后状态；数据恢复仍需计划中的独立授权。未批准恢复动作返回 P，不以紧急为由扩大权限。

### 5. 验证与完成

所有 mutation attempt 完成后设置 phase=stabilizing，从 `<Path>{roots.workflows}/ops/E-execute-and-stabilize/verification-state-template.json</Path>` 生成 `verification-state.json` v1，并按 `<Path>{roots.workflows}/ops/common/schemas/verification-state.schema.json</Path>` 校验。它穷尽 identity results、required Gates、目标端构件摘要、服务状态/restart/runtime digest、逐 probe 预期 HTTP/业务码/认证要求、收敛组、稳定窗口、数据保护、恢复兼容、previous release、rollback material、保留候选和风险。verification-only 还证明 snapshot scope、target identity、关键关联、容量和零 mutation。

使用 `<Path>{roots.workflows}/ops/E-execute-and-stabilize/verification-template.md</Path>` 投影 `verification.md`，并从 `<Path>{roots.workflows}/ops/E-execute-and-stabilize/handoff-template.md</Path>` 生成无密钥 `HANDOFF.md`；Markdown 不得成为结构化状态的替代事实源。production data mutation 的 protection 必须 verified，任何 waiver 都失败；local waiver 必须与 plan 的精确授权和完整 preflight 一致。

全部 required Gate/verification 通过且 HANDOFF 无密钥时，将 attempt 标记 succeeded，按实际结果设置 outcome=succeeded 或 rolled_back；用户明确终止、证明没有未受控 mutation并接受残余风险时可 abandoned。随后原子设置 change_status=completed、phase=ready_to_archive、completed_at，清空 blockers/current_work，运行 `--stage pre-close` 并返回 A。

## 完成标准

- 每次执行、诊断、回滚或只读验证都有独立 attempt，旧 attempt 未覆盖；
- 新 attempt 为 v2，journal 每行符合 journal-event v1，verification state/HANDOFF 与 attempt locator 一致；
- 每个 mutation 有有效批次批准、前后条件和脱敏 evidence；
- Gate 失败后未推进后续 operation，production 数据保护不存在 waiver；
- 失败后停止，新增修复动作通过 P 重新规划而非临场执行；
- 最终验证覆盖所有 required 条件和稳定窗口；
- 未知或失败状态没有 completed；
- completed change 通过 pre-close validator并路由 A。

## 子文件引用

- Attempt 摘要：`<Path>{roots.workflows}/ops/E-execute-and-stabilize/attempt-summary-template.md</Path>`
- 失败诊断：`<Path>{roots.workflows}/ops/E-execute-and-stabilize/diagnosis-template.md</Path>`
- 验证矩阵：`<Path>{roots.workflows}/ops/E-execute-and-stabilize/verification-template.md</Path>`
- 回滚记录：`<Path>{roots.workflows}/ops/E-execute-and-stabilize/rollback-template.md</Path>`
- 结构化验证与交接：`<Path>{roots.workflows}/ops/E-execute-and-stabilize/verification-state-template.json</Path>`、`<Path>{roots.workflows}/ops/E-execute-and-stabilize/handoff-template.md</Path>`
- Attempt、journal 与验证 schema：`<Path>{roots.workflows}/ops/common/schemas/attempt.schema.json</Path>`、`<Path>{roots.workflows}/ops/common/schemas/journal-event.schema.json</Path>`、`<Path>{roots.workflows}/ops/common/schemas/verification-state.schema.json</Path>`
