---
id: specdev/wayfinder
type: workflow-entry
workflow: specdev
name: 寻路
description: 为超出单次会话容量的大块工作绘制共享地图，逐个解决调查 tickets 直到通往目标的路径清晰可见。支持研究和决策型 ticket 类型。
keywords: [寻路, 地图, 探索, 规划, 战争迷雾, 调研]
---

# 寻路

一个模糊的想法出现了 —— 太大而无法放入单个 agent 会话，且笼罩在迷雾中：从当前状态到**目标**的路径尚不可见。寻路（Wayfinding）就是找到那条路，而非冲向目标。此 work 在变更目录中绘制路径作为一张**共享地图**，然后逐个处理其 tickets，直到路径变得清晰。

目标因工作而异，命名目标是绘制地图的第一步 —— 它塑造每个 ticket。目标可能是一份待移交和迭代的 spec、一个在规划开始前需锁定的决策、或是一个原地完成的变更（如数据结构迁移）。地图是领域无关的 —— 工程工作、课程内容，任何符合此形态的内容都可以。

## 规划，而非执行

Wayfinder 默认进行**规划**：每个 ticket 解决一个决策，当地图完成时路径就清晰了 —— 在某人动手做事之前没有任何剩余的决策。想要直接动手做事的冲动通常就是信号，表明你已经到达地图的边缘，是时候移交了。一项工作可以通过其 **Notes** 覆盖此行为 —— 将执行带入地图本身 —— 但如果没有明确说明，产出决策，而非可交付成果。

## 用名称引用

每张地图和每个 ticket 都有其**名称** —— 即其标题或标识。在人类阅读的所有内容中 —— 叙述、地图的 Decisions-so-far —— 使用名称引用它，绝不使用裸 ID、编号或 slug。一堵 `#42, #43, #44` 的墙是难以阅读的；名称可以一目了然。引用标记不会消失 —— 名称包裹着其引用 —— 但它们在名称*内部*，绝不是名称的替代品。

在本地 markdown 地图中，使用 Markdown 链接 `[ticket 标题](#ticket-标题)` 进行引用。已解决的 tickets 在地图的 Decisions-so-far 中以 `- [ticket 标题] —— 答案概括` 形式索引。

## 地图

地图是变更目录下的单个 markdown 文件 `<Path>{roots.state}/specdev/changes/{change}/map.md</Path>`，是规范的产物。其 tickets 是地图内的 task list items（`- [ ]` 格式）。如果工作范围跨多个变更，地图位于主变更目录下。

地图是一个**索引**，而非存储。它列出已做出的决策并指向持有其详细信息的 tickets；一个决策只存在于一个地方 —— 其 ticket —— 因此地图从不重述，仅概括并链接。

**地图物理结构：** 地图文件本身是 markdown 文件。Tickets 是地图文件内的编号 task list items，而非外部 issues。每个 ticket 拥有一个独立的 markdown 小节，包含标题、类型标签、问题和答案。状态通过 checkbox 标记追踪（`- [ ]` 开放，`- [x]` 已解决）。阻塞关系通过"被阻塞于"字段声明，以 ticket 标题引用。

**前沿查询：** 前沿上的 tickets 是指：checkbox 未勾选（开放）、其"被阻塞于"中列出的所有 tickets 均已勾选（无阻塞）、且尚未被领取的 tickets。Agent 通过阅读地图文件本身即可识别前沿。

**领取机制：** 当一个 agent 会话开始处理某个 ticket 时，它应在 `<Path>{roots.state}/specdev/status.json</Path>` 的 `active` 数组中记录当前处理的 ticket 名称，以便并发会话跳过它。处理完成后从 `active` 中移除。`active` 中存在记录即为领取标记。

### 地图正文

整个地图的低分辨率视图，每个会话加载一次。开放的 tickets **不**在此处列出 —— 它们直接作为地图文件中的未勾选小节存在。

```markdown
# 地图：<工作名称>

## 目的地

<到达此地图终点时的样子 —— 此工作正在寻路的 spec、决策或变更。一到两行；每个会话在挑选 ticket 之前以其为定位。>

## 说明

<领域；每个会话应咨询的技能；此工作的常设偏好>

## 已做出的决策

<!-- 索引 —— 每个已关闭 ticket 一行：足以判断相关性，然后跳转到对应小节查看详细信息 -->

- [<已关闭 ticket 标题>](#ticket-标题) —— <答案的一句话概括>

## 尚未明确

<!-- 参见"战争迷雾"：范围内但你尚无法做成 ticket 的迷雾；随着前沿推进而升级 -->

## 超出范围

<!-- 参见"超出范围"：被裁定在目标之外的工作；已关闭，永不升级 -->
```

### Tickets

每个 ticket 是地图文件内的一个小节，其正文是问题，大小适配一个 100K token 的 agent 会话。Tickets 按创建顺序编号。

```markdown
## <编号>. <Ticket 标题>  `[<类型>]` `[<HITL|AFK>]`

**类型：** <research | prototype | grilling | task>

**交互模式：** <HITL | AFK> —— <简要说明为何是此模式>

**状态：** < - [ ] 开放 | - [x] 已解决 >

**被阻塞于：** <阻塞此 ticket 的 ticket 标题列表，或"无 —— 可立即开始">

### 问题

<此 ticket 要解决的决策或调查>

### 答案

<!-- 解决时填写 —— 答案的完整记录。以下仅在 ticket 已解决时出现：-->

<解决此 ticket 时记录的内容。对于 research：发现的摘要和链接资产。对于 prototype：原型的描述和链接。对于 grilling：访谈达成的共识。对于 task：已完成的工作和结果性事实。>
```

每个 ticket 携带一个类型标签 —— 以下之一：`research`、`prototype`、`grilling`、`task`（参见下方 [Ticket 类型](#ticket-类型)）。

**领取机制：** 一个会话通过将其名称写入 `<Path>{roots.state}/specdev/status.json</Path>` 的 `active` 数组来**领取**一个 ticket，在开始任何工作**之前**领取，以便并发会话跳过它。该记录*就是*领取标记：一个开放、未被领取的 ticket 是未被领取的。

**阻塞关系：** 使用 ticket 标题在"被阻塞于"字段中声明依赖。这很关键，因为它使前沿在地图文件中*可视化*呈现 —— 人类无需额外工具就能看到哪些可以开始。当一个 ticket 的所有阻塞 tickets 都已勾选（已解决）时，该 ticket 是**未被阻塞的**；**前沿**是开放（未勾选）、未被阻塞、未被领取的 tickets —— 即已知的边界。

**答案：** 不是正文的一部分 —— 它在解决时写入 ticket 的"答案"小节（参见[遍历地图](#遍历地图)）。解决 ticket 时创建的资产从 ticket 小节链接，而非粘贴进去。如果资产是文件，放置在 `<Path>{roots.state}/specdev/changes/{change}/</Path>` 下，从 ticket 链接。

## Ticket 类型

每个 ticket 要么是 **HITL** —— 人在回路中，与一个代表自己发言的人类*一起*工作 —— 要么是 **AFK**，由 agent 独立驱动。HITL ticket 只能通过实时交流来解决；agent 绝不代替人类一方发言（一个自问自答的质询 agent 已经破坏了这一点）。

- **Research**（AFK）：阅读文档、第三方 API 或知识库等本地资源。创建一个 markdown 摘要作为链接资产。当需要当前工作目录之外的知识时使用。
- **Prototype**（HITL）：通过制作一个廉价、粗糙、具体的产物来提高讨论的保真度 —— 大纲、粗略尝试、桩代码、或 UI/逻辑代码。将原型链接为资产。当"它应该是什么样子"或"它应该怎样表现"是关键问题时使用。
- **Grilling**（HITL）：通过 `<Path>{roots.workflows}/specdev/G-grill-with-docs/grilling-protocol.md</Path>` 访谈协议逐个问题进行对话。同时使用 `<Path>{roots.workflows}/specdev/G-grill-with-docs/domain-modeling-rules.md</Path>` 维护领域模型。默认情况 —— 当不确定类型时选此。
- **Task**（HITL 或 AFK）：在*决策*能够做出之前必须完成的手动工作 —— 没有需要决定、原型化或研究的内容，但讨论被阻塞直到完成。注册服务以便判断其 API、开通访问权限、移动数据以便看到其形态。这是唯一一个*执行*而非决策的类型 —— 它通过为决策解除阻塞来赢得其位置，而非通过交付目标。Agent 在可能的情况下独立驱动（AFK）；否则它交给人类一份精确的清单（HITL）。当工作完成时解决；答案记录已完成的工作以及后续 tickets 依赖的任何结果性事实（凭据位置、新 URL、行数）。

## 战争迷雾

地图是*刻意*不完整的：不要绘制你还看不到的内容。在活跃的 tickets 之外是**战争迷雾** —— 你能感觉到即将到来但尚无法确定的决策和调查的模糊视野，因为它们依赖于尚未解决的问题。解决一个 ticket 会清除它前方的迷雾，将任何现在可以明确的内容升级为新的 tickets —— 逐个进行，直到通往目标的路径清晰且没有剩余 tickets。

地图的**尚未明确**章节记录这些模糊视野：待定的问题、后续重新审视的区域。它是朝向目标*方向*的未发现前沿 —— 此处的所有内容都在范围内，只是不够清晰以做成 ticket。根据视野允许的范围，尽可能松散或完整地书写；它同时也是协作者阅读工作方向的路标。

**迷雾还是 ticket？** 判断标准是你是否现在就能精确地陈述问题 —— 而不是你现在是否能回答它。

- **做成 ticket 当** 问题已经清晰 —— 即使它被阻塞，你尚不能行动。你能写出明确的"问题"段落。
- **尚未明确当** 你还无法如此精确地表述它。不要将迷雾预先切成 ticket 大小的碎片：它比 ticket 更粗糙，一个补丁可能在当前沿到达时升级为多个 tickets，或零个。

**尚未明确**排除已决策的内容（Decisions-so-far）、已有的活跃 ticket 以及超出范围的内容（下一节）。

## 超出范围

迷雾只会向目标方向*聚集*。目标确定了范围，因此目标之外的工作是**超出范围**的 —— 它不是迷雾，也不属于**尚未明确**。它在地图上拥有自己的**超出范围**章节：你已自觉排除在*此*工作之外的工作。是范围而非清晰度让它落入此处。

超出范围的工作永不升级 —— 前沿停在目标处 —— 因此只有在目标被重新划定后才会重新考虑，且以一个全新的工作而非恢复旧工作的形式出现。

将某物裁定为超出范围是一个范围界定行为，而非路径上的一步。当已有的一个 ticket 被发现位于目标之外 —— 绘制地图时范围划分错误，或因某个解决方案而暴露 —— **关闭它**（勾选 checkbox），并在**超出范围**章节留下一行：概括加上为何超出范围，链接已关闭的 ticket。它不会出现在**已做出的决策**中，该节记录实际走过的路径 —— 范围边界不是路径上的一步。

## 调用方式

两种模式。无论哪种，**每个会话绝不解决超过一个 ticket。**

### 绘制地图

用户带着模糊的想法调用。

1. **命名目标。** 运行一次 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>` 访谈会话，以确定此地图正在寻路的目标 —— spec、决策或变更。目标确定了范围，因此先确定它。使用 `<Path>{roots.workflows}/specdev/G-grill-with-docs/grilling-protocol.md</Path>` 进行访谈，使用 `<Path>{roots.workflows}/specdev/G-grill-with-docs/domain-modeling-rules.md</Path>` 维护领域模型。

   **完成标准**：目标已命名，范围边界已确定。

2. **绘制前沿。** 再次质询，这次**广度优先**：在整个空间上扩展而非深入任何一条线索，揭示开放的决策和现在可以迈出的第一步。如果此过程没有浮现任何迷雾 —— 通往目标的路径已经清晰，整个旅程足够小到放入一个会话 —— 你不需要地图。停下来询问用户他们希望如何继续。

   **完成标准**：前沿的开放决策和第一步已浮现；迷雾部分已识别并草拟。

3. **创建地图**：写入 `<Path>{roots.state}/specdev/changes/{change}/map.md</Path>`，填写 Destination 和 Notes，Decisions-so-far 为空，迷雾草拟进**尚未明确**。

   **完成标准**：地图文件已创建，Destination、Notes、尚未明确、超出范围均已填写。

4. **创建你现在能明确的 tickets** 作为地图文件内的小节 —— 然后在**第二遍**中连接阻塞边（tickets 需要首先有标题才能相互引用）。连接关系将它们排序为前沿和被阻塞；你尚无法明确的都在迷雾中 —— **尚未明确**章节。

   **完成标准**：所有可明确的 tickets 已创建并连接阻塞边；迷雾已归入尚未明确。

5. **停止** —— 绘制地图是一个会话的工作；不要同时解决 tickets。

### 遍历地图

用户带着一张地图（变更目录或 map.md 路径）调用。Ticket 是**可选的** —— 不提供时，你选择下一个决策，而非用户。

1. **加载地图** —— 低分辨率视图（Destination、Notes、Decisions-so-far、尚未明确、超出范围），而非每个 ticket 的完整正文。

   **完成标准**：地图的低分辨率视图已加载，当前状态已理解。

2. **选择 ticket。** 如果用户指定了一个，使用它。否则按顺序选择第一个前沿 ticket（开放、未被阻塞、未被领取）。**领取它**：在任何工作之前将 ticket 名称写入 `<Path>{roots.state}/specdev/status.json</Path>` 的 `active` 数组。

   **完成标准**：一个前沿 ticket 已被选中并领取。

3. **解决它** —— **按需缩放**：按需拉取任何相关或已关闭 ticket 的完整正文；调用 Notes 块中指定的技能。如有疑问，使用 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>` 进行访谈。查阅 `<Path>{roots.workflows}/specdev/G-grill-with-docs/domain-modeling-rules.md</Path>` 维护领域模型的一致性。

   **完成标准**：ticket 的问题已解决，答案已记录。

4. **记录解决方案：** 在 ticket 的"答案"小节中填写答案，将 checkbox 从 `- [ ]` 改为 `- [x]`，在地图的 Decisions-so-far 中**追加一条上下文指针**：`- [ticket 标题] —— 答案的一句话概括`。从 `<Path>{roots.state}/specdev/status.json</Path>` 的 `active` 数组中移除该 ticket。

   **完成标准**：ticket checkbox 已勾选，Decisions-so-far 已更新，active 数组已清理。

5. **添加新浮现的 tickets** 作为地图文件内新的小节（先创建再连接阻塞边）；升级答案使任何变得可明确的迷雾，从**尚未明确**中清除每个已升级的补丁，使其仅以其新 ticket 的形式存在。如果答案揭示某个 ticket —— 这个或其他 —— 位于目标之外，**将其裁定为超出范围**而非在路径上解决它。如果该决策使地图的其他部分无效，更新或删除这些 tickets（勾选并注明无效原因）。

   **完成标准**：新浮现的 tickets 已添加，迷雾已升级或清除，超出范围的 tickets 已裁定。

用户可以并行运行未被阻塞的 tickets，因此需预期其他会话会并发编辑地图文件和 status.json。

### 完成

当所有 tickets 已关闭（勾选）、迷雾已清空（尚未明确为空或仅剩无法继续分解的模糊项）、且通往目标的路径已清晰时，地图完成。向用户汇报：

- 目的地是否已可抵达——路径上的每个步骤是否都已有明确的 ticket 或决策
- Decisions-so-far 中的关键结论摘要
- 剩余的任何**尚未明确**项——它们是否阻碍行动，还是可作为实现细节处理
- 建议的下一步行动（移交实现、开始执行、或重新划定目标）

**完成标准**：前沿已清空——无开放 tickets、无残留迷雾、通往目标的路径清晰。完成汇报已向用户呈现。

---

## 子文件引用

本入口为单文件 work，所有内容均已内联。以下引用供 work 内各阶段加载：

| 文件 | 触发条件 |
|------|----------|
| `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>` | 需要访谈以命名目标或解决 grilling 类型 ticket |
| `<Path>{roots.workflows}/specdev/G-grill-with-docs/grilling-protocol.md</Path>` | 进入具体访谈——一次一问，决策树遍历 |
| `<Path>{roots.workflows}/specdev/G-grill-with-docs/domain-modeling-rules.md</Path>` | 维护领域模型——术语精炼、决策记录 |
| `<Path>{roots.state}/specdev/changes/{change}/map.md</Path>` | 地图持久化文件 |

状态追踪：
- `<Path>{roots.state}/specdev/status.json</Path>` —— `active` 数组记录当前领取的 ticket
