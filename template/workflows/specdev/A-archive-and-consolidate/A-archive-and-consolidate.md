---
id: specdev/archive-and-consolidate
type: workflow-entry
workflow: specdev
name: 归档与沉淀
description: 双模式沉淀 Work——归档已验证完成的 change 并提升其知识，或在没有可归档 change 时以当前代码为基本事实深度访谈用户，把经验证的架构决策与领域术语提升为永久知识。
keywords: [归档, consolidation, ADR, context, research, knowledge, 代码库访谈]
---

# 归档与沉淀

本 Work 的唯一目的：让**永久知识**只保存“当前仍真实、超出单个 change 仍有用、已有实现证据”的结论，同时保留历史与 supersedes 关系。

它有两个入口模式，最终收束到同一条“评估 → 提升 → 归档”尾部：

- **archive 模式**：存在已验证完成、用户授权归档的 change 时，归档该 change 并提升其内部产物中的知识。
- **consolidate-from-code 模式**：没有可归档 change，或用户明确要求“基于当前代码沉淀知识”时，以当前代码库为基本事实，一次一问深度访谈用户，把结论沉淀为永久领域上下文与架构决策。**这次访谈运行本身也是一个 change**：所有访谈轨迹、LOG、CONTEXT、ADR 先落在该 change 内，经代码验证后再提升到永久 store，最后归档该 change。

归档不是把整个 change 无差别复制到永久知识库；访谈也不是把用户随口结论直接写成永久 ADR。两条路径都必须先有代码或实现证据，再提升。

## 输入

### 共同输入

- 全局状态：`<Path>{roots.state}/specdev/status.json</Path>`
- 全局配置：`<Path>{roots.state}/specdev/config.json</Path>`
- 永久架构决策：`<Path>{roots.state}/specdev/adr/</Path>`
- 永久领域上下文：`<Path>{roots.state}/specdev/context/</Path>`
- 永久研究：`<Path>{roots.state}/specdev/research/</Path>`
- 工件职责规则：`<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>`

### archive 模式输入

- change 根：`<Path>{roots.state}/specdev/changes/{change}/</Path>`
- change 状态：`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`
- 该 change 内的实现产物（存在即读，不存在静默跳过）：
  - `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
  - `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
  - `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
  - `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
  - `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
  - `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
  - `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`

### consolidate-from-code 模式输入

- 项目代码、配置、接口、schema、测试与经验证文档——这是本模式的**基本事实源**。
- 可选参考：与访谈主题相关的历史 change（`<Path>{roots.state}/specdev/changes/</Path>` 或 `<Path>{roots.state}/specdev/archive/</Path>`）。存在则读取以避免重复结论；不存在时直接以代码为事实访谈，不把“无相关 change”当作缺陷。

不存在的可选输入静默跳过，不把缺失文件伪装成已确认事实。

## 流程

### 0. 判定模式

读取 `<Path>{roots.state}/specdev/status.json</Path>` 并判定：

- 用户或调用方**显式指定模式**时以其为准。
- 存在唯一 `change_status: completed` 且已获授权归档的 change → **archive 模式**，`{change}` 即该 change。
- 没有可归档 change → **consolidate-from-code 模式**。
- 同时存在多个可归档候选，或既有可归档 change 又收到“基于代码沉淀”请求 → 停止并请用户消歧，不猜测。

判定结果记入本次运行的状态摘要。archive 模式进入 §1a；consolidate-from-code 模式进入 §1b。

---

### 1a. archive 模式 · 完成检查

加载 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/archive-checklist.md</Path>`，检查 Ticket、Evidence、Spec 合同、Goal Gate、偏差、迁移、状态和用户授权。

未完成、验证失败、存在未批准 deviation 或用户未授权时停止，不得标 completed 或 archived。

### 2a. archive 模式 · 冻结归档快照

记录：

- 归档时间；
- 最终基线、提交或 PR；
- 全局验证摘要；
- 已知残余风险；
- 被批准的 cancelled/deferred 条目；
- 归档目标 `<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/</Path>`。

归档前不得删除设计日志、Evidence 或被替代 ADR。完成后进入 §3（共同的知识评估）。

---

### 1b. consolidate-from-code 模式 · 建立访谈 change

创建承载本次沉淀运行的 change：`<Path>{roots.state}/specdev/changes/{change}/</Path>`，`{change}` 使用 `<YYYY-MM-DD>-<topic>`（topic 为访谈主题，如 `consolidate-auth-domain`）。

首次创建：

- 生命周期状态：`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`，使用 `<Path>{roots.workflows}/specdev/I-init-setup/change-status-template.json</Path>`；
- 设计日志：`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`；
- 领域上下文：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`；
- 架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`。

在 `<Path>{roots.state}/specdev/status.json</Path>` 的 `active` 中登记该 change并将 `current_work` 设为 `specdev/archive-and-consolidate`；已有其他非空 `current_work` 时先停止并完成显式 handoff。恢复已有访谈 change 时先读取三份文档与最后一条 LOG，不重复询问已确认结论。

### 2b. consolidate-from-code 模式 · 代码为事实的深度访谈

加载 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/consolidation-interview.md</Path>`，以当前代码库为基本事实一次一问访谈。每轮：先只读探索相关代码/配置/测试并陈述证据 → 提出唯一关键问题 → 给出选项、权衡与推荐 → 等待用户 confirmed/deferred/rejected → 立即把结果追加到 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`。

按固定顺序同步 change 内文档：先写 LOG，再把当前仍真实的术语/不变量/代码映射写入 `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`，最后把满足条件的长期架构决策写入 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`。历史轨迹不进 CONTEXT，未确认选项不写成已接受 ADR。

访谈收束后进入 §3（共同的知识评估）。此时该 change 视为“已完成访谈、可提升与归档”。

---

### 3. 评估长期知识（共同）

加载 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/knowledge-promotion-rules.md</Path>`，逐条评估 change 内（archive 模式来自实现产物，consolidate-from-code 模式来自访谈结论）的架构决策、领域术语和研究结论。

每条结论执行：`create | update | merge | supersede | deprecate | skip`。无法判断当前真相时不提升，创建治理问题或新 change。consolidate-from-code 模式下，未获代码或实际行为验证的结论一律 `skip`，只留在 change 内。

### 4. 提升与冲突处理（共同）

- 架构决策提升到 `<Path>{roots.state}/specdev/adr/</Path>`；
- 领域术语提升到 `<Path>{roots.state}/specdev/context/</Path>`；
- 经实现验证、长期有效的研究提升到 `<Path>{roots.state}/specdev/research/</Path>`；
- 冲突 ADR 建立 supersedes 双向引用，不静默覆盖；
- 历史结论保留状态和来源，不通过删除历史制造一致性。

### 5. 移动归档并更新状态（共同）

将 `<Path>{roots.state}/specdev/changes/{change}/</Path>` 移动到 `<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/</Path>`。

更新 `<Path>{roots.state}/specdev/status.json</Path>`：从 `active` 移除并将 change 名称去重追加到 `archived`；归档内 `<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/.status.json</Path>` 写入完成时间、归档路径和 promotion 摘要。全局索引不复制 Work、时间或路径明细。

任何删除、移动或 Git 副作用均需用户授权。

### 6. 校验与汇报（共同）

运行包级和归档链接检查，确认：

- 归档路径存在；
- 全局状态与归档状态一致；
- 永久知识引用有效；
- supersedes 链无断裂；
- 无敏感信息进入永久知识。

输出 promotion report：本次模式、每条候选知识、执行动作、目标路径、证据和未提升原因。

## 禁止

- 未完成或验证失败的 change 标 completed；
- 把临时实现细节、一次性命令或未经验证假设提升为永久知识；
- consolidate-from-code 模式下把用户未经代码验证的结论直接写成永久 ADR/context；
- 静默覆盖冲突 ADR；
- 删除历史以制造一致性；
- 在归档或永久知识中写入秘密、令牌、敏感日志或个人隐私；
- 未经用户授权移动、删除、提交或推送。

## 完成标准

- 模式已明确判定；
- archive 模式：`<Path>{roots.workflows}/specdev/A-archive-and-consolidate/archive-checklist.md</Path>` 全部适用项通过；
- consolidate-from-code 模式：访谈决策树关键分支已覆盖，LOG/CONTEXT/ADR 与代码事实一致；
- change 已移动到 `<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/</Path>`；
- 全局和归档状态一致；
- 长期知识已按证据处理，未验证结论未被提升；
- promotion report 已向用户汇报；
- 无未批准副作用。

## 子文件引用

- 归档检查：`<Path>{roots.workflows}/specdev/A-archive-and-consolidate/archive-checklist.md</Path>`
- 知识提升规则：`<Path>{roots.workflows}/specdev/A-archive-and-consolidate/knowledge-promotion-rules.md</Path>`
- 代码库沉淀访谈协议：`<Path>{roots.workflows}/specdev/A-archive-and-consolidate/consolidation-interview.md</Path>`
