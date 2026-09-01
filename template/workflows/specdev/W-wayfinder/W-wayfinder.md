---
id: specdev/wayfinder
type: workflow-entry
workflow: specdev
name: 寻路
description: 为超出单次会话且路径尚不可见的工作建立本地共享地图，逐个解决 research、prototype、grilling 或 task Ticket，直到目的地路线决策完备。
keywords: [wayfinder, 寻路, shared-map, research, prototype, grilling, task, 战争迷雾, 前沿]
---

# 寻路

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

一个模糊的想法出现了——太大而无法放入单个 Agent 会话，且从当前状态到**目的地**的路径尚不可见。寻路就是找到那条路，而非冲向目标。此 work 在 change state 中绘制一张**共享地图**，然后逐个处理其 Tickets，直到路径变得清晰。

目的地可能是一份待移交和迭代的 Spec、一个在规划开始前需锁定的决策，或一项经说明允许在地图中完成的变更。命名目的地是第一步，它塑造每个 Ticket。

## 核心纪律

### 规划，而非执行

Wayfinder 默认进行**规划**：每个 Ticket 解决一个决策，当地图完成时路径就清晰了——在某人动手之前没有任何剩余决定。想要直接动手通常说明已经到达地图边缘，是时候移交。只有地图“说明”明确覆盖此行为时，task 才能把解除阻塞的执行带入地图。

### 用名称引用

每张地图和每个 Ticket 都有一个名称。人类阅读的叙述和“已做出的决策”始终用名称引用；ID 和路径包裹在名称链接里，不以裸 `INV-01` 墙代替名称。

### 每会话一个 Ticket

无论绘制还是遍历，**每个会话绝不解决超过一个 Ticket**。绘制地图的会话不解决任何 Ticket；并行 research 的每个独立 Agent 也只负责一个 Ticket。

## 产物与适配

- 地图：`<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>`
- 子 Tickets：`<Path>{roots.state}/specdev/changes/{change}/investigation/</Path>`
- solution comments：`<Path>{roots.state}/specdev/changes/{change}/investigation/comments/</Path>`
- assignment registry：`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `claimed_investigations`

每次绘制或遍历前加载 `<Path>{roots.workflows}/specdev/W-wayfinder/local-tracker-contract.md</Path>`。Ticket 和地图模板：

- `<Path>{roots.workflows}/specdev/W-wayfinder/investigation-ticket-template.md</Path>`
- `<Path>{roots.workflows}/specdev/W-wayfinder/wayfinder-map-template.md</Path>`
- `<Path>{roots.workflows}/specdev/W-wayfinder/solution-comment-template.md</Path>`

## Ticket 类型

每个 Ticket 要么是 **HITL**，与一个代表自己发言的人类一起工作；要么是 **AFK**，由 Agent 独立驱动。HITL Ticket 只能通过实时交流解决，Agent 绝不代替人类一方发言。

- **Research（AFK）**：阅读文档、第三方 API 或知识库等资源，揭示某个决策等待的事实。调用 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`。当需要当前工作目录之外的知识时使用。
- **Prototype（HITL）**：调用 `<Path>{roots.workflows}/specdev/P-prototype/P-prototype.md</Path>` 检测项目 UI、比较功能风格候选并逐步确认设计方向，把 `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path>` 与 comparison locator 链接为 solution comment 资产；`{design-id}` 使用 P 返回的 `UI-NNN`，P 不实现目的地。
- **Grilling（HITL）**：对话。调用 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>` 的 grilling 与 domain-modeling 能力，但本会话只关闭当前 Wayfinder Ticket。
- **Task（HITL 或 AFK）**：在决策做出前必须完成的手动工作。它通过为决策解除阻塞赢得位置，不以交付目的地为目标。Agent 能独立驱动时使用 AFK，否则给人类精确清单。

Ticket label 只能是 `wayfinder:research | wayfinder:prototype | wayfinder:grilling | wayfinder:task`。

## 战争迷雾与范围

地图刻意不完整：不要绘制还看不到的内容。活跃 Tickets 之外是**战争迷雾**——能感觉即将到来、但依赖尚未解决问题而无法精确陈述的决策和调查。

**迷雾还是 Ticket？** 判断标准是现在能否精确陈述问题，而非现在能否回答：

- 问题已经清晰时做成 Ticket，即使仍被阻塞；
- 还无法精确表述时留在“尚未明确”，不预先切成 Ticket 大小碎片。

目的地固定范围。目标之外的工作进入**超出范围**，不是战争迷雾。范围之外永不升级；只有重新命名目的地并创建新 change 时才重新考虑。越界 Ticket 关闭为 `out-of-scope`，链接进“超出范围”，不进入“已做出的决策”。

## 调用模式

### 绘制地图

用户带着模糊想法调用：

1. **命名目的地。** 运行一轮 G 的 grilling/domain-modeling，确定正在寻路的 Spec、决策或变更。
2. **绘制前沿。** 再次质询，这次广度优先，在整个空间展开而非深入一条线索。如果没有浮现任何迷雾，停下并询问用户如何继续，不创建地图。
3. **创建地图。** 使用模板填写目的地和说明；“已做出的决策”为空，迷雾写入“尚未明确”。
4. **创建现在可明确的 Tickets。** 先创建全部 Ticket，再第二遍连接 `blocked_by`，因为 ID 必须先存在。
5. **派出 research Agent。** 每个 research Ticket 使用独立上下文和 claim，各自只解决一个 Ticket；需要 Git 分支时先取得对应授权。
6. 停止。绘制地图是一个会话的工作，它不亲手解决任何 Ticket。

**完成标准**：目的地、地图、当前可表述 Tickets、阻塞边和战争迷雾已持久化；绘图会话没有关闭 Ticket。

### 遍历地图

用户带来地图，可选指定 Ticket：

1. 加载地图的低分辨率视图，不加载每个 Ticket 正文。
2. 用户指定 Ticket 时使用它；否则按本地 tracker contract 查询并选择第一个 frontier Ticket。
3. 在任何工作前领取 Ticket。已领取时跳过并选择其他 frontier。
4. 按需缩放：只读取当前 Ticket、相关或已关闭 Ticket 的详情，以及“说明”指定的能力。
5. 解决当前唯一 Ticket，使用下一个未占用编号写 solution comment，原子关闭 Ticket 并释放 claim。
6. 在地图“已做出的决策”追加名称链接和一句概括；越界则写入“超出范围”。
7. 创建新浮现的 Tickets，第二遍连接阻塞；从“尚未明确”删除每个已升级补丁；更新或关闭被答案判定无效的 Tickets。

写回前重读地图、Ticket 与 claims，预期其他会话并发编辑。

**完成标准**：本会话只关闭一个 Ticket；Ticket、solution comment、claim、地图和新 frontier 一致。

## 收敛与路由

当前沿为空且“尚未明确”不再包含阻塞目的地的内容时，路径清晰：

路由前使用 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>` 的 `--stage wayfinder`；Ticket、claim、comment 或地图不一致时保持 blocked。

- 需要产品或架构取舍：`<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`；
- 外部行为已清楚：`<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>`；
- Spec Ready、只需拆分：`<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`；
- Bug 根因路线收敛：`<Path>{roots.workflows}/specdev/D-diagnose-bugs/D-diagnose-bugs.md</Path>`；
- 仍有高影响未知项：保持 active/blocked 并返回下一 frontier Ticket 名称。

## 完成标准

- 目的地塑造每个 Ticket 并固定范围；
- 地图是低分辨率索引，不列开放 Tickets，不复制答案详情；
- 四类 Ticket 与 HITL/AFK 语义正确；
- frontier 由 open、unblocked、unclaimed 事实查询；
- 名称用于人类叙述，裸 ID 只作内部标识；
- 战争迷雾、Ticket 与超出范围按可精确表述性和范围区分；
- 每会话最多解决一个 Ticket，HITL 用户没有被 Agent 代答；
- 每个关闭 Ticket 有 solution comment，资产通过链接引用；
- claim、阻塞、地图与 Ticket 状态一致；
- 路径清晰时返回下一 work，不把产品实现藏进寻路。

## 子文件引用

- 本地 Tracker：`<Path>{roots.workflows}/specdev/W-wayfinder/local-tracker-contract.md</Path>`
- Ticket 模板：`<Path>{roots.workflows}/specdev/W-wayfinder/investigation-ticket-template.md</Path>`
- Solution comment：`<Path>{roots.workflows}/specdev/W-wayfinder/solution-comment-template.md</Path>`
- 地图模板：`<Path>{roots.workflows}/specdev/W-wayfinder/wayfinder-map-template.md</Path>`
- Ticket schema：`<Path>{roots.workflows}/specdev/common/schemas/wayfinder-ticket.schema.json</Path>`
