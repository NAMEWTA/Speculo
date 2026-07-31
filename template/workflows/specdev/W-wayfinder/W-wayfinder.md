---
id: specdev/wayfinder
type: workflow-entry
workflow: specdev
name: 寻路
description: 为路径未知、跨域或超出单次上下文的工作绘制共享调查地图，用可领取的研究与决策 Ticket 逐步驱散战争迷雾，收敛到可执行路线。
keywords: [wayfinder, 寻路, 调查, research, decision, shared-map, 战争迷雾, 前沿, 并行, 未知项]
---

# 寻路

Wayfinder 用于“尚不知道怎样安全形成 Spec 或实现路线”的场景。它先命名**目标**，再把通往目标的路线绘制成一张**共享地图**——由一组可领取的调查 Ticket 组成，逐个关闭高影响未知项，直到路线清晰。地图刻意保持不完整：看得清的决策落成 Ticket，看不清的留在**战争迷雾**里，随每次调查完成而逐步散去。

## 两条核心纪律

- **规划而非执行**：本 work 产出的是**决策**，不是交付物。当你产生“顺手把它实现掉”的冲动时，通常意味着你已经走到了地图边缘——那是交接给实现 work 的信号，而不是继续动手的理由。用户可在地图笔记中显式授权把执行纳入地图，否则一律只产出决策。
- **以名称指代**：共享地图和每个调查 Ticket 都是有标题的实体。凡是人会读到的叙述，一律用**名称**指代（如“调查：登录态跨域刷新策略”），而不是裸编号（`INV-03`）或裸路径。ID 与路径作为链接附在名称里，不单独充当称呼。一屏 `INV-03、INV-04、INV-05` 无法阅读。

## 产物

- 共享地图：`<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>`
- 调查 Ticket 目录：`<Path>{roots.state}/specdev/changes/{change}/investigation/</Path>`
- 单个调查 Ticket：`<Path>{roots.state}/specdev/changes/{change}/investigation/{investigation-id}.md</Path>`
- 调查 Evidence：`<Path>{roots.state}/specdev/changes/{change}/investigation/evidence/</Path>`
- 全局领取状态：`<Path>{roots.state}/specdev/status.json</Path>` 中当前 change 的 `claimed_investigations`

模板：

- `<Path>{roots.workflows}/specdev/W-wayfinder/investigation-ticket-template.md</Path>`
- `<Path>{roots.workflows}/specdev/W-wayfinder/wayfinder-map-template.md</Path>`

## 何时运行

- 路径未知，无法安全写出 Ready Spec 或 Ticket；
- 需要跨多个领域、技术栈或外部系统调查；
- 调查量超出单个上下文，适合并行研究；
- 存在多个相互依赖的高影响未知项；
- 需要在若干候选方案中先获得事实证据再做决定。

若问题只是一个可在当前上下文通过短暂只读探索回答的事实，不创建 Wayfinder Map。若在命名目标、绘制前沿后发现根本没有迷雾——所有决策都已清楚——则不需要地图，停下并直接告知用户下一步。

## 两种调用模式

Wayfinder 有两种入口，可分次进行：

- **绘制地图**：用户带来一个粗略想法。命名目标 → 广度优先勾勒前沿 → 建立共享地图（写好目标与笔记，已定决策留空，迷雾写入“尚未指定”）→ 创建当前可明确表述的调查 Ticket 并二次连边补齐阻塞关系 → 并行触发 research 型 AFK 调查 → 停止。绘制本身不解决任何未知项。
- **走完地图**：用户带来一张已存在的地图（可选带指定 Ticket）。加载低分辨率地图 → 选取并领取一个前沿 Ticket → 解决它 → 记录结论、释放领取、关闭 Ticket → 浮现新 Ticket、让已可表述的迷雾毕业、把越界工作移入范围之外。

## 流程

### 1. 命名目标与勾勒边界

命名目标是第一动作，它塑造每一个后续 Ticket。写明：

- **最终目标**：一到两行描述“终点长什么样”。
- **已知边界**：当前确定的前提、约束与不变量。
- **当前不能决定的事项**：以及“为什么这些未知项阻塞规划”。

高影响未知项按**调查目的**分为四类：

- **research**：答案可由代码、文档、实验或外部来源证实；
- **decision**：事实已足够，但需要用户或架构 owner 做取舍；
- **validation**：已有方案，需要实验验证关键可行性或风险；
- **mapping**：需要建立调用链、数据流、依赖图或影响面。

每个调查 Ticket 还需标注**执行模式**：

- **AFK**（agent-only）：可由子代理独立完成，无需人类在环，典型是 research 与 mapping。
- **HITL**（human-in-the-loop）：必须通过与用户的实时交流才能解决，代理不得替用户作答；典型是 decision，以及需要用户对原型或方案取舍反馈的 validation。

低影响实现细节不创建调查 Ticket，记录为实现者可自行决定。

### 2. 战争迷雾与前沿

地图**刻意不完整**——不去绘制你还看不见的东西。

- **前沿**：地图上当前 `open`、依赖已满足（unblocked）、且尚未被领取（unclaimed）的调查 Ticket 集合。走完地图时只从前沿取 Ticket。
- **战争迷雾**：范围内、你已隐约感到会出现、但此刻还无法精确表述的决策。它们写入共享地图的“尚未指定”区，不切成 Ticket。
- **毕业判据**：能否**此刻精确陈述这个问题**（而非能否此刻回答它）。问题已经足够锐利就立 Ticket（即使仍被阻塞）；还说不清就留在迷雾里。不要预先把迷雾切成 Ticket 大小的碎片。

每解决一个 Ticket 都会驱散前方迷雾，让新可表述的问题从“尚未指定”毕业为新 Ticket。

### 3. 建立共享地图

使用 `<Path>{roots.workflows}/specdev/W-wayfinder/wayfinder-map-template.md</Path>` 写入 `<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>`。地图是**索引而非仓库**：每个决策只在一处存放（对应调查 Ticket 或 Evidence），地图只给出一行摘要并链接到详情。地图包含：

- **目标**：终点，一到两行。
- **笔记**：领域、需参考的 skills、固定偏好，以及是否显式授权把执行纳入地图。
- **调查清单**：当前所有已表述 Ticket 的索引表（含 ID、类型、执行模式、问题、依赖、领取状态、结果指针），前沿由此表投影。
- **调查 DAG**：阻塞关系图，避免多个调查重复回答同一问题；标记可并行与必须串行的决策点。
- **已定决策**：每关闭一个 Ticket 追加一行结论，作为“实际走过的路线”索引。
- **尚未指定**：范围内、尚不可表述为 Ticket 的迷雾。
- **范围之外**：见第 4 节。
- **停止条件**：整体收敛判据，不以“所有可能问题都研究完”为目标。

每个 Ticket 只关闭一个高影响未知项。

### 4. 范围之外

迷雾只朝目标方向聚集，目标一旦确定就固定了范围，因此超出目标的工作是**范围之外**，不是迷雾。它单独成节，列出被有意识排除的工作，写清摘要与理由。

- 范围之外**永不毕业**回地图；只有在目标被重画时，作为新的 change 重新纳入。
- 当一个已存在的 Ticket 被发现落在目标之外时，关闭它并在“范围之外”留一行摘要与原因，**不写入“已定决策”**——已定决策只记录实际走过的路线。

### 5. 领取与并行

调查者开始前原子地更新 `<Path>{roots.state}/specdev/status.json</Path>` 的 `claimed_investigations`（领取即“认领”，先领取再动手）：

- 未领取且依赖满足（属于前沿）→ 设置 owner、session 和 claimed 时间；
- 已领取 → 跳过并选择其他前沿 Ticket；
- 超过配置的 claim 超时且无进展 → 允许在记录原因后回收；
- 完成或释放后从领取集合移除，并同步共享地图。

并行是有约束的：

- **research / AFK 型调查可并行领取**，因为它们只读取事实、彼此独立，且不推进产品决策。并行调查使用独立上下文，只读取共享地图、当前调查 Ticket、相关上游工件和必要代码事实，不复制全部调查历史。
- **decision 及其他 HITL 型 Ticket，单个会话一次只解决一个**。这类 Ticket 会实质改变方案走向、开启新的迷雾，逐个解决才能让地图稳定地生长；一次塞多个决策会污染前沿。因此除 research 型外，**同一会话不要在一轮里解决多个 HITL 型 Ticket**。
- 用户可能在其他会话并行推进未阻塞的 Ticket，要预期对地图和领取状态的并发编辑，写回前先重读。

### 6. 执行调查

调查默认只读。允许：

- 代码搜索与静态分析；
- 文档、规范和官方来源研究；
- 可撤销的临时实验、最小原型或插桩（原型用于让用户对“看起来/表现如何”作出反应，是手段不是最终架构）；
- 性能测量、调用点扫描、schema 对比或兼容性验证。

外部研究使用 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`。

禁止：

- 顺手实现产品功能（想动手 = 到了地图边缘，交接而非继续）；
- 提交未经审查的实验代码；
- 将原型视为最终架构；
- 在没有证据时把建议写成事实；
- 代 HITL 型 Ticket 的用户作答；
- 无停止条件地持续研究。

### 7. 记录结果与影响

每个调查结果区分：

- 官方或规范事实；
- 当前代码事实；
- 实验结果；
- 推断；
- 建议；
- 用户或 owner 决策。

写明来源、版本、置信度、适用范围、反例、仍未知项和对以下工件的影响：

- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`；
- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`；
- `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`；
- `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`。

调查完成、阻塞或释放时：

1. 同步调查 Ticket、调查 Evidence、领取状态；
2. 在共享地图的“已定决策”追加一行结论索引（越界的则移入“范围之外”）；
3. 让新可表述的迷雾从“尚未指定”毕业为新 Ticket，并二次连边补齐阻塞关系；作废或被替代的 Ticket 及时更新或删除；
4. 返回 investigation 名称、状态及三份工件（调查 Ticket、Evidence、共享地图）的完整路径。

状态使用 `open | claimed | confirmed | disproved | decision-needed | unresolved | superseded | cancelled`。

### 8. 收敛与退出

当剩余未知项不再阻止目标、行为、架构、风险或验证决策时停止。根据结果进入：

- 需要产品或架构取舍 → `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`；
- 外部行为已清楚 → `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>`；
- Spec 已 Ready 且只是实现拆分未知 → `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`；
- Bug 根因路径已收敛 → `<Path>{roots.workflows}/specdev/D-diagnose-bugs/D-diagnose-bugs.md</Path>`；
- 仍存在高影响未知项 → 保持 blocked，并明确下一调查或用户决策。

长期有效且经实现验证的研究，只有在归档时由 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/A-archive-and-consolidate.md</Path>` 提升。

## 完成标准

- 目标已命名，并塑造了地图上的每个 Ticket；
- 共享地图、调查 Ticket 和领取状态一致；
- 地图作为索引，每个决策只在一处存放；
- 每个调查只关闭一个高影响未知项；
- 结论区分事实、实验、推断、建议和决定；
- 来源、版本、置信度和停止条件可追踪；
- 前沿、战争迷雾与范围之外划分清晰，迷雾按“能否精确表述”毕业；
- 并行调查没有重复领取或互相覆盖，且未在一轮里解决多个 HITL 型 Ticket；
- 调查状态及 Ticket、Evidence、共享地图路径已按名称返回；
- 没有把产品实现藏在调查中；
- 已明确下一 work 或阻塞决策。

## 子文件引用

- 调查 Ticket 模板：`<Path>{roots.workflows}/specdev/W-wayfinder/investigation-ticket-template.md</Path>`
- 共享地图模板：`<Path>{roots.workflows}/specdev/W-wayfinder/wayfinder-map-template.md</Path>`
