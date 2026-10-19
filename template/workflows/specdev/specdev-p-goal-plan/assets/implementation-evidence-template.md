# Implementation Orchestration Evidence

父 Lead 在实际核验后写入 <Path>{roots.state}/specdev/changes/{change}/evidence/implementation-orchestration.md</Path>。空表和待执行步骤不是通过证据；保留真实失败、未运行项与恢复位置，不预填 passed/verified。

## 1. Parent Plan and Final Revision

记录父 Map revision、Plan source_map_revision、唯一 Lead、实际授权来源及最终交付范围。

## 2. Member and Ticket Completion

| Member | README Outcome 来源 | 原 Ticket/Evidence | 实际检查与缺口 |
|---|---|---|---|

这里只保存本次核验与原证据引用，不形成可写的子票状态镜像。

## 3. Dependency and Serialization Audit

记录跨成员依赖产物、实际执行顺序和共享资源 owner；取消不作为成功依赖，未知 writer 不视为释放。

## 4. Repository Integration Audit

列出各成员原 Execution Context、冻结 commit/工作副本输入与实际 Git 动作。无合并要求时以成员原工作区与组合合同验收，不虚构父结果提交。

## 5. Aggregate Verification

| 验收/Gate | 固定输入和环境 | 实际命令/方法 | 退出码/观察 | 原始输出 | 结论 |
|---|---|---|---|---|---|

适用 E2E 由 Lead 执行，not-required 说明真实理由。按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/review-evidence.md</Path> 在本文件实际生成 Independent Review、固定输入、原始双轴输出和 Lead 回执；实现者不自审，结构通过不认证派遣执行。

## 6. Contract, Drift and Deviation Audit

核对各成员 Spec、共享合同、UI DESIGN（适用时）、输入摘要及原 review；记录漂移、已补审范围、偏差处置和仍未验证项。

## 7. Residual Risk and Boundary

记录实际交付、残余风险、停止/恢复条件、未决外部动作与原 owner。完成按 <Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>，不从本地验收推导 push、PR、merge、release 或归档已经发生。
