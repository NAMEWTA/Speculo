---
id: specdev/archive-and-consolidate
type: workflow-entry
workflow: specdev
name: 归档与沉淀
description: 在验证完成和用户授权后归档 change，并以证据判断哪些架构决策、术语和研究应创建、合并、替代、废弃或不提升。
keywords: [归档, consolidation, ADR, context, research, knowledge]
---

# 归档与沉淀

归档不是把整个 change 无差别复制到永久知识库。永久知识只保存“当前仍真实、超出单个 change 仍有用、已有实现证据”的结论，同时保留历史和 supersedes 关系。

## 输入

- change 根：`<Path>{roots.state}/specdev/changes/{change}/</Path>`
- change 状态：`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`
- 全局状态：`<Path>{roots.state}/specdev/status.json</Path>`
- 当前架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- 当前领域上下文：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- 当前设计日志：`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- 当前 Spec：`<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- 当前 Tickets Map：`<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- 当前 Goal Plan：`<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- Evidence：`<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`
- 永久架构决策：`<Path>{roots.state}/specdev/adr/</Path>`
- 永久领域上下文：`<Path>{roots.state}/specdev/context/</Path>`
- 永久研究：`<Path>{roots.state}/specdev/research/</Path>`

## 流程

### 1. 完成检查

加载 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/archive-checklist.md</Path>`，检查 Ticket、Evidence、Spec 合同、Goal Gate、偏差、迁移、状态和用户授权。

未完成、验证失败、存在未批准 deviation 或用户未授权时停止，不得标 completed 或 archived。

### 2. 冻结归档快照

记录：

- 归档时间；
- 最终基线、提交或 PR；
- 全局验证摘要；
- 已知残余风险；
- 被批准的 cancelled/deferred 条目；
- 归档目标 `<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/</Path>`。

归档前不得删除设计日志、Evidence 或被替代 ADR。

### 3. 评估长期知识

加载 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/knowledge-promotion-rules.md</Path>`，逐条评估当前 change 的架构决策、领域术语和研究结论。

每条结论执行：`create | update | merge | supersede | deprecate | skip`。无法判断当前真相时不提升，创建治理问题或新 change。

### 4. 提升与冲突处理

- 架构决策提升到 `<Path>{roots.state}/specdev/adr/</Path>`；
- 领域术语提升到 `<Path>{roots.state}/specdev/context/</Path>`；
- 经实现验证、长期有效的研究提升到 `<Path>{roots.state}/specdev/research/</Path>`；
- 冲突 ADR 建立 supersedes 双向引用，不静默覆盖；
- 历史结论保留状态和来源，不通过删除历史制造一致性。

### 5. 移动归档并更新状态

将 `<Path>{roots.state}/specdev/changes/{change}/</Path>` 移动到 `<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/</Path>`。

更新 `<Path>{roots.state}/specdev/status.json</Path>`：从 active 移除，追加 completed/archived 记录；归档内 `<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/.status.json</Path>` 写入完成时间、归档路径和 promotion 摘要。

任何删除、移动或 Git 副作用均需用户授权。

### 6. 校验与汇报

运行包级和归档链接检查，确认：

- 归档路径存在；
- 全局状态与归档状态一致；
- 永久知识引用有效；
- supersedes 链无断裂；
- 无敏感信息进入永久知识。

输出 promotion report：每条候选知识、执行动作、目标路径、证据和未提升原因。

## 禁止

- 未完成或验证失败的 change 标 completed；
- 把临时实现细节、一次性命令或未经验证假设提升为永久知识；
- 静默覆盖冲突 ADR；
- 删除历史以制造一致性；
- 在归档或永久知识中写入秘密、令牌、敏感日志或个人隐私；
- 未经用户授权移动、删除、提交或推送。

## 完成标准

- `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/archive-checklist.md</Path>` 全部适用项通过；
- change 已移动到 `<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/</Path>`；
- 全局和归档状态一致；
- 长期知识已按证据处理；
- promotion report 已向用户汇报；
- 无未批准副作用。

## 子文件引用

- 归档检查：`<Path>{roots.workflows}/specdev/A-archive-and-consolidate/archive-checklist.md</Path>`
- 知识提升规则：`<Path>{roots.workflows}/specdev/A-archive-and-consolidate/knowledge-promotion-rules.md</Path>`
