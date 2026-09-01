# 复盘、知识提升与归档

## RETROSPECTIVE 门

A 必须枚举全部 ATTEMPT-NNN，并在 RETROSPECTIVE 中覆盖时间线、target identity/Gate 漂移、错误 signature、根因 confidence、排除假设、计划偏差、尝试动作、数据保护、保留/恢复资产、最终有效或恢复序列、验证、残余风险和教训。缺 attempt、诊断、verification state 或无密钥 HANDOFF 时阻塞，不用摘要补造。

旧 plan v2/attempt v1 原样保留为 legacy evidence，不迁移或补字段。若最终证据只有 attempt v1，A 返回 E 创建 verification-only attempt v2；其 target profile binding、typed journal、verification-state v1 和 HANDOFF 通过后，才能 pre-close/pre-archive。旧摘要本身不得提升为现役 SOP。

## 知识分类

- `project-context`：仍有效的项目配置、拓扑、依赖、owner、前置条件；
- `project-adr`：已实施验证且存在实际权衡的项目决定；
- `project-runbook`：成功执行和验证的 SOP、rollback 与 troubleshooting；
- `global-*`：有明确跨项目/系统适用范围的宿主机、环境、runtime 或平台知识；
- `archive-only`：瞬时快照、原始日志、失败步骤、一次性命令、未确认推断。

失败步骤不得进入现役 deployment SOP。已确认 failure signature、根因和修复可以进入 troubleshooting；rolled_back 不把失败方案标为成功；abandoned 只提升已确认约束和注意事项。瞬时 verification state、service id、restart count 和临时 Gate 输出全部 archive-only；可提升的是带适用边界、last_verified 与 evidence change 的稳定结论。

## 合并

Runbook stable key 由 project、environment、deployment method 和 component 组成。相同 key 使用 create/merge/supersede，不简单追加。每个现役条目带 last_verified、evidence changes 和 supersedes。新旧事实冲突、删除现役步骤或弱化恢复能力时阻塞并让用户批量确认。

## 事务

先生成 staging 与 promotion manifest，计算摘要并 dry-run；用户确认后创建绑定摘要的 approval。关闭工具验证所有 source/target hash，备份既有目标，原子写永久知识、更新两级状态并移动到所属 archive；任一步失败按 rollback evidence 恢复。归档后只读。
