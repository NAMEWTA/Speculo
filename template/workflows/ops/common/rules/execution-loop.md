# 执行、诊断与验证循环

## Attempt 模型

E 使用连续 ATTEMPT-NNN 表示 `deploy | remediation | rollback | verification-only`。新 `attempt.json` 使用 schema v2，在开始时创建并可原子推进，terminal 后不可改写；`journal.jsonl` 始终 append-only，每行 sequence 连续且符合 journal-event v1。latest_attempt_id 只投影最近 attempt，不替代历史。

旧 plan v2 与 attempt v1 只读，不能追加、升级或作为当前 mutation/关闭的充分证据。需要 mutation 时由 P 生成 plan v3；不需 mutation但要关闭时，由 E 创建绑定当前 target profile 的 verification-only attempt v2。该 attempt 的 verification state 与 HANDOFF 通过前，pre-close/pre-archive 必须阻塞。

## 执行

除 verification-only 外，每次先重读 plan/approval、target profile、摘要、期限、source/target、identity assertions、路径、权限、容量、端口、Gate、data protection、preview 和 rollback material。在第一条 mutation 前重采集 actual identity；漂移即令 approval invalidated。

Gate 依赖通过后才能执行其约束 batch。每个 operation 先写 typed intent，再 apply，再写 result 并重读 postcondition。Gate failed/blocked 后立即停止新 operation、activation 和 cleanup，后续 Gate 只写 skipped；失败候选、previous release 和 rollback material继续保留。

## 诊断与重新规划

失败后保留现场并建立 hypothesis matrix。只读、明确 scope 内且不会写 cache、触发业务 mutation 或产生高负载的 probe 可在当前 attempt 继续。任何修复 mutation、不同 command/write set、权限或事故半径都返回 P；新计划必须引用该 attempt。

## 回滚

只有当前批准计划内的 rollback batch 或明确 automatic trigger 可以在 E 执行。其他恢复动作先由 P 规划并批量批准；数据恢复需要独立明确授权。回滚使用独立 attempt，按反向依赖执行，失败后不继续正向操作。

## 完成

E 为 terminal attempt 生成 verification-state v1，并以 Markdown verification 与无密钥 HANDOFF 投影。结构化 state 必须覆盖 identity、required Gates、不可变构件、service/restart/runtime digest、逐 probe HTTP/业务码/认证要求、稳定窗口、收敛组、数据保护、recovery、retained artifacts 和风险。

production 数据 mutation 只接受 verified protection，不接受 waiver。local waiver 必须与 plan 的精确用户决定和完整 preflight 一致。required verification、连续成功窗口、恢复资产或已接受风险任一不满足时保持 active/blocked；inventory-only 用 verification-only attempt 证明目标身份、scope、关键关联、容量与零 mutation。
