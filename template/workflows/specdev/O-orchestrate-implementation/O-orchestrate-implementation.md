---
id: specdev/orchestrate-implementation
type: workflow-entry
workflow: specdev
name: 跨 change Goal（兼容入口）
description: 兼容已有 O 调用和父实现 change 恢复，转发到统一 Goal；新规划使用 P-goal-plan，不在此另建执行流程。
keywords: [O, 父change, 兼容, 恢复]
---

# 跨 change Goal 兼容入口

> 激活后读取 `<Path>{roots.workflows}/specdev/README.md</Path>`。

## 读取范围

读取 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`，只定位指定父状态与入口 map。随后转发 `<Path>{roots.workflows}/specdev/P-goal-plan/P-goal-plan.md</Path>`；只展开当前模式。

- 创建：至少两个用户指定且具有 Ready Spec、Ready Tickets 的成员。仅规划转发 `plan`；明确要求实施才转发 `run`。
- 恢复：已有 Implementation Map / Implementation Plan 转发 `resume`，保留原 `specdev/orchestrate-implementation` 恢复键、成员归属和 Evidence。
- 保持 `lead-directed`、既有 `implementation_agent_limit`、serialization 与 I-implement 集成门禁；不放宽 Git、远程或永久知识权限。
- 输入不齐时不创建半成品父状态；运行中的局部归属冲突仅阻塞相关部分。

唯一跨 change 过程为 `<Path>{roots.workflows}/specdev/P-goal-plan/references/multi-change-plan.md</Path>`。旧模板路径保留兼容，O 不持有第二套流程。
