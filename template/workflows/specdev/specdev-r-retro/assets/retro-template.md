---
schema_version: 1
artifact: retrospective
change: <YYYY-MM-DD-topic>
id: RETRO-001
status: completed
outcome: findings
sources: []
updated_at: <ISO-8601>
---

# 开发复盘

## Scope
本次活动、会话、change 与来源 locator。扩大范围必须有来源。

## Evidence
原始现象、证据与未知项；已归档来源只引用不修改。

## Findings
逐项：ID、根因/假设、影响和频率、已有约束是否失效/未接入、remediation_axis、owner、disposition、合并/重复关系。没有发现明确写 none；不能强造 Issue。

## Acceptance
每项建议的正反样例、验证命令/方法与完成条件；区分机械检查和人的判断。

## Routes
下一入口、所需授权、未完成项及恢复条件；无后续动作注明原因。

## 预防措施的验证

对每个建议指出缺规则/未接入/判断错误/测试失效/环境变化，给出实际 owner、修改位置、正向验收、目标反例和新增成本。未实施建议不写成修复；无发现和证据不足仍按原 outcome 报告。
