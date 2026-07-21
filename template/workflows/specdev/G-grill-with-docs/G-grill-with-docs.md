---
id: specdev/grill-with-docs
type: workflow-entry
workflow: specdev
name: 设计访谈（带文档）
description: 无情访谈打磨设计，同时持续产出 ADR.md、LOG.md 和 CONTEXT.md 三个领域文档。在设计讨论中捕获术语定义、记录架构决策、保存完整设计轨迹。
keywords: [设计, 访谈, 领域建模, ADR, 决策记录, 词汇表, 设计轨迹]
---

# 设计访谈（带文档）

组合 work——grilling 访谈技术 + domain-modeling 领域建模规程，在无情盘问中打磨设计，同时持续写入 ADR.md、LOG.md 和 CONTEXT.md 三个领域文档。访谈负责深度提问与共识达成，领域建模负责在决策结晶的瞬间捕获术语、记录轨迹、筛选架构决策。

产物统一写入 `<Path>{roots.state}/specdev/changes/{change}/</Path>`，其中 `{change}` 为 `<YYYY-MM-DD>-<topic>` 格式。

## 流程

### 1. 启动变更

创建 `<Path>{roots.state}/specdev/changes/{change}/</Path>` 目录（`{change}` 为 `<YYYY-MM-DD>-<topic>` 格式），初始化三个空文件模板：

- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` — 架构决策记录，仅含 `# 架构决策记录` 标题
- `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` — 设计决策日志，含 `# 设计决策日志` 标题及维护规则说明
- `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` — 领域词汇表，含 `# {主题} 领域词汇表` 标题及一两句描述

**完成标准**：变更目录 `<YYYY-MM-DD>-<topic>` 已创建，初始 ADR.md/LOG.md/CONTEXT.md 已就位。

### 2. 访谈

委托给 `<Path>{roots.workflows}/specdev/G-grill-with-docs/grilling-protocol.md</Path>`。一次一问，沿设计树逐分支推进，在用户确认共识之前不执行方案。访谈过程中随时更新 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`，记录每个确认、延后、替代的结论。

若访谈中涉及不熟悉的外部技术、第三方 API、或需要查阅官方文档才能回答的设计问题，暂停访谈，调用 `<Path>{roots.workflows}/specdev/common/research/SKILL.md</Path>` 完成探查后再继续。

**完成标准**：访谈完成——一次一问，决策树已遍历，共识已达成。LOG.md 已同步所有访谈结论。

### 3. 捕获文档

委托给 `<Path>{roots.workflows}/specdev/G-grill-with-docs/domain-modeling-rules.md</Path>`。对照词汇表挑战术语、精炼模糊语言、讨论具体场景、与代码交叉引用。

- `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` 同步所有结论
- `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` 精炼术语定义
- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 仅追加满足三条件的架构决策（参见 `<Path>{roots.workflows}/specdev/G-grill-with-docs/adr-format.md</Path>`）

**完成标准**：LOG.md 已同步所有结论；CONTEXT.md 已精炼术语；ADR.md 已追加满足三条件的架构决策。

### 4. 停止

设计阶段完成。向用户汇报产物摘要（LOG.md / CONTEXT.md / ADR.md 的条目数量和关键结论），明确询问是否进入 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` 实现阶段。

不得在用户确认前自动读取实现源码或执行代码变更。

## 子文件引用

本入口及以下子文件按需加载：

| 文件 | 触发条件 |
|------|----------|
| `<Path>{roots.workflows}/specdev/G-grill-with-docs/grilling-protocol.md</Path>` | 进入步骤 2「访谈」时加载——包含完整访谈协议，一次一问、推荐答案、决策树遍历、LOG.md 同步规则 |
| `<Path>{roots.workflows}/specdev/G-grill-with-docs/domain-modeling-rules.md</Path>` | 进入步骤 3「捕获文档」时加载——包含三文件分工、对照词汇表挑战、精炼与交叉引用规程、同步规则 |
| `<Path>{roots.workflows}/specdev/G-grill-with-docs/adr-format.md</Path>` | 需要创建或修改 ADR 条目时加载——单一 ADR.md 文件格式、编号规则、三条件检查、可选元素 |
| `<Path>{roots.workflows}/specdev/G-grill-with-docs/context-format.md</Path>` | 需要增删改术语时加载——CONTEXT.md 结构、定义规则、增删改操作说明 |
| `<Path>{roots.workflows}/specdev/G-grill-with-docs/log-format.md</Path>` | 需要记录设计结论时加载——LOG.md 格式、状态标记、编号规则、追加与修订规程 |
