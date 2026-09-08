# 状态、持久化与恢复细则

创建、恢复、迁移、关闭或归档 change 时读取；普通路由只读激活合同。

## 持久化约定

`speculo init` 创建固定状态骨架：

- 全局状态：`<Path>{roots.state}/specdev/status.json</Path>`
- 活跃 change：`<Path>{roots.state}/specdev/changes/</Path>`
- 历史归档：`<Path>{roots.state}/specdev/archive/</Path>`

刷新时 CLI 依据 `<Path>{roots.workflows}/specdev/runtime-contract.json</Path>` 处理持久化数据：配置使用 baseline 三方合并，登记的状态 schema 使用显式 migrator，其他 runtime 文件按字节保留。只有字段删除或结构迁移时才在 `<Path>{roots.state}/back/</Path>` 写入 targeted backup；冲突在替换 active 安装前阻塞。`<Path>{roots.state}/back/</Path>`、`<Path>{roots.state}/install.json</Path>`、`<Path>{roots.state}/managed.json</Path>` 与 `<Path>{roots.state}/baselines/</Path>` 均不属于 SpecDev 写入 namespace。

初始化设置 work 首次运行时生成配置并创建空的永久 namespace：

- 全局配置：`<Path>{roots.state}/specdev/config.json</Path>`
- 追踪规则：`<Path>{roots.state}/specdev/.config/tracking.md</Path>`
- 领域布局：`<Path>{roots.state}/specdev/.config/domain-layout.md</Path>`
- 永久 ADR：`<Path>{roots.state}/specdev/adr/</Path>`
- 永久领域上下文：`<Path>{roots.state}/specdev/context/</Path>`
- 永久研究：`<Path>{roots.state}/specdev/research/</Path>`

初始化只保证永久目录存在，不写知识内容。只有 A-archive-and-consolidate 在 change 完成、实现证据验证、毕业评估和用户确认后，才能创建、合并或改写这些永久 namespace 中的内容；其他 Works 只读。

单个 change 可以包含：

- `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/diagnostics/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/design-tree.json</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/implementation-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/implementation-plan.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/investigation/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/investigation/comments/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/architecture-review.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/reviews/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/comparison/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/final/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/questionnaires/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/learning/index.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/learning/{number}_{topic}.md</Path>`



## 状态字段

`<Path>{roots.state}/specdev/status.json</Path>` 使用全局 schema v5；Spec/Ticket/Tickets Map 保留各自 schema v3；新 Ticket/Map 使用附加 plan_contract_version: 1，config 使用 schema v5，Goal Plan 使用 schema v6，Implementation Map/Plan 使用 schema v1，`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 使用 schema v6：

- `schema_version`（数字）：全局状态 schema 版本，固定为 `5`。
- `workflow`（字符串）：workflow 标识，固定为 `"specdev"`。
- `active`（对象数组）：当前活跃 change 的严格索引；每项只能包含 `change`，格式 `"YYYY-MM-DD-<kebab-topic>"`。
- `archived`（去重字符串数组）：已归档 change 名称。详细归档时间、路径和 promotion 摘要只存在于 `<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/.status.json</Path>`。

`active[].change` 必须唯一，且不得同时出现在 `archived`。`current_work`、`works_run` 和 `claimed_investigations` 只存在于 change 自有 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`：开始 Work 时设置 `current_work`；暂停或可恢复阻塞时保留；成功完成时加入 `works_run` 并清空；取消时清空但不加入。逐次时间、结果和审计证据由 change 自有状态、Work 主产物、Evidence 或 LOG 承载，不写入全局索引。

`<Path>{roots.state}/specdev/config.json</Path>` 的 `execution.max_implementation_agents`、`max_integration_attempts` 和 planning UI 设计候选字段均为可配置正整数；候选默认值与上限必须落在 2-4 且默认值不大于上限。仅 implementation subagent 受前者约束且不含 Lead，current workspace 仍保持单 writer 串行安全不变量；只读 review/research/test-observation agent 不设 SpecDev 数字上限。

`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `worktrees` 保存 Ticket 级 `base_sha`、父分支、workspace/implementation/integration owner、workspace locator、implementation/source checkpoint、适用 candidate/result SHA、验证、E2E disposition 与生命周期状态。current 记录使用 `workspace_ref=current` 和 direct-parent；required 记录使用 source/parent-candidate。每个实现 Ticket 都有一条记录；父分支只有在对应策略的验证通过后推进。`removed` 是 required 集成后来源 branch/worktree 完成清理的终态，必须保留全部集成与 E2E 证据。

领域状态枚举：

- change：`active | blocked | completed | archived`
- Ticket：`draft | ready | in_progress | blocked | review | done | deviated | cancelled`
- Investigation status：`open | closed`
- Investigation resolution：`answered | out-of-scope | superseded | cancelled | null`
- Planning Depth：`lite | standard | deep`
- Worktree：`planned | active | review | integrating | integrated | removed | blocked`



## 路径分配

1. workflow 运行状态写入 `<Path>{roots.state}/specdev/</Path>`。
2. change 产物写入 `<Path>{roots.state}/specdev/changes/{change}/</Path>`。
3. 项目代码、测试和用户要求的项目文档写入项目路径；Evidence 仅保存项目相对指针。
4. 长期知识候选先在 change 内形成；只有 A 在完成证据、毕业评估和用户确认全部通过后，才提升到对应永久 namespace。


## 扩展工件与兼容

W 可写 `<Path>{roots.state}/specdev/changes/{change}/initiative.json</Path>`：它只拥有候选 change 边界与目标指针，不复制各 child 的状态。父 Goal 的 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 使用 goal-tickets-map 指针合同，权威仍是父 Implementation Map/Plan。旧 O restore key 不变；旧票继续可读，未完成旧票在新执行前由 Lead 显式补全调用绑定、交付约束并重新过门禁，不自动迁移、重置状态或改写他人事务。
