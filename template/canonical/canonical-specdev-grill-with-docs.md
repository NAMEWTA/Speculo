# 设计访谈（带文档）

## 网页平台运行约定

本文是可独立上传的单文件能力快照，不依赖 Speculo CLI 的根别名或源目录。执行时统一采用以下逻辑布局：

- 项目根下的 `specdev/` 是状态区；全局配置与状态分别为 `specdev/config.json` 和 `specdev/status.json`。
- 当前 change 位于 `specdev/changes/{change}/`，其中 `{change}` 使用 `YYYY-MM-DD-<kebab-topic>`。
- 当前 change 的设计、规划和证据工件都写入该目录；永久 ADR、领域上下文和研究分别写入 `specdev/adr/`、`specdev/context/` 和 `specdev/research/`。
- `specdev/config.json` 或 `specdev/status.json` 不存在时，分别按下方 `<config-template>` 和 `<status-template>` 标签创建；新建 change 时按下方 `<change-status-template>` 标签创建 `.status.json`。对应 schema 用于结构核对。
- 项目代码与测试始终使用项目根相对路径；不写机器绝对路径。工件之间使用上述逻辑路径，不使用 Speculo 的运行时路径标签。
- 如果网页平台不能直接写项目文件，则按目标文件名输出完整内容，并在答复中明确应保存的位置；不得把“无法写文件”伪装成已经持久化。
- 若本地项目提供 Speculo Node 校验器，可运行它补充结构校验；纯网页环境按本文内联的 schema、Ready 清单和完成标准逐项核对，并明确记录未运行的自动校验。
- 提交、推送、合并、部署、发布、归档移动和不可逆迁移仍需用户明确授权。

不留情面地访谈用户，直到达成共识。把这件事映射为一棵**设计树（design tree）**：每个决策都会分出挂在它下面的后续决策。

按**轮次**推进这棵树。**前沿（frontier）** 是所有前置条件已经确定的决策——那些现在就能问、不必猜测尚未得到答案的问题。每轮询问完整 frontier；用户的答案会重塑设计树并解除下一层问题的阻塞。

本 work 还负责把访谈持久化：设计树保存可恢复状态，LOG 保存讨论轨迹，CONTEXT 保存当前领域真相，ADR 保存长期架构决定。持久化不构成实现授权；在用户确认共识前不进入实现。

## 输入与产物

按存在情况读取：

- `specdev/config.json`
- `specdev/adr/`
- `specdev/context/`
- `specdev/changes/{change}/source-issue.md`
- `specdev/changes/{change}/triage.md`
- `specdev/changes/{change}/diagnosis.md`
- `specdev/changes/{change}/spec.md`
- 下方 `<artifact-contract>` 标签
- 下方 `<planning-principles>` 标签

本 work 拥有：

- `specdev/changes/{change}/design-tree.json`
- `specdev/changes/{change}/LOG.md`
- `specdev/changes/{change}/CONTEXT.md`
- `specdev/changes/{change}/ADR.md`

不存在的可选输入静默跳过，不把缺失文件伪装成已知事实。

## 流程

### 1. 启动或恢复 change

创建或恢复 `specdev/changes/{change}/`。首次启动时创建 `specdev/changes/{change}/.status.json`、`specdev/changes/{change}/ADR.md`、`specdev/changes/{change}/LOG.md`、`specdev/changes/{change}/CONTEXT.md`，并以 下方 `<design-tree-template>` 标签 为模板创建 `specdev/changes/{change}/design-tree.json`。

分别使用：

- 下方 `<adr-format>` 标签
- 下方 `<log-format>` 标签
- 下方 `<context-format>` 标签
- 下方 `<design-tree-schema>` 标签

恢复时先读取四份工件，按 design tree 的节点状态恢复，避免重复询问已关闭问题。

**完成标准**：四份工件均可读取；节点依赖无环，所有 LOG 指针存在，当前 frontier 可确定。

### 2. 查找事实

查找*事实*是 Agent 的工作，永远不是用户的。先探索相关代码、配置、接口、schema、测试、历史 ADR 和相邻实现。

当前沿问题需要来自环境的事实时，派遣独立探索去查找。不要阻塞等待：一次进行中的探索是一个未解决的前置条件，所以只有它下游的问题等待结果；现在就继续处理 frontier 的其余部分。不熟悉的外部技术使用 下方 `<research>` 标签。

将未知项分为：

- 可发现事实：探索或研究，不询问用户；
- 高影响决策：进入设计树；
- 低影响实现细节：记录为实现者可自行决定，不制造决策节点。

**完成标准**：每个候选问题已分类；用户只接收无法从环境发现的真实决策。

### 3. 建立设计树

围绕目标、角色、范围、主要流程、状态与失败、数据与接口、兼容与迁移、安全与隐私、性能与可观测性、验证与验收建立适用节点。

每个节点包含稳定 `D-###`、标题、问题、依赖、推荐答案和状态。只有问题本身已经可以精确陈述时才创建节点；依赖尚未确定的节点可以存在，但不进入 frontier。

**完成标准**：每个高影响已知决策有且只有一个节点；每条依赖指向真实上游节点；没有默默采用的高影响假设。

### 4. 逐轮推进完整 frontier

加载 下方 `<grilling-protocol>` 标签。每轮原子增加 `round`，重读设计树并计算完整 frontier。按协议格式给每个问题编号并附推荐答案，然后等待用户回答。

用户回答后：

1. 为每个回答更新对应节点；
2. 每个节点各追加一条 LOG，不把多个决定压成一条；
3. 根据回答增加、删除或重新连接后续节点；
4. 重新计算 frontier，进入下一轮。

一个答案依赖本轮仍开放问题的提问属于后续轮次。用户延后且该决定会影响外部行为、公共接口、数据、安全、兼容、迁移或验收时，保持 blocked，不把它伪装成共识。

**完成标准**：本轮开始时的完整 frontier 每个节点都有回答、明确延后或阻塞记录；所有状态已原子写入并重读。

### 5. 同步领域模型

加载 下方 `<domain-modeling-rules>` 标签。每轮先写 LOG，再把已确认且当前仍真实的术语、不变量、示例、反例和代码映射同步到 CONTEXT，最后把满足 ADR 条件的长期架构决定写入 ADR。

历史轨迹只留在 LOG；未确认选项不写成已接受 ADR；已有 ADR 被替代时建立 supersedes 链。同步文档用于记录共识生长过程，不授权产品实现。

**完成标准**：LOG、CONTEXT、ADR 和 design tree 无冲突；每个提升结论都有用户回答或事实来源。

### 6. 共识确认与路由

frontier 为空时，向用户确认设计树的每个分支均已走过且已经达成共识。用户指出遗漏时新增节点并继续；只有明确确认后把 design tree 标为 `consensus`。

随后按成熟度路由：

- 通常进入 “编写 Spec 阶段”；
- 外部行为已经完全明确时进入 “拆分 Tickets 阶段”；
- 获批的极小局部工作可进入 “实现阶段”；
- 路径或关键事实仍未知时进入 “寻路阶段”。

同步 workflow/change 状态，返回四份权威工件和下一 work 的完整路径。不自动执行下一 work。

## 完成标准

- 设计树的每个适用分支都已走过，没有高影响事项被默默假定；
- 每轮询问的是完整 frontier，依赖未关闭的问题没有提前出现；
- 可发现事实由 Agent 查找，没有转交用户；
- design tree 通过 schema，LOG 指针完整；
- CONTEXT 只包含当前领域真相，ADR 只包含满足条件的架构决定；
- frontier 为空且用户明确确认共识；
- 状态、权威工件和下一 work 路径已返回；
- 未执行产品实现。

## 子文件引用

- 质询协议：下方 `<grilling-protocol>` 标签
- 设计树模板：下方 `<design-tree-template>` 标签
- 领域建模：下方 `<domain-modeling-rules>` 标签
- ADR 格式：下方 `<adr-format>` 标签
- CONTEXT 格式：下方 `<context-format>` 标签
- LOG 格式：下方 `<log-format>` 标签

---

## 参考内容

以下内容均已内联。主流程提到标签时，直接使用对应标签中的完整规则、模板或 schema。

<grilling-protocol>

# 设计树质询协议

不留情面地访谈用户，直到达成共识。把这件事映射为一棵**设计树（design tree）**：每个决策都会分出挂在它下面的后续决策。

按**轮次**推进这棵树。**前沿（frontier）** 是所有前置条件已经确定的决策——那些你现在就能问、不必猜测还没听到的答案的问题。在一轮中问完整条前沿：给每个问题编号，并附上你的推荐答案。然后等待用户的回答，再进入下一轮。

每个问题按如下格式呈现：

```
❓ **Q1** - **<问题标题>**：<问题正文，可以是多个段落，包括多个选项>

➡️ <你的推荐答案>
```

每一轮用户的回答都会重塑这棵树——已确定的决策把前沿向外推，解除依赖它们的阻塞问题。重新计算前沿，然后问下一轮。一个答案依赖本轮仍在开放中的问题的提问，属于*更晚的*轮次，而不是本轮。

查找*事实*是你的工作，永远不是用户的。当前沿问题需要来自环境的事实（文件系统、工具等）时，派遣一个子 agent 去查找——不要就任何你自己能查到的东西去问用户。不要阻塞等待：一次正在进行的探索是一个未解决的前置条件，所以只有它下游的问题需要等子 agent 报告——现在就把前沿的其余部分问完。*决策*是用户的——把每个决策摆到他们面前并等待。

当前沿为空时，会话结束：设计树的每个分支都已走过，没有任何东西被默默假定。在用户确认我们已达成共识之前，不要对结果采取行动。

## SpecDev 持久化适配

- 设计树当前状态写入 `specdev/changes/{change}/design-tree.json`，结构遵循 下方 `<design-tree-schema>` 标签。
- 每个已回答、延后或拒绝的节点追加一条 `specdev/changes/{change}/LOG.md` 记录，并把 `LOG-###` 写回节点的 `log_ref`。
- 每轮开始前原子更新 `round`，重读设计树后计算 frontier：`status=open` 且全部 `depends_on` 节点为 `answered` 的节点集合。
- LOG、设计树及已确认的 CONTEXT/ADR 同步只用于恢复和领域建模，不构成实现授权。只有 frontier 为空且用户确认共识后才路由下游 work。

</grilling-protocol>

<design-tree-template>

```json
{
  "schema_version": 1,
  "artifact": "design-tree",
  "change": "{change}",
  "status": "active",
  "round": 0,
  "nodes": []
}
```

</design-tree-template>

<domain-modeling-rules>

# 领域建模规则

- 使用业务语言定义概念，避免用当前类名代替领域定义。
- 每个术语包含：定义、边界、示例、反例、相关不变量、代码映射。
- 同义词选择一个规范词，其余标别名；一词多义必须拆分。
- CONTEXT 描述当前真相；讨论历史只留在 LOG。
- 与代码不一致时同时记录“期望领域模型”和“当前实现差距”，不得假装已实现。

</domain-modeling-rules>

<adr-format>

# ADR 格式

只有同时满足“影响多个实现点、存在实质替代方案、结论预计长期有效”时才写 ADR。局部且可逆的实现选择留在 Ticket，不把 ADR 变成日常日志。

```markdown
## ADR-###: <标题>
- **状态：** proposed / accepted / superseded / deprecated
- **日期：**
- **决策范围：** 哪些系统、接口或工件受约束
- **来源：** LOG-### / 用户结论 / 外部规范
- **上下文：** 需要解决的长期张力，而非实现步骤
- **决策驱动：** 必须优化或保护的目标与约束
- **决策：** 清晰、可测试的规范性结论
- **替代方案：** 至少列出认真考虑过的可行方案
- **权衡理由：** 为什么选择当前方案
- **后果：** 正面 / 负面 / 新风险 / 组织影响
- **不变量与约束：** 下游 Spec、Ticket 和实现不得破坏的条件
- **验证方式：** 如何知道决策在真实系统中成立
- **迁移/采用：** 如适用
- **替代：** ADR-###（如适用）
- **被替代于：** ADR-###（如适用）
```

一个 ADR 只表达一个决策。修改已接受决策时，新建 ADR 并建立 supersedes 链；不得重写历史来掩盖决策变化。

</adr-format>

<context-format>

# CONTEXT 格式

CONTEXT 保存跨 change 可复用的领域语言、关系和不变量，不保存一次性任务计划。

```markdown
# <主题> 领域上下文

- **Owner：**
- **最后核验：**
- **权威来源：** ADR / 代码 / 外部规范 / 用户确认

## 术语
### <规范术语>
- 定义：
- 边界：
- 示例：
- 反例：
- 不变量：
- 代码映射：src/example.ts / 无
- 别名与禁用词：
- 来源与最后核验：

## 概念关系
- 聚合、生命周期、依赖、拥有关系或状态转换

## 全局不变量
- 始终成立、可被验证且不属于单个 change 的规则

## 当前实现映射
- 领域概念与模块、接口、存储或事件之间的对应

## 当前实现差距
- 已知偏离、历史负担和待验证假设；不得伪装成已确认事实

## 变更记录
- LOG-###：增加、修订或废弃了什么
```

</context-format>

<log-format>

# LOG 格式

```markdown
## LOG-### — <时间> — <主题>
- **设计树节点：** D-### / 不适用
- **轮次与依赖：** round <n> / D-###, D-### / 无
- **状态：** confirmed / deferred / rejected / superseded
- **问题：** 本条只记录一个决策或未知
- **事实与来源：** 代码、测试、用户确认或外部规范
- **选项：** 实质可行方案及关键差异
- **推荐：** 默认建议与理由
- **结论：**
- **原因：**
- **影响工件：** CONTEXT / ADR / Spec / Ticket / Goal Plan
- **约束或不变量：** 无 / ...
- **后续：** owner、触发条件或截止门禁
- **替代/被替代：** LOG-### / 无
```

LOG 追加为主；结论变化时新增条目并引用旧编号，不删除历史。状态为 deferred 的条目必须说明它是否阻止 Spec 或 Ticket Ready。

</log-format>

<artifact-contract>

# 工件职责与权威裁决

SpecDev 通过分层工件避免同一决策被多个模型反复重做。每个工件只承担自己的权威边界。

## 1. 工件职责

| 工件 | 具体位置 | 必须决定 | 不应决定 |
|---|---|---|---|
| 分诊 | `specdev/changes/{change}/triage.md` | 请求类别、影响、风险、缺失输入和下一 work | 详细实现方案 |
| 诊断 | `specdev/changes/{change}/diagnosis.md` | 复现、证据、根因、修复不变量和回归契约 | 未经验证的修复实现 |
| 设计日志 | `specdev/changes/{change}/LOG.md` | 讨论轨迹、确认、延后、替代与废弃结论 | 当前架构权威摘要 |
| 设计树 | `specdev/changes/{change}/design-tree.json` | 决策节点、依赖、当前 frontier、轮次与共识状态 | 领域真相或架构决定正文 |
| 领域上下文 | `specdev/changes/{change}/CONTEXT.md` | 当前领域术语、语义和稳定不变量 | 临时会议记录 |
| 架构决策 | `specdev/changes/{change}/ADR.md` | 已接受架构决策、原因、后果和替代关系 | 尚未决定的方案集合 |
| Spec | `specdev/changes/{change}/spec.md` | 用户问题、外部行为、范围、验收合同、非功能要求和已锁定实现约束 | 文件级施工步骤 |
| Ticket | `specdev/changes/{change}/ticket/NN-<ticket-name>.md` | 单一垂直切片的行为、决策、范围、路径所有权、执行路线和验证证据 | 跨 Ticket 里程碑治理 |
| Tickets Map | `specdev/changes/{change}/tickets-map.md` | 依赖 DAG、合同覆盖、Ready 投影、并行候选和路径冲突 | 单 Ticket 的完整实现契约 |
| Goal Plan | `specdev/changes/{change}/goal-plan.md` | 跨 Ticket 调度、Gate、共享所有权、迁移顺序、集成和偏差治理 | 复制 Ticket 全文 |
| Evidence | `specdev/changes/{change}/evidence/T-NN.md` | 实际修改、命令、结果、验收映射、偏差、风险和提交引用 | 新的产品或架构决策 |
| Wayfinder 地图 | `specdev/changes/{change}/wayfinder-map.md` | 目的地、说明、已关闭决策索引、战争迷雾和范围之外 | 开放 Ticket 正文或答案详情 |
| Wayfinder Ticket | `specdev/changes/{change}/investigation/{investigation-id}.md` | 一个可精确陈述的问题、类型、阻塞和关闭状态 | 解决方案评论或交付目标 |
| Wayfinder solution comment | `specdev/changes/{change}/investigation/comments/{investigation-id}/NN-solution.md` | Ticket 的答案、结果事实和资产指针 | 地图索引或产品实现 |
| 架构审查 | `specdev/changes/{change}/architecture-review.md` 与 `specdev/changes/{change}/architecture-review.html` | 深化候选、证据、可视化、选择和访谈状态 | 未经用户选择的执行契约 |

## 2. 权威顺序

同一事项冲突时按下列顺序裁决：

1. 用户最新明确决定；
2. 当前已接受架构决策：`specdev/changes/{change}/ADR.md`；
3. 当前外部行为权威：`specdev/changes/{change}/spec.md`；
4. 当前 Ticket 契约：`specdev/changes/{change}/ticket/NN-<ticket-name>.md`；
5. 当前跨 Ticket 编排：`specdev/changes/{change}/goal-plan.md`；
6. 当前代码与运行事实；
7. 旧计划、旧日志和未经确认的推断。

代码事实可以证明计划已过时，但不能静默改写用户目标或已接受契约。出现这种情况时，按 下方 `<deviation-control>` 标签 退回相应工件修订。

## 3. 来源追踪

高影响条目应带来源标识：

- `USER-DECISION:<date-or-summary>`；
- `ADR-###`；
- `US-###` 或 `AC-###`；
- `CODE:project/relative/path`；
- `RESEARCH:<Url>https://example.com/source</Url>`；
- `DIAG-###`。

来源追踪解释“为什么这样决定”，不要求为普通描述逐句加标签。

## 4. 冲突处理

1. 指明冲突事项和双方来源；
2. 判断冲突属于事实过时、产品取舍、架构取舍、Ticket 范围还是调度问题；
3. 按本规则的权威顺序提出裁决；
4. 若改变外部行为、公共契约、数据、安全、范围、迁移或验收，必须获得用户或指定批准人决定；
5. 更新真正拥有该决策的工件；
6. 在 `specdev/changes/{change}/LOG.md` 保留被替代结论和原因；
7. 重新执行结构校验；纯网页环境按本文的内联规则人工核对。

不得仅在下游工件中覆盖上游权威。

</artifact-contract>

<planning-principles>

# 规划原则

SpecDev 的规划目标是“决策完备、细节最小充分、能够验证”，不是把每个任务写成逐行施工脚本。

## 1. 先探索，后提问

先读取相关入口、配置、schema、类型、测试、相邻实现、当前工件和历史决策。未知项分为：

- **可发现事实**：通过只读探索解决，不询问用户；
- **高影响偏好或取舍**：无法从仓库推导，且会改变行为、架构、风险、范围、迁移或验收时才询问；
- **低影响实现细节**：由实现者遵循现有惯例决定。

外部事实研究使用 下方 `<research>` 标签。

## 2. 决策完备

一个 Plan 或 Ticket 达到以下状态才可执行：

- 目标和成功标准明确；
- IN、REUSE、OUT 与不变量明确；
- 公共接口、数据和兼容策略已锁定或明确不变化；
- 失败行为和关键边界有结论；
- 依赖、路径所有权和批准点明确；
- 验证方式和 Evidence 位置明确；
- 不存在会改变上述内容的高影响未决问题。

决策完备不要求逐文件穷举、逐函数步骤、逐行代码、重复代码库事实或虚构未来路径。

## 3. 最小充分细节

- 局部、低风险、沿用现有模式的切片使用 Lite。
- 多文件或跨层垂直切片使用 Standard。
- 公共契约、迁移、安全、不可逆操作、共享核心路径或复杂协作使用 Deep。

详细条件位于 下方 `<readiness-and-depth>` 标签。

## 4. 计划与执行分离

规划阶段可以读取、搜索、静态分析和执行只读或非修改性验证，不实现产品代码。执行阶段不重新决定已锁定的产品和架构事项。计划与代码事实冲突时，按 下方 `<deviation-control>` 标签 退回修订。

## 5. 以可验证目标委托

每个交付物至少有一种可重复证据：测试、类型检查、lint、构建、API 示例、截图对比、迁移 dry-run、查询结果或手动步骤。验证绑定外部行为或稳定接缝，不把私有实现细节当作唯一证据。

## 6. 委托而非微操

Ticket 告诉执行者：做什么、为什么、不能改变什么、按什么顺序形成安全落点、怎样证明。执行者决定：在现有代码惯例内怎样组织局部实现。只有高风险或非显然的接口、迁移和顺序需要写入执行路线。

## 7. 分层规划

- Spec 决定外部行为。
- Ticket 是决策完备的微型执行计划。
- Tickets Map 决定依赖和覆盖投影。
- Goal Plan 只在协调复杂度需要时决定跨 Ticket 编排。
- Implement 在既定契约内完成代码和 Evidence。

职责细节见 下方 `<artifact-contract>` 标签。

</planning-principles>

<readiness-and-depth>

# 规划深度与执行就绪

## 1. Planning Depth

### Lite

适用条件通常全部满足：范围局部、行为明确、沿用既有模式、无公共接口或数据迁移、无安全或高事故半径影响、易回滚、无需并行协调。

最低内容：目标、范围、项目路径授权、1–3 条执行路线、验收标准和验证方法。

### Standard

适用于大多数跨多个文件或技术层的垂直切片。

额外要求：锁定决策与假设、接口接缝、输入输出、不变量、失败行为、有序执行路线、验证矩阵和路径所有权。

### Deep

任一条件触发：公共 API、schema、wire format、数据迁移、认证授权、隐私、资金、不可逆操作、expand-contract、共享核心路径、多 Agent 复杂协作、多个实质架构方案或高事故半径。

额外要求：数据流或状态转换、兼容窗口、迁移顺序、可观测性、回滚、风险缓解、收缩条件和人工批准点。

## 2. Ticket Definition of Ready

Ticket 只有同时满足以下适用条件才可设置 `ready: true`：

- 外部行为和可观察产出明确；
- IN、REUSE、OUT 无冲突；
- 高影响决策已锁定；
- 没有会改变行为、接口、数据、兼容、安全、范围或验收的未决问题；
- 依赖存在且无循环；
- `writable_paths`、`read_only_paths` 和 `shared_paths` 使用项目根相对路径；
- shared path 有唯一 owner；
- 验收标准可判定；
- 验证矩阵覆盖正常、失败和回归风险，或有可信的不适用理由；
- Standard 或 Deep Ticket 有有序执行路线；
- Deep Ticket 有迁移、兼容、监控、回滚和批准点，或逐项说明不适用；
- 单个全新上下文可以完成，否则必须拆分。

详细检查位于 “拆分 Tickets 阶段的 Ticket Ready 检查”。

## 3. Spec Readiness

`specdev/changes/{change}/spec.md` 只有在外部行为、范围、公共接口、数据、安全、兼容、迁移和验收合同不存在高影响未知项时，才可设置 `ready_for_tickets: true`。

## 4. 假设规则

- 低影响、可逆的默认值可以作为显式假设继续；
- 高影响假设不得用于强行通过 Ready；
- 实现者发现假设不成立时，按 下方 `<deviation-control>` 标签 处理；
- 假设必须有适用范围和验证方式。

</readiness-and-depth>

<deviation-control>

# 偏差控制

偏差是“当前事实或实现需要偏离已批准工件”的显式事件。偏差不是普通进度说明，也不能作为先改后补文档的许可证。

## 1. 偏差等级

- **local**：只改变局部实现，不改变 Ticket 的行为、范围、公共契约、路径所有权或验证；记录到 Evidence 后可继续。
- **ticket**：改变 Ticket 的执行路线、可写范围、局部契约或验收映射，但不改变 Spec；必须停止相关修改、更新 Ticket 并获得 owner 或 Lead 批准。
- **spec**：改变外部行为、范围、用户故事、验收合同或非功能要求；必须返回 “编写 Spec 阶段”。
- **architecture**：改变已接受架构决策或公共架构约束；必须返回 “设计访谈能力” 并更新 `specdev/changes/{change}/ADR.md`。
- **release**：改变迁移、兼容窗口、发布门禁、回滚或不可逆批准点；必须停止并获得明确人工批准。

## 2. 触发条件

以下任一情况必须建立偏差：

- 当前代码事实使批准路线不可行；
- 需要修改 Ticket 未授权的项目路径；
- 需要修改 shared path，但当前实现者不是 owner；
- 验证接缝无法证明验收合同；
- 发现新的安全、数据、兼容、性能或迁移风险；
- 依赖、合同或外部参考权威已变化；
- 实际行为将与 Spec 或 ADR 不一致。

## 3. 偏差记录

偏差记录写入对应 Evidence：`specdev/changes/{change}/evidence/T-NN.md`，并至少包含：

- 偏差 ID 与等级；
- 触发事实和证据；
- 受影响工件与路径；
- 继续、回退、修订或拆分的选项；
- 推荐方案和风险；
- 批准人、批准时间和批准范围；
- 最终处理结果。

需要改变上层工件时，Evidence 只记录事件；真正的权威变更必须写回对应 Spec、Ticket、ADR 或 Goal Plan。

## 4. 停止规则

- 未批准的 ticket、spec、architecture 或 release 偏差不得继续实现。
- 不得通过扩大 `writable_paths`、删除测试、降低断言或把风险改写成“已知限制”来绕过停止。
- 偏差影响并发 Agent 时，Lead 必须暂停受影响 Wave，重新计算路径所有权、依赖和 Gate。

</deviation-control>

<research>

# SpecDev Research

## 触发

当外部 API、库版本、协议、法规、产品能力或最佳实践会改变设计/实现决策，且当前材料不足时使用。

## 流程

1. 写清楚要支持的具体决策和停止条件。
2. 优先官方文档、规范、源代码、论文或维护者材料；技术问题优先一手来源。
3. 核对版本、发布日期、适用环境和已知限制。
4. 区分：来源明确事实、代码库事实、推断、建议。
5. 对关键结论至少交叉验证；来源冲突时并列呈现，不强行调和。
6. 记录摘要、证据、置信度、对 ADR/Spec/Ticket 的影响和仍未知项。
7. 长期有效且经实现验证后才可由 Archive 提升到永久 research。

## 输出模板

```markdown
# Research: <问题>
- 决策用途：
- 范围/版本：
- 停止条件：

## Findings
### R-001
- 结论：
- 类型：官方事实 / 代码事实 / 推断 / 建议
- 来源：
- 置信度：high / medium / low
- 适用限制：
- 对工件影响：

## Conflicts and Unknowns
## Recommendation
```

不得长篇复制受版权保护的来源；使用短引文和自己的准确摘要。

</research>

<config-template>

```json
{
  "schema_version": 3,
  "interaction_language": "zh-CN",
  "artifact_language": "zh-CN",
  "git": {
    "auto_commit": false,
    "default_branch": null,
    "worktree_for_parallel": true
  },
  "execution": {
    "max_parallel": 3,
    "deep_ticket_human_approval": true,
    "shared_path_owner": "lead"
  },
  "verification": {
    "test": null,
    "typecheck": null,
    "lint": null,
    "build": null
  },
  "planning": {
    "default_depth": "standard",
    "require_ready_gate": true,
    "require_evidence": true
  }
}
```

</config-template>

<config-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:config:v3",
  "title": "SpecDev Configuration",
  "type": "object",
  "required": ["schema_version", "interaction_language", "artifact_language", "git", "execution", "verification", "planning"],
  "properties": {
    "schema_version": {"const": 3},
    "interaction_language": {"type": "string", "minLength": 1},
    "artifact_language": {"type": "string", "minLength": 1},
    "git": {
      "type": "object",
      "required": ["auto_commit", "default_branch", "worktree_for_parallel"],
      "properties": {
        "auto_commit": {"type": "boolean"},
        "default_branch": {"type": ["string", "null"]},
        "worktree_for_parallel": {"type": "boolean"}
      },
      "additionalProperties": true
    },
    "execution": {
      "type": "object",
      "required": ["max_parallel", "deep_ticket_human_approval", "shared_path_owner"],
      "properties": {
        "max_parallel": {"type": "integer", "minimum": 1},
        "deep_ticket_human_approval": {"type": "boolean"},
        "shared_path_owner": {"type": "string", "minLength": 1}
      },
      "additionalProperties": true
    },
    "verification": {
      "type": "object",
      "required": ["test", "typecheck", "lint", "build"],
      "properties": {
        "test": {"type": ["string", "null"]},
        "typecheck": {"type": ["string", "null"]},
        "lint": {"type": ["string", "null"]},
        "build": {"type": ["string", "null"]}
      },
      "additionalProperties": true
    },
    "planning": {
      "type": "object",
      "required": ["default_depth", "require_ready_gate", "require_evidence"],
      "properties": {
        "default_depth": {"enum": ["lite", "standard", "deep"]},
        "require_ready_gate": {"type": "boolean"},
        "require_evidence": {"type": "boolean"}
      },
      "additionalProperties": true
    }
  },
  "additionalProperties": true
}
```

</config-schema>

<status-template>

```json
{
  "schema_version": 4,
  "workflow": "specdev",
  "active": [],
  "archived": []
}
```

</status-template>

<status-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:status:v4",
  "title": "SpecDev Global Status",
  "type": "object",
  "required": [
    "schema_version",
    "workflow",
    "active",
    "archived"
  ],
  "properties": {
    "schema_version": {
      "const": 4
    },
    "workflow": {
      "const": "specdev"
    },
    "active": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "change",
          "current_work",
          "works_run"
        ],
        "properties": {
          "change": {
            "type": "string",
            "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
          },
          "current_work": {
            "type": [
              "string",
              "null"
            ],
            "pattern": "^specdev/"
          },
          "works_run": {
            "type": "array",
            "items": {
              "type": "string",
              "pattern": "^specdev/"
            },
            "uniqueItems": true
          },
          "claimed_investigations": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "id",
                "owner",
                "claimed_at"
              ],
              "properties": {
                "id": {
                  "type": "string"
                },
                "owner": {
                  "type": "string"
                },
                "session": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "claimed_at": {
                  "type": "string"
                }
              },
              "additionalProperties": false
            }
          }
        },
        "additionalProperties": false
      }
    },
    "archived": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
      },
      "uniqueItems": true
    }
  },
  "additionalProperties": false
}
```

</status-schema>

<change-status-template>

```json
{
  "schema_version": 3,
  "artifact": "change-status",
  "change": "<YYYY-MM-DD-topic>",
  "change_status": "active",
  "current_work": null,
  "created_at": "<ISO-8601>",
  "updated_at": "<ISO-8601>",
  "completed_at": null,
  "archived": false,
  "archive_path": null,
  "blockers": [],
  "deviations": [],
  "worktrees": []
}
```

</change-status-template>

<change-status-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:change-status:v3",
  "title": "SpecDev Change Status",
  "type": "object",
  "required": [
    "schema_version",
    "artifact",
    "change",
    "change_status",
    "current_work",
    "created_at",
    "updated_at",
    "completed_at",
    "archived",
    "archive_path",
    "blockers",
    "deviations"
  ],
  "properties": {
    "schema_version": {
      "const": 3
    },
    "artifact": {
      "const": "change-status"
    },
    "change": {
      "type": "string",
      "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
    },
    "change_status": {
      "enum": [
        "active",
        "blocked",
        "completed",
        "archived"
      ]
    },
    "current_work": {
      "type": [
        "string",
        "null"
      ]
    },
    "created_at": {
      "type": "string",
      "minLength": 1
    },
    "updated_at": {
      "type": "string",
      "minLength": 1
    },
    "completed_at": {
      "type": [
        "string",
        "null"
      ]
    },
    "archived": {
      "type": "boolean"
    },
    "archive_path": {
      "anyOf": [
        {
          "type": "null"
        },
        {
          "type": "string",
          "pattern": "^specdev/archive/[0-9]{4}-[0-9]{2}/.+/$"
        }
      ]
    },
    "blockers": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "deviations": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "worktrees": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "ticket_id",
          "owner",
          "provider",
          "base_sha",
          "branch",
          "workspace_ref",
          "status",
          "updated_at"
        ],
        "properties": {
          "ticket_id": {
            "type": "string",
            "pattern": "^T-[0-9]{2,}$"
          },
          "owner": {
            "type": "string",
            "minLength": 1
          },
          "provider": {
            "enum": [
              "native",
              "git",
              "external"
            ]
          },
          "base_sha": {
            "type": "string",
            "minLength": 1
          },
          "branch": {
            "type": "string",
            "minLength": 1
          },
          "workspace_ref": {
            "type": "string",
            "minLength": 1,
            "pattern": "^(?!/)(?![A-Za-z]:[\\\\/]).+"
          },
          "status": {
            "enum": [
              "planned",
              "active",
              "review",
              "integrated",
              "removed",
              "blocked"
            ]
          },
          "updated_at": {
            "type": "string",
            "minLength": 1
          }
        },
        "additionalProperties": true
      }
    }
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "worktrees": {
            "contains": {
              "properties": {
                "provider": {
                  "const": "git"
                }
              },
              "required": [
                "provider"
              ]
            }
          }
        }
      },
      "then": {
        "properties": {
          "worktrees": {
            "items": {
              "if": {
                "properties": {
                  "provider": {
                    "const": "git"
                  }
                },
                "required": [
                  "provider"
                ]
              },
              "then": {
                "properties": {
                  "workspace_ref": {
                    "pattern": "^specdev-worktree/T-[0-9]{2,}$"
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "change_status": {
            "const": "archived"
          }
        }
      },
      "then": {
        "properties": {
          "archived": {
            "const": true
          },
          "archive_path": {
            "type": "string",
            "pattern": "^specdev/archive/[0-9]{4}-[0-9]{2}/.+/$"
          }
        }
      }
    }
  ],
  "additionalProperties": true
}
```

</change-status-schema>

<design-tree-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:design-tree:v1",
  "title": "SpecDev Grilling Design Tree",
  "type": "object",
  "required": ["schema_version", "artifact", "change", "status", "round", "nodes"],
  "properties": {
    "schema_version": { "const": 1 },
    "artifact": { "const": "design-tree" },
    "change": { "type": "string", "minLength": 1 },
    "status": { "enum": ["active", "consensus", "blocked"] },
    "round": { "type": "integer", "minimum": 0 },
    "nodes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "title", "question", "depends_on", "recommendation", "status", "round", "answer", "log_ref"],
        "properties": {
          "id": { "type": "string", "pattern": "^D-[0-9]{3,}$" },
          "title": { "type": "string", "minLength": 1 },
          "question": { "type": "string", "minLength": 1 },
          "depends_on": { "type": "array", "items": { "type": "string", "pattern": "^D-[0-9]{3,}$" } },
          "recommendation": { "type": "string", "minLength": 1 },
          "status": { "enum": ["open", "answered", "deferred", "rejected"] },
          "round": { "type": ["integer", "null"], "minimum": 1 },
          "answer": { "type": ["string", "null"] },
          "log_ref": { "type": ["string", "null"], "pattern": "^LOG-[0-9]{3,}$" }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

</design-tree-schema>
