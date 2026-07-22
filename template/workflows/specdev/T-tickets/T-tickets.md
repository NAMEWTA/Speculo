---
id: specdev/tickets
type: workflow-entry
workflow: specdev
name: 拆分 Tickets
description: 将 spec 或计划拆分为一组曳光弹式垂直切片 tickets，每个声明阻塞边，持久化到变更目录。支持宽重构的扩展-收缩排序。
keywords: [tickets, 拆分, 任务, 垂直切片, 阻塞, 曳光弹]
---

# 拆分 Tickets

将 plan、spec 或对话拆分为一组 **tickets** —— 曳光弹式垂直切片，每个 ticket 声明**阻塞**它的那些 tickets。

## 流程

### 1. 收集上下文

基于对话上下文中已有的内容进行工作。如果用户将某个引用（spec 路径或其他标识）作为参数传入，拉取它并读取其完整内容。

主要输入来源：
- 如果已有 spec，读取 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` —— 这是 ticket 拆分的首要依据。
- 读取 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 了解本 change 的架构决策——ticket 不应与已做出的决策冲突。
- 读取 `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` 了解本 change 的领域词汇表。
- 读取 `<Path>{roots.state}/specdev/adr/</Path>` —— 已确认并提升到永久的架构决策，始终反映项目当前架构现状。
- 读取 `<Path>{roots.state}/specdev/context/</Path>` —— 已确认并提升到永久的领域词汇表，始终反映项目当前领域术语现状。

如果尚未有 spec，可以基于对话中的计划或待办列表进行拆分，但优先建议用户先运行 `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>` 产出 spec 以获得更精确的拆分。

**完成标准**：上下文（spec、对话、代码库）已收集，所有必要输入源已读取。

### 2. 探索代码库

如果尚未探索代码库，进行探索以了解代码的当前状态。Ticket 标题和描述应使用项目的领域词汇表，并尊重所涉及区域的 ADR。

寻找预重构（prefactor）的机会，使实现更简单。"让变更变容易，然后做容易的变更。"

具体做法：
- 识别即将被修改的模块——它们的接口是否清晰？依赖是否合理？
- 如果某个模块的当前结构会使后续实现变得复杂，先提出一个重构 ticket，放在功能 tickets 之前。
- 预重构必须独立有价值——不是为了"更干净"而重构，而是为了"让后续变更更安全/更简单"。

若探索中遇到不熟悉的模块、外部依赖或第三方库——其接口设计意图和行为特征尚不明确——调用 `<Path>{roots.workflows}/specdev/common/research/SKILL.md</Path>` 完成探查后再继续识别预重构机会。

**完成标准**：代码库已探索，预重构机会已识别，领域词汇表和 ADR 已纳入考量。

### 3. 草拟垂直切片

将工作拆分为**曳光弹** tickets。每个切片横向切穿每一层（schema、API、UI、测试），是一条窄但**完整**的路径——是垂直切片，不是某一层的水平切片。

垂直切片规则：
- 一个完成的切片可以独立演示或验证——用户可以感知到它交付的行为
- 每个切片的大小适配单个全新上下文窗口——一个 agent 会话可以在不间断的情况下完成它
- 任何预重构应最先完成——它们解除后续 tickets 的阻塞

为每个 ticket 标注其**阻塞边** —— 即必须在它开始之前完成的其他 tickets。没有阻塞边的 ticket 可以立即开始。

**宽重构是垂直切片的例外。** **宽重构**是指一个机械性变更 —— 重命名字段、修改共享符号的类型 —— 其**影响范围**辐射整个代码库，因此单次编辑会破坏数千个调用点，任何垂直切片都无法以绿色状态落地。不要强行将其塞入曳光弹；应将其排序为**扩展-收缩**序列：

1. **扩展**：在旧形式旁边添加新形式，使一切不中断。旧代码仍然工作，新代码可用但尚未被调用。
2. **分批迁移调用点**：按影响范围分批（按包、按目录），每批是一个由扩展阶段阻塞的独立 ticket。保持 CI 逐批绿色，因为旧形式仍然存在。
3. **收缩**：当没有调用方残留时删除旧形式，由一个由所有迁移批次阻塞的 ticket 负责。

当连批次本身都无法独立保持绿色时，保持排序不变，但让它们共享一个集成分支，所有批次共同阻塞一个最终的集成验证 ticket —— 绿色仅在该处得到承诺。

**完成标准**：曳光弹式垂直切片已草拟，每个 ticket 的阻塞边已标注。

### 4. 与用户核对

以编号列表形式呈现提议的拆分方案。对于每个 ticket，展示：

- **标题**：简短的描述性名称
- **被阻塞于**：必须首先完成的其他 tickets（如有），或"无 —— 可立即开始"
- **它交付什么**：此 ticket 使哪些端到端行为可用，从用户视角描述

询问用户：

- 粒度是否合适？（太粗 —— 一个 ticket 内塞了太多决策，难以在一个会话内完成；太细 —— ticket 之间没有实质性行为差异）
- 阻塞边是否正确 —— 每个 ticket 是否只依赖于真正阻碍它的 tickets？是否有不必要的阻塞关系？
- 是否有 tickets 应合并或进一步拆分？

迭代直到用户批准拆分方案。每次修改后重新展示完整列表。

**完成标准**：用户已确认粒度、阻塞边与合并/拆分方案。批准后，tickets 将写入 `ticket/` 目录（一个 ticket 一个独立文件，命名为 `NN-<name>.md`），并生成 `tickets-map.md` 作为总体地图和执行清单。

### 5. 发布

将已批准的 tickets 写入变更目录，**每个 ticket 一个独立文件**，并生成总体地图文件。按以下三步执行：

**5a. 创建 ticket 目录**

创建 `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>` 目录。

**5b. 写入单个 ticket 文件**

按依赖顺序（无阻塞者在前，被阻塞者在后），为每个 ticket 创建独立文件 `<Path>{roots.state}/specdev/changes/{change}/ticket/NN-<ticket-name>.md</Path>`。`NN` 为 ticket 编号（两位零填充阿拉伯数字：`01`, `02`, ..., `10`, ...），代表执行顺序。文件名与编号均不含 `#` 字符，避免 Markdown 链接被编码为 `%23`。

每个 ticket 文件按以下模板填写：

```markdown
# Ticket NN: <标题>

- **被阻塞于：** `./ticket/NN-<name>.md`, `./ticket/NN-<name>.md`（相对路径，或多个用逗号分隔。无阻塞则写"无 —— 可立即开始"。查看被引用 ticket 文件中的状态字段自行判断是否已就绪）
- **状态：** 未开始

<!-- 如需了解整体上下文、所有 ticket 的依赖关系全景或横切关注点，请查看 `../tickets-map.md`。 -->

## 战略与背景

<!-- [必填] 本 ticket 的战略上下文。改编自 issues-slices.md §0。 -->

- **本 ticket 战略**：一句话——本 ticket 做什么 + 为什么 + 以什么为基础（新建/复用现有模块）
- **与该 ticket 相关的已确认决策**：逐条列出与本 ticket 范围相关的已拍板决策（从 ADR、spec 或对话中提取），防止实现时重新扯皮
- **与该 ticket 相关的当前现状**：逐条列出与本 ticket 相关的、与需求不符的现有代码/行为。格式：`文件路径:行号范围` + 当前行为 + 为何不满足需求。行号为近似值，实施时以现场代码为准
- **该 ticket 的预期产出**：完成后可观察到的行为变化

## 范围边界

| IN（本 ticket 构建） | REUSE（复用现有，不改动） | OUT（本 ticket 明确不做） |
|---------------------|-------------------------|-------------------------|
| ...                 | ...                     | ...                     |

## 要构建什么

<从用户视角描述此 ticket 交付的端到端行为。用户能做什么、看到什么变化。不是逐层实现清单。一到三段。>

## 交付物

<!-- 本 ticket 产出的文件/模块/功能。新增文件标 **新增**，重度重构标 **重构**。 -->

- **新增** path/to/new.ts —— 描述
- 修改 path/to/existing.ts —— 改动内容

## 需阅读的文件

<!-- 可选：仅当 ticket 涉及非显而易见的代码区域时填写。简单 ticket 可省略整个小节。 -->

| 文件 | 目的 |
|------|------|
| path | 为何需要阅读 |

## 保留/不动

<!-- 本 ticket 绝对不能碰的代码、契约或数据。无则写"无"。 -->

## 实现要点

<!-- 可选：3-7 条关键技术决策。简单 ticket 可省略整个小节。 -->

1. 关键技术点
2. 关键技术点

## 验收标准

- [ ] 可验证的验收条件
- [ ] 可验证的验收条件
```

**模板填写说明：**

- **被阻塞于**使用指向 `./ticket/` 目录的相对路径（如 `./ticket/01-auth.md`），多个用逗号分隔。执行者应自行打开被引用的 ticket 文件查看其状态字段，判断阻塞是否已解除
- **状态**初始固定为"未开始"；实现者开始工作时改为"进行中"，完成后改为"已完成"
- **战略与背景**是必填段——为执行者提供该 ticket 的决策锚点和当前现状。从 spec、ADR、对话中提取，不确定的标记 `[待确认]`
- **范围边界**是必填段——明确本 ticket 的 IN/REUSE/OUT 三列，防止范围蔓延。OUT 列吸收"明确不做"的内容
- **交付物**列出本 ticket 产出的具体文件——新增标 **新增**，修改不标，重构标 **重构**。让执行者明确知道要动哪些文件
- **需阅读的文件**仅在涉及非显而易见的代码区域时填写——告诉执行者上下文边界
- **保留/不动**是本 ticket 的安全边界——显式列出不能碰的代码/契约/数据。无则写"无"
- **实现要点**仅在 ticket 涉及有意义的架构决策时填写（3-7 条）。简单 ticket 省略
- **验收标准**使用 `- [ ]` checklist 格式，每条具体、可独立验证。优先写可执行命令，其次写手动检查步骤
- 描述统一使用深层模块设计词汇：模块/接口/接缝/适配器，而非组件/服务/边界

避免在 ticket 文件中写入绝对路径或行号承诺 —— 它们会很快过时。例外：如果原型产生了一个代码片段，它比文字更精确地编码了一个决策（状态机、reducer、schema、类型结构），将其内联并简要注明来自原型。精简到富含决策的部分 —— 不是可运行的演示，只是关键部分。

**5c. 写入 tickets-map.md**

创建 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`，作为所有 ticket 的总体地图和执行看板。格式遵循权威模板 `<Path>{roots.workflows}/specdev/T-tickets/tickets-map-template.md</Path>`——加载该模板获取完整的节结构、表格列定义和填写约定。

T-tickets 阶段填写的列：**编号**、**Ticket**、**被阻塞于**、**状态**（初始"未开始"）。**Gate** 和 **Contract ID** 列暂留空或标注 `[待标注]`——由后续 P-goal-plan 在标注门禁层级时填充。**依赖关系**节写入基础 ASCII 树形图（阻塞链），后续 P-goal-plan 在此基础上叠加门禁边界（`--- P0 gate ---`）、就绪标记 `[READY]` 和扇出标记 `[FAN-OUT: N路并行]`。**并行规则**节按模板保留——T-tickets 阶段写入规则文本，P-goal-plan 阶段可调整并发数。

**tickets-map.md 填写说明：**

- **执行清单**的 Ticket 列使用指向 `./ticket/` 目录的相对链接（纯数字编号前缀，如 `./ticket/01-auth.md`）
- **编号**列使用 `01`、`02`、`10` 格式（两位零填充阿拉伯数字，不含 `#`），代表依赖顺序
- **被阻塞于**列填写阻塞者的编号（如 `01`、`02, 05`）
- **状态**列由 T-tickets 初始化为"未开始"，后续由实现者手动更新——始终以对应 ticket 文件中的状态字段为权威来源
- **Gate** 列（P0/P1/P2）和 **Contract ID** 列由 P-goal-plan 填充；T-tickets 阶段留空或标 `[待标注]`
- **依赖关系**用 ASCII 树形图展示阻塞链——T-tickets 写入基础结构，P-goal-plan 叠加门禁标注
- **横切关注点**只放跨 ticket 的规则——单 ticket 的规则留在该 ticket 文件内
- **阻塞关系说明**在依赖图非平凡时补充文字解释

**完成标准**：`ticket/` 目录已创建，所有 ticket 独立文件已按依赖顺序写入（命名为 `NN-<ticket-name>.md`）；`tickets-map.md` 已按 `<Path>{roots.workflows}/specdev/T-tickets/tickets-map-template.md</Path>` 格式写入——包含总体摘要、六列执行清单（Gate 和 Contract ID 列为 `[待标注]`）、基础依赖关系 ASCII 树形图、并行规则和横切关注点；每个 ticket 声明阻塞边、战略与背景、范围边界、交付物、保留/不动和验收标准。

## 子文件引用

| 文件 | 内容 | 触发条件 |
|------|------|----------|
| `<Path>{roots.workflows}/specdev/T-tickets/tickets-map-template.md</Path>` | tickets-map.md 权威模板——执行清单六列表格、门禁标注 DAG、并行规则、横切关注点 | 进入步骤 5c「写入 tickets-map.md」时加载——T-tickets 按此模板输出基础结构，P-goal-plan 随后标注 Gate、Contract ID 和门禁 DAG |

本入口为单文件 work，所有 ticket 拆分流程内容均已内联。以下引用供其他 work 读取产物：

- `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` —— 总体地图与执行清单（编号 | Ticket | 被阻塞于 | Gate | Contract ID | 状态），格式遵循 `<Path>{roots.workflows}/specdev/T-tickets/tickets-map-template.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>` —— 独立 ticket 文件目录，每个文件命名为 `NN-<ticket-name>.md`（`NN` = `01`, `02`, ..., `10`, ...）
- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` —— 上游 spec（拆分依据）
- `<Path>{roots.state}/specdev/adr/</Path>` —— 永久架构决策目录（已确认并提升的 ADR）
- `<Path>{roots.state}/specdev/context/</Path>` —— 永久领域词汇表目录（已确认并提升的 CONTEXT）

## 下一步

如果 ticket 数量超过 10 个，建议运行 `<Path>{roots.workflows}/specdev/P-goal-plan/P-goal-plan.md</Path>` 产出目标规划文档，定义里程碑级约束、质量门禁和执行协议，为大规模协调执行做准备。
