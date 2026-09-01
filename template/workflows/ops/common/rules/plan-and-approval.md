# 计划与批准合同

## Ready 门

P 只有在 request 明确、快照新鲜度被接受、deployment model 与 target profile v1 无 blocking unknown、source revision/target fingerprint/profile digest 可重建、deployment root 和整体控制面身份已确认、健康与恢复可判定时生成 Ready plan。重新规划还必须绑定触发 attempt 和 diagnosis。

计划深度随事故半径增长：本地可丢弃环境可 lite；共享非生产默认 standard；生产、全局配置、数据、流量、权限、密钥或不可逆动作必须 deep。

## 结构化操作与版本

每个 plan-NNN.json 使用 schema v3，并绑定 target profile path/digest。它包含 required Gate DAG、batch `gate_ids`、`after_batches`、不可变 artifact requirements、逐项 verification contract、data protection、staging/activation/previous refs 和恢复策略。每个 operation 包含 id、batch、kind、target、cwd、preconditions、write set、external mutation、preview、apply、postconditions、rollback、risk、privilege 和 evidence。无法使用 typed adapter 时，以 custom-command 显示完整 shell、command、引用方式和风险。

plan-NNN 永不覆盖。修订版记录 supersedes_plan_path；由失败 attempt 触发时再记录 triggered_by_attempt，执行前按用户审核意见修订时允许后者为 null。修订版完整重述当前待执行状态；旧已执行 batch 只由 attempt evidence 表示，不能自动成为新 plan 的批准。旧 plan v2 只读且不可重新批准；继续 mutation 必须生成 v3，不能推导缺失的 identity、Gate 或数据保护结论。

## Gate、候选与数据保护

每个 required Gate 和 verification id 只有一个 owner。batch `gate_ids` 表示启动前置 Gate，可为空；Gate `after_batches` 表示生成 Gate 结论前必须完成的批次；两者与各自依赖合成的 DAG 必须可拓扑排序。不可变候选使用 SHA-256、image digest 或 provider immutable id；可变 tag 仅作显示。适用时计划包含授权 root 内独立 staging、目标端摘要重验、原子 activation、previous ref 和保留策略。

每个 data mutation 映射 data-protection 条目。production 不接受 waiver；local waiver 仅在用户对精确对象明确批准并记录 decision locator、exact scope、对象身份、零冲突 preflight 和 forward-only 恢复边界时有效。backup 不只证明存在，还要规划可读性、restore ref 与恢复验证。cleanup 使用独立 batch。

## 批量批准

P 一次展示 target/profile identity、完整待执行 batch、Gate/依赖、候选摘要、数据保护、差异、外部 mutation、全局环境 key/scope/source/impact/rollback、风险、验证、恢复、cleanup 和期限。用户可以一条回复批准多个 ids，不逐命令确认。approval 绑定 scope/project/change、plan SHA-256、source、target、batches、条件和期限，不保存密钥。

profile/计划内容、固定点、identity、权限、external mutation、数据保护或期限漂移时，不执行受影响 batch；保留旧工件，将 approval invalidated，并返回 I/P 生成新版本。用户最初要求部署不等于对后续修复、回滚、数据恢复、cleanup、归档或知识改写的授权。
