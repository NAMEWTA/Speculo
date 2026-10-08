# 候选队列

输入明确 repo、检索范围与用户目标。先读 <Path>{roots.workflows}/specdev/T-triage/references/issue-pr-policy.md</Path>，只进行远程读取。返回候选编号、类型、作者关系、证据摘要、重复关系和建议次序，不创建 change。

默认查询 Issue。config.github.include_external_prs 为 true 或用户要求纳入时，额外读取 PR；队列中的外部作者排除 OWNER/MEMBER/COLLABORATOR。用户直接指定的 PR 不受该队列筛选限制。裸编号先查询真实对象类型，不能猜测 Issue/PR。

注明 query、时间、分页和覆盖范围；无法穷尽时明确不完整，不把“未查到”写成不存在。按影响、阻断程度与证据成熟度排序；尚未接受的候选不是开发 tracker。选择摄入后才进入 <Path>{roots.workflows}/specdev/T-triage/intake-protocol.md</Path>。
