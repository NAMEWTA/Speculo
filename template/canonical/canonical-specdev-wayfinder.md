# 寻路

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

Wayfinder 用于“尚不知道怎样安全形成 Spec 或实现路线”的场景。它先命名**目标**，再把通往目标的路线绘制成一张**共享地图**——由一组可领取的调查 Ticket 组成，逐个关闭高影响未知项，直到路线清晰。地图刻意保持不完整：看得清的决策落成 Ticket，看不清的留在**战争迷雾**里，随每次调查完成而逐步散去。

## 两条核心纪律

- **规划而非执行**：本 work 产出的是**决策**，不是交付物。当你产生“顺手把它实现掉”的冲动时，通常意味着你已经走到了地图边缘——那是交接给实现 work 的信号，而不是继续动手的理由。用户可在地图笔记中显式授权把执行纳入地图，否则一律只产出决策。
- **以名称指代**：共享地图和每个调查 Ticket 都是有标题的实体。凡是人会读到的叙述，一律用**名称**指代（如“调查：登录态跨域刷新策略”），而不是裸编号（`INV-03`）或裸路径。ID 与路径作为链接附在名称里，不单独充当称呼。一屏 `INV-03、INV-04、INV-05` 无法阅读。

## 产物

- 共享地图：`specdev/changes/{change}/wayfinder-map.md`
- 调查 Ticket 目录：`specdev/changes/{change}/investigation/`
- 单个调查 Ticket：`specdev/changes/{change}/investigation/{investigation-id}.md`
- 调查 Evidence：`specdev/changes/{change}/investigation/evidence/`
- 全局领取状态：`specdev/status.json` 中当前 change 的 `claimed_investigations`

模板：

- 下方 `<investigation-ticket-template>` 标签
- 下方 `<wayfinder-map-template>` 标签

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

使用 下方 `<wayfinder-map-template>` 标签 写入 `specdev/changes/{change}/wayfinder-map.md`。地图是**索引而非仓库**：每个决策只在一处存放（对应调查 Ticket 或 Evidence），地图只给出一行摘要并链接到详情。地图包含：

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

调查者开始前原子地更新 `specdev/status.json` 的 `claimed_investigations`（领取即“认领”，先领取再动手）：

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

外部研究使用 下方 `<research>` 标签。

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

- `specdev/changes/{change}/spec.md`；
- `specdev/changes/{change}/ADR.md`；
- `specdev/changes/{change}/ticket/NN-<ticket-name>.md`；
- `specdev/changes/{change}/diagnosis.md`。

调查完成、阻塞或释放时：

1. 同步调查 Ticket、调查 Evidence、领取状态；
2. 在共享地图的“已定决策”追加一行结论索引（越界的则移入“范围之外”）；
3. 让新可表述的迷雾从“尚未指定”毕业为新 Ticket，并二次连边补齐阻塞关系；作废或被替代的 Ticket 及时更新或删除；
4. 返回 investigation 名称、状态及三份工件（调查 Ticket、Evidence、共享地图）的完整路径。

状态使用 `open | claimed | confirmed | disproved | decision-needed | unresolved | superseded | cancelled`。

### 8. 收敛与退出

当剩余未知项不再阻止目标、行为、架构、风险或验证决策时停止。根据结果进入：

- 需要产品或架构取舍 → “设计访谈能力”；
- 外部行为已清楚 → “编写 Spec 阶段”；
- Spec 已 Ready 且只是实现拆分未知 → “拆分 Tickets 阶段”；
- Bug 根因路径已收敛 → “Bug 诊断阶段”；
- 仍存在高影响未知项 → 保持 blocked，并明确下一调查或用户决策。

长期有效且经实现验证的研究，只有在归档时由 “归档与沉淀阶段” 提升。

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

- 调查 Ticket 模板：下方 `<investigation-ticket-template>` 标签
- 共享地图模板：下方 `<wayfinder-map-template>` 标签

---

## 参考内容

以下内容均已内联。主流程提到标签时，直接使用对应标签中的完整规则、模板或 schema。

<investigation-ticket-template>

## 产物 YAML 头部

生成该工件时，将以下字段写在文档开头的 YAML frontmatter 中：

```yaml
artifact: investigation-ticket
id: INV-01
name: <简短问题名称，供人按名称指代>
type: research
mode: AFK
status: open
blocked_by: []
owner: unassigned
claimed_by: null
claimed_at: null
```

# 调查：<问题名称>

> 本 Ticket 只关闭**一个**高影响未知项，产出的是决策而非交付物。想“顺手实现”时即到了地图边缘，交接而非动手。

- **调查文件：** `specdev/changes/{change}/investigation/INV-01-<name>.md`
- **共享地图：** `specdev/changes/{change}/wayfinder-map.md`
- **Evidence：** `specdev/changes/{change}/investigation/evidence/INV-01.md`

## 0. 分类

- **Type：** research / decision / validation / mapping
- **模式：** AFK（子代理独立完成）/ HITL（须与用户实时交流，代理不代答）

## 1. 决策用途

- 要回答或决定什么（一个精确问题）：
- 为什么阻塞规划：
- 结果由哪个工件消费：

## 2. 已知事实与假设

### 已知事实

### 待验证假设

## 3. 调查契约

- **允许的代码探索：** `project/relative/path/**`
- **允许的实验 / 原型：**（原型仅供用户反应，不作最终架构）
- **禁止的产品实现：**
- **来源优先级：**
- **停止条件：**
- **时间或资源边界：**

## 4. 结果

- **状态：** confirmed / disproved / decision-needed / unresolved / superseded / cancelled
- **结论：**
- **证据：**
- **置信度：** high / medium / low
- **适用范围与版本：**
- **反例或限制：**
- **对 Spec 的影响：** 无 / `specdev/changes/{change}/spec.md`
- **对 ADR 的影响：** 无 / `specdev/changes/{change}/ADR.md`
- **对 Ticket 的影响：** 无 / `specdev/changes/{change}/ticket/NN-<ticket-name>.md`
- **浮现的新迷雾 / 新 Ticket：**
- **是否越界（移入范围之外）：** 否 / 是（理由：）
- **下一步：**

</investigation-ticket-template>

<wayfinder-map-template>

## 产物 YAML 头部

生成该工件时，将以下字段写在文档开头的 YAML frontmatter 中：

```yaml
artifact: wayfinder-map
change: <YYYY-MM-DD-topic>
status: active
```

# Wayfinder Map: <目标名称>

> 本地图是**索引而非仓库**：每个决策只在一处存放，地图只给一行摘要并链接到详情。凡是人会读到的叙述，用**名称**指代 Ticket，不用裸编号。

- **共享地图：** `specdev/changes/{change}/wayfinder-map.md`
- **调查目录：** `specdev/changes/{change}/investigation/`
- **领取状态：** `specdev/status.json`

## 1. 目标

<终点长什么样，一到两行。目标是第一动作，塑造每一个 Ticket，并固定范围。>

## 2. 笔记

- **领域：**
- **需参考的 skills：**
- **固定偏好 / 约束：**
- **执行授权：** 默认只产出决策不产出交付物；如需把执行纳入地图，在此显式写明。

## 3. 调查清单（前沿由此表投影）

> 前沿 = `open` + 依赖已满足（unblocked）+ 尚未领取（unclaimed）的行。走完地图时只从前沿取 Ticket。

| 名称 | ID | Type | 模式 | 问题 | Blocked By | Owner/Claim | 状态 | Result |
|---|---|---|---|---|---|---|---|---|
| 示例：登录态跨域刷新策略 | INV-01 | research | AFK | ... | — | unassigned | open | `specdev/changes/{change}/investigation/INV-01-<name>.md` |

- Type：research（可证实）/ decision（需取舍）/ validation（需实验验证）/ mapping（建立调用链/影响面）。
- 模式：AFK（子代理独立完成，典型 research/mapping）/ HITL（须与用户实时交流，代理不代答，典型 decision）。

## 4. 调查 DAG

```text
INV-01
  ├─→ INV-02
  └─→ INV-03
```

- 标记可并行调查与必须串行的决策点，避免多个调查重复回答同一问题。

## 5. 并行与领取规则

- 最大并发来自 `specdev/config.json`。
- 当前领取集合以 `specdev/status.json` 为权威。
- 同一调查 Ticket 只能有一个 owner/session。
- **research / AFK 型可并行领取**；**decision 及其他 HITL 型，单会话一次只解决一个**（research 除外），逐个解决让地图稳定生长。
- 共享地图是状态投影，领取变更后必须同步；写回前先重读，预期并发编辑。

## 6. 已定决策（实际走过的路线）

> 每关闭一个 Ticket 追加一行结论索引。越界工作不写这里，移入“范围之外”。

| 名称 | 结论（一行） | 置信度 | 消费工件 | 详情指针 |
|---|---|---|---|---|

## 7. 尚未指定（战争迷雾）

> 范围内、已隐约感到会出现、但此刻还无法**精确表述**的决策。看得清就毕业成第 3 节的 Ticket，看不清就留在这里。不要预先切成 Ticket 大小的碎片。

- ...

## 8. 范围之外

> 超出目标的工作。永不毕业回地图；目标被重画时作为新 change 处理。已存在 Ticket 若被发现越界，关闭后在此留一行摘要与理由。

| 被排除的工作 | 理由 |
|---|---|

## 9. 停止条件

- [ ] 目标已命名，并塑造了地图上的每个 Ticket。
- [ ] 所有高影响未知项已 confirmed、disproved，或明确转为用户/owner 决策。
- [ ] 战争迷雾中不再有阻塞目标、且已可精确表述却未立 Ticket 的问题。
- [ ] 可以形成 Ready Spec、Ticket、诊断契约或架构决策。
- [ ] 没有把产品实现留在调查 Ticket 中。
- [ ] 所有 claim 已释放或转为明确 blocked。

</wayfinder-map-template>

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
  "schema_version": 3,
  "workflow": "specdev",
  "active": [],
  "work_history": [],
  "completed": []
}
```

</status-template>

<status-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:status:v3",
  "title": "SpecDev Global Status",
  "type": "object",
  "required": [
    "schema_version",
    "workflow",
    "active",
    "work_history",
    "completed"
  ],
  "properties": {
    "schema_version": {
      "const": 3
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
          "works_run",
          "result"
        ],
        "properties": {
          "change": {
            "type": "string"
          },
          "current_work": {
            "type": [
              "string",
              "null"
            ]
          },
          "works_run": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "result": {
            "type": [
              "string",
              "null"
            ]
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
              "additionalProperties": true
            }
          }
        },
        "additionalProperties": true
      }
    },
    "work_history": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "change",
          "work_id",
          "started_at",
          "completed_at",
          "result"
        ],
        "properties": {
          "change": {
            "type": "string"
          },
          "work_id": {
            "type": "string",
            "pattern": "^specdev/"
          },
          "started_at": {
            "type": "string"
          },
          "completed_at": {
            "type": [
              "string",
              "null"
            ]
          },
          "result": {
            "type": [
              "string",
              "null"
            ]
          }
        },
        "additionalProperties": true
      }
    },
    "completed": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "change",
          "archived_at",
          "archive_path"
        ],
        "properties": {
          "change": {
            "type": "string"
          },
          "archived_at": {
            "type": "string"
          },
          "archive_path": {
            "type": "string",
            "pattern": "^specdev/archive/[0-9]{4}-[0-9]{2}/.+/$"
          }
        },
        "additionalProperties": true
      }
    }
  },
  "additionalProperties": true
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
