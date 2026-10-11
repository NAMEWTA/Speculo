# 编写 Spec

## 网页平台运行约定

本文是可独立上传的单文件能力快照，不依赖 Speculo CLI 的根别名或源目录。执行时统一采用以下逻辑布局：

- 项目根下的 `specdev/` 是状态区；全局配置与状态分别为 `specdev/config.json` 和 `specdev/status.json`。
- 当前 change 位于 `specdev/changes/{change}/`，其中 `{change}` 使用 `YYYY-MM-DD-<kebab-topic>`。
- 当前 change 的设计、规划和证据工件都写入该目录；永久 ADR、领域上下文和研究分别写入 `specdev/adr/`、`specdev/context/` 和 `specdev/research/`。
- `specdev/config.json` 或 `specdev/status.json` 不存在时，分别按下方 `<config-template>` 和 `<status-template>` 标签创建；新建 change 时按下方 `<change-status-template>` 标签创建 `.status.json`。对应 schema 用于结构核对。
- 项目代码与测试始终使用项目根相对路径；不写机器绝对路径。工件之间使用上述逻辑路径，不使用 Speculo 的运行时路径标签。
- 如果网页平台不能直接写项目文件，则按目标文件名输出完整内容，并在答复中明确应保存的位置；不得把“无法写文件”伪装成已经持久化。
- 若本地项目提供 Speculo Node 校验器，可运行它补充结构校验；纯网页环境按本文内联的 schema、Ready 清单和完成标准逐项核对，并明确记录未运行的自动校验。
- 本地只读 Goal 控制器和 Plan 合同校验库不随网页快照提供，不能把其名称当作可执行命令。网页执行者按内联 map-control/调用合同逐项计算依赖与门禁；缺少真实项目 Skill 源或执行能力时阻塞对应任务，不声称自动验证通过。
- 提交、推送、合并、部署、发布、归档移动和不可逆迁移仍需用户明确授权。

激活后读取 SpecDev 的激活合同 与 下方 `<activation-and-memory>` 标签。本 Work 综合已有事实，定义为什么、为谁、系统应表现为何，不另开宽泛访谈，也不写逐文件施工计划。

## 形成行为合同

1. **Grounding**：定位用户目标与当前代码、测试、接口、schema、配置和运行事实。按存在情况定位 change 的来源、分诊、诊断、LOG、CONTEXT、ADR 及相关永久领域词汇/决策；只回读命中原文，可选工件缺失静默跳过，不当作已确认事实。按 下方 `<planning-principles>` 标签 区分可发现事实、高影响偏好和可逆实现细节；冲突按 下方 `<artifact-contract>` 标签 返回权威 owner。
2. **关闭必要决定**：只确认会改变外部行为、接口、数据、兼容、安全、迁移、发布或验收的高价值问题。广泛取舍未定时返回 “设计访谈能力”；陌生外部依赖或版本行为通过 下方 `<research>` 标签 查证。不虚构错误码、性能阈值、法规或迁移政策。
3. **写入合同**：以 下方 `<spec-template>` 标签 写入 `specdev/changes/{change}/spec.md`。模板拥有问题/用户/成功、正常/边界/失败/角色/状态行为、IN/REUSE/OUT、保持项、接口数据与 NFR 的完整结构及 `US-### / AC-### / NFR-### / DEC-### / OOS-###` 稳定编号。实现约束仅锁定会影响公共合同、兼容、安全或验收的决定。
4. **绑定验证接缝**：优先复用稳定接缝，通常从用户端到端行为、公共 API/CLI、事件/集成、稳定单元接缝选择；按实际风险与项目先例决定，不机械追求最高测试层级。每个接缝注明入口类型/位置、触发方式、可观察结果、覆盖 AC 和实际测试先例/命令。选择显著改变可测试性、事故半径或范围时聚焦确认；可由已有代码推导时记录依据即可。证据遵守 下方 `<evidence-and-verification>` 标签。
5. **Readiness**：对照 下方 `<spec-readiness>` 标签 与 下方 `<spec-schema>` 标签。高影响未决问题使 `ready_for_tickets: false`；低影响、可逆默认值可作为带验证方式的显式假设。每个 AC 必须可观察、可判定、绑定接缝；不适用影响写明理由。

## 失败与兼容合同

适用时读取 下方 `<ref-common-rules-error-handling>` 标签，把未开始/部分发生/已提交/未知结果、重复/乱序/取消、可重试前提、状态有效性和可见诊断写入原 AC/NFR。公共接口与旧数据变更须给出兼容、迁移和恢复限制。每项绑定真实可观察接缝或待建设接缝，不虚构错误码、性能阈值或安全保证。已知低风险变更不为了填表增加无关条款。

## 验证、状态与交接

```bash
node Speculo Node 校验器 --stage spec --repo <project-root> specdev/changes/{change}
```

回读真实 Spec、Ready 结论与状态，按激活合同只更新本 change 与全局索引的所属项。返回 Spec 完整路径、主要行为/验收合同、范围、验证接缝、风险、高影响缺口和验证结果。成功完成本 Work 才更新 `works_run` 并清空 `current_work`；可恢复失败保留入口。

只有用户请求或工作流已显式串联时才进入 “拆分 Tickets 阶段”；产出 Ready Spec 本身不授权实施。

## 原型证据

可以引用已验证 LOGIC/UI 原型中的行为、边界与已确认决定，记录具体 locator 和验证证据；源码片段可承载设计选择，但不自动成为生产实现。未闭合高影响产品决定返回 G，S 综合已确认设计而不重新开启无关访谈。

---

## 参考内容

以下内容均已内联。主流程提到标签时，直接使用对应标签中的完整规则、模板或 schema。

<spec-readiness>

# Spec Readiness

本检查适用于 `specdev/changes/{change}/spec.md`。

- [ ] 问题、目标用户和成功标准从用户或调用者视角可理解。
- [ ] 主要、边界、错误、角色和状态场景足以生成垂直切片。
- [ ] 每个用户故事至少被一个验收合同覆盖。
- [ ] 每个验收合同可观察、可判定且有验证接缝。
- [ ] IN、REUSE、OUT 无冲突。
- [ ] 公共接口、数据、兼容、安全、迁移和发布影响已决定或明确不适用。
- [ ] 已锁定实现约束有来源，没有把偏好伪装成事实。
- [ ] 高影响未决问题为零。
- [ ] 低影响假设可逆且有验证方式。
- [ ] 项目路径引用使用项目根相对路径，内部工件使用本文约定的逻辑路径。
- [ ] Spec 不包含逐文件施工清单或容易过时的行号承诺。
- [ ] `ready_for_tickets: true` 与实际内容一致。

</spec-readiness>

<spec-template>

## 产物 YAML 头部

生成该工件时，将以下字段写在文档开头的 YAML frontmatter 中：

```yaml
schema_version: 3
artifact: spec
change: <YYYY-MM-DD-topic>
status: draft
ready_for_tickets: false
sources:
  - USER-DECISION:<summary>
```

# Spec: <标题>

- **Spec：** `specdev/changes/{change}/spec.md`
- **当前 ADR：** `specdev/changes/{change}/ADR.md`
- **当前领域上下文：** `specdev/changes/{change}/CONTEXT.md`

## 1. 问题与目标

### 问题陈述

### 目标用户与场景

### 成功标准

### 非目标

## 2. 解决方案与外部行为

### 解决方案摘要

### 主要流程

### 边界、失败与稳定错误行为

### 状态转换与不变量

## 3. 用户故事

- **US-001**：作为 <角色>，我希望 <能力>，以便 <收益>。

## 4. 验收合同

| ID | 前置条件 | 动作或事件 | 可观察结果 | 验证接缝 |
|---|---|---|---|---|
| AC-001 | ... | ... | ... | ... |

## 5. 范围

### IN

### REUSE

### OUT

- **OOS-001**：<不做什么及原因>。

## 6. 已锁定实现约束

- **DEC-001**：<只写影响公共接口、数据、不变量、兼容、安全或验证的决策>。来源：`ADR-###`。

## 7. 数据、接口与兼容

- **公共接口变化：** 无 / ...
- **数据模型与持久化：** 无 / ...
- **兼容要求：** 无 / ...
- **迁移要求：** 无 / ...
- **发布或运维影响：** 无 / ...

## 8. 非功能要求

- **NFR-001 安全与隐私：**
- **NFR-002 性能与容量：**
- **NFR-003 可用性与可靠性：**
- **NFR-004 可观测性与运营：**

不适用的维度写“不适用：原因”。

## 9. 验证策略

| 接缝 | 层级 | 覆盖合同 | 现有先例或命令 | Evidence 类型 |
|---|---|---|---|---|

项目测试先例可引用项目相对路径，例如 `tests/example.test.ts`。

## 10. 风险、假设与未决问题

### 风险

### 已采用的低影响假设

### 未决问题

无。

存在高影响未决问题时，`ready_for_tickets` 必须为 `false`。

## 失败与兼容补充（适用时）

在原 AC/NFR 编号下记录取消/重复/乱序、未开始/部分提交/已提交/未知结果、可安全重试前提、状态 owner、可观察错误和旧数据迁移/恢复限制。这里只补充适用合同，不新增另一套验收编号或实现计划。

</spec-template>

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

<artifact-contract>

# 工件职责与权威裁决

SpecDev 通过分层工件避免同一决策被多个模型反复重做。每个工件只承担自己的权威边界。

## 1. 工件职责

| 工件 | 具体位置 | 必须决定 | 不应决定 |
|---|---|---|---|
| 来源快照 | `specdev/changes/{change}/source.md` | 原始请求、捕获时间、locator、hash 和关闭能力 | 当前产品合同或实现状态 |
| 分诊 | `specdev/changes/{change}/triage.md` | 请求类别、影响、风险、缺失输入、下一 work、源 Issue reconcile 状态和 publish_action | 详细实现方案、开发进度或票级发布账本 |
| 发布账本 | `specdev/changes/{change}/publish.md` | 票级 GitHub 投影的编号、标签、marker、state 和发布计数 | Ticket 契约、Evidence 原文或源 Issue 关闭 |
| 捕获账本 | `specdev/capture.md` | 尚未成 Change 的记事项、GitHub inbox 编号、标签、marker 和 inbox 计数；缺失合法 | Change、Ticket、Evidence 或已完成票的发布投影 |
| 诊断 | `specdev/changes/{change}/diagnosis.md` | 复现、证据、根因、修复不变量和回归契约 | 未经验证的修复实现 |
| 设计日志 | `specdev/changes/{change}/LOG.md` | 讨论轨迹、确认、延后、替代与废弃结论 | 当前架构权威摘要 |
| 设计树 | `specdev/changes/{change}/design-tree.json` | 决策节点、依赖、当前 frontier、轮次与共识状态 | 领域真相或架构决定正文 |
| Change 领域上下文 | `specdev/changes/{change}/CONTEXT.md` | 本 change 已确认、供下游使用的领域术语和语义 | 永久领域知识或临时会议记录 |
| Change 架构决策 | `specdev/changes/{change}/ADR.md` | 已成为本 change 下游合同的架构决策、原因、后果和替代关系 | 永久项目 ADR 或尚未决定的方案集合 |
| Spec | `specdev/changes/{change}/spec.md` | 用户问题、外部行为、范围、验收合同、非功能要求和已锁定实现约束 | 文件级施工步骤 |
| Ticket | `specdev/changes/{change}/ticket/NN-<ticket-name>.md` | 单一垂直切片的行为、决策、范围、路径所有权、执行路线和验证证据 | 跨 Ticket 里程碑治理或远程 Issue 编号 |
| Tickets Map | `specdev/changes/{change}/tickets-map.md` | 总体实施背景、项目 Skill 最低调用路由、依赖 DAG、合同覆盖、Ready 投影、并行候选和路径冲突 | 单 Ticket 的完整实现契约 |
| Goal Plan | `specdev/changes/{change}/goal-plan.md` | 跨 Ticket 调度、Gate、共享所有权、迁移顺序、集成和偏差治理 | 复制 Ticket 全文 |
| Implementation Map | `specdev/changes/{change}/implementation-map.md` | Ready 成员、组合 Ticket inventory、跨 change dependency/serialization 与 revision | 创建或改写子 Spec、Ticket 或实现细节 |
| Implementation Plan | `specdev/changes/{change}/implementation-plan.md` | 父 Lead、全局 workspace/实现上限、frontier/Wave/locks/integration queue 和可恢复进度投影 | 改写子 change 权威或伪造完成 |
| Implementation Orchestration Evidence | `specdev/changes/{change}/evidence/implementation-orchestration.md` | 成员完成、组合 Ticket 顺序/锁、repository integration、整体验证、漂移和残余风险 | 新产品/架构决定或单 Ticket Evidence 替代品 |
| Evidence | `specdev/changes/{change}/evidence/T-NN.md` | 实际修改、命令、结果、验收映射、偏差、风险和提交引用 | 新的产品或架构决策或远程 Issue 正文 |
| Change 学习图解 | `specdev/changes/{change}/learning/index.md` 与 `specdev/changes/{change}/learning/{number}_{topic}.md` | 面向零专业背景读者解释当前 change 的已验证工件、实现和测试事实；索引按序号持续追加 | 产品决定、架构决定、实现授权或 Learning workflow 知识 |
| 代码审查 | `specdev/changes/{change}/reviews/CR-###.md` | 固定点、标准轴和规范轴 finding | 实施修复或合并两轴排名 |
| UI 设计包 | `specdev/changes/{change}/prototypes/{design-id}/design-system.md`、`specdev/changes/{change}/prototypes/{design-id}/comparison/` 与 `specdev/changes/{change}/prototypes/{design-id}/final/` | 项目 UI 证据、功能风格候选、逐层用户决定、设计 token、交互合同和可运行 HTML/CSS/JS 投影 | 生产 UI 实现或替用户确认高影响偏好 |
| Stakeholder 问卷 | `specdev/changes/{change}/questionnaires/{slug}.md` | 第三方原始回答和恢复条件 | 未经转录确认的产品/架构决定 |
| Wayfinder 地图 | `specdev/changes/{change}/wayfinder-map.md` | 目的地、说明、已关闭决策索引、战争迷雾和范围之外 | 开放 Ticket 正文或答案详情 |
| Wayfinder Ticket | `specdev/changes/{change}/investigation/{investigation-id}.md` | 一个可精确陈述的问题、类型、阻塞和关闭状态 | 解决方案评论或交付目标 |
| Wayfinder solution comment | `specdev/changes/{change}/investigation/comments/{investigation-id}/NN-solution.md` | Ticket 的答案、结果事实和资产指针 | 地图索引或产品实现 |
| 架构审查 | `specdev/changes/{change}/architecture-review.md` | 结构性候选、code-judo 机会、证据、选择和访谈状态 | 未经用户选择的执行契约 |

UI 设计包中的 `{design-id}` 由 P-prototype 分配为当前 change 内最小未占用的 `UI-NNN`；设计系统文档是唯一设计权威，comparison 与 final 不建立第二套规则。

Change CONTEXT/ADR 是 active change 内的执行权威，不是 workflow 级永久知识。G 和其他设计/执行 Works 只读 `specdev/context/` 与 `specdev/adr/`；只有 A 在 change 完成、实现证据验证、毕业评估和用户确认后才能写入永久 namespace。未毕业内容随归档 change 保留，不能从 change 工件消失。

## 2. 权威顺序

同一事项冲突时按下列顺序裁决：

1. 用户最新明确决定；
2. 当前 change 已接受的架构决策：`specdev/changes/{change}/ADR.md`；
3. 永久 ADR 与领域上下文：`specdev/adr/`、`specdev/context/`；
4. 当前外部行为权威：`specdev/changes/{change}/spec.md`；
5. 当前 Ticket 契约：`specdev/changes/{change}/ticket/NN-<ticket-name>.md`；
6. 当前跨 Ticket 编排：`specdev/changes/{change}/goal-plan.md`；
7. 若当前 change 属于父实现 change，父 Implementation Map 对组合 Ticket dependency/serialization 具有权威，父 Implementation Plan 拥有全局 workspace、frontier 与 integration queue；
8. 当前代码与运行事实；
9. 旧计划、旧日志和未经确认的推断。

当前 change 决定与永久知识冲突时，必须在 LOG/ADR 中显式说明替代关系；它只约束当前 change，直到 A 决定是否提升并更新永久版本。

`specdev/changes/{change}/source.md` 只对“原始输入是什么”具有权威；后续用户决定、ADR 和 Spec 可以显式演进该意图。远程来源在摄入后发生变化不会自动改写本地合同，必须重新 Triage。GitHub 上由 publish 投影出的 Issue 不是开发权威；发布计数以 `specdev/changes/{change}/publish.md` 为准。GitHub 上由 capture 记下的 inbox Issue 也不是开发权威；inbox 计数以 `specdev/capture.md` 为准，缺失该文件视为空 inbox。

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

## 5. Initiative 与计划调用扩展

W 的 `specdev/changes/{change}/initiative.json` 只拥有候选 change 的边界、未知、依赖和目标指针；每个物化 child 的 Grill、Spec、Ticket 和状态仍独立。候选图不是实施 DAG，也不是共享可写设计树。

新 Ticket/普通 Map 保持原 schema_version，并使用 plan_contract_version: 1 扩展。Ticket 拥有经过核实的 Skill 调用绑定、语义资源和执行计划；Map 路由是其投影。规则为 下方 `<ref-common-rules-skill-invocation>` 标签。计划、产物数量与完成证据漂移必须由对应 owner 修订；不能仅改 map 状态。

父 `specdev/changes/{change}/tickets-map.md` 是 goal-tickets-map 无状态入口，只引用现有 Implementation Map/Plan；它不能拥有第二份 status、owner 或任务清单。统一 P 拥有生命周期，旧 O 仅保留入口与恢复键。

## 新增工件 owner

- T：specdev/changes/{change}/pull-requests/PR-###.md 拥有 PR 交付回执；specdev/triage-runs/TRI-###.md 拥有独立远程操作，绝不复用 external_action/publish_action/capture。
- R-retro：specdev/changes/{change}/retro/RETRO-###.md 拥有活动复盘建议和来源；不成为永久知识。
- P：specdev/changes/{change}/prototypes/LOGIC-NNN/logic.md 记录逻辑模型与浏览器证据；index.html 是可运行原型，ready 时 hash 与记录一致。
- 来源更新：specdev/changes/{change}/source.md 冻结后保持不变。T 将后续读取写入 specdev/changes/{change}/sources/SRC-###.md，记录 replaces、固定 SHA/hash、完整性和原 locator，triage 正文选择有效快照；不得把新远程事实自动升级为已接受 Spec。

## 专业分支的证据归属

R.performance 的测量卡、原始样本引用和优化候选仍由 architecture-review 拥有，不直接修改生产代码。I.documentation 修改获批项目文档并在原本票或 Direct Spec Evidence 保存验证；不另造文档状态。D.evidence-triage 在 diagnosis 的现象/事件节记录观察、未知与下一检查；它不是已经接受的根因或修复合同。具体记录见 下方 `<ref-common-rules-engineering-evidence>` 标签。

代码、运行证据可以证明计划尚未实现或已过时，但不能改写用户目标。ADR 记录采纳与真实备选；未确认解释属于 LOG/设计树，未完成计划不能进入当前事实摘要。实际文档职责遵守 下方 `<ref-common-rules-documentation-standard>` 标签。

</artifact-contract>

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

任一条件触发：公共 API、schema、wire format、数据迁移、认证授权、隐私、资金、不可逆操作、expand-contract、共享核心路径、多个 implementation owner 的跨 Ticket 写入协调、多个实质架构方案或高事故半径。

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

<evidence-and-verification>

# 证据与验证规范

验证回答“怎样证明”，Evidence 记录“实际运行了什么、在哪个状态运行、结果和残余风险是什么”。

## 1. 验证矩阵

每行绑定行为、合同或风险，并标记环境：

| 行为或风险 | 接缝 | 命令/方法 | 环境 | 预期 | Evidence |
|---|---|---|---|---|---|
| 正常/失败路径 | 公共接口或稳定接缝 | 定向测试 | current-workspace 或 source-worktree | 合同成立 | Ticket Evidence |
| 跨模块回归 | 集成接缝 | 回归命令 | current-workspace 或 parent-candidate | 组合状态成立 | Ticket Evidence |
| E2E required | 真实端到端边界 | 场景步骤 | current-workspace 或 parent-candidate | 外部行为成立 | Ticket Evidence |

## 2. 两层验证

### Current workspace

current 模式的 implementation owner 在当前父分支和当前 workspace 工作。Ticket 必须严格串行，workspace clean 后形成非空 implementation commit；Lead 在同一 workspace 执行适用集成/回归和 E2E，并在父 HEAD 未漂移时将 Ticket commit 记录为 result SHA。

### Source-worktree

implementation owner 运行最接近目标行为的单元/组件测试、静态分析、类型、lint/build 等适用非 E2E 检查。来源实现必须在 clean worktree 形成 commit。任何 source-worktree E2E pass 声明无效。

### Parent-candidate

required 模式下，Lead 在最新父分支与 source commit 的 candidate 状态运行受影响集成/回归、项目父状态检查和适用 E2E。E2E 由实际跨边界风险决定，不限于 UI；not-required 必须写理由。required E2E 未运行或失败时不得推进父分支。

### Direct Spec

获批 Direct Spec 不创建 Ticket worktree 或 candidate。Lead 在 current workspace 记录实施前基线，运行轻量合同要求的定向检查、适用回归与 E2E，并记录最终 checkpoint、dirty 状态、运行环境、命令、退出状态和未运行原因。E2E 仍只由 Lead 执行；不得为套用两层验证而伪造 Ticket、source/candidate/result 或父分支推进证据。

低层证据不能替代明确要求的外部行为证据。高风险迁移还需要 dry-run、调用点扫描、数据核对、监控或恢复演练。

## 3. Agent 声明

subagent 只返回候选命令与结果，不写 Evidence。Lead 重读 workspace/Git、必要时复跑或核对输出后落盘；外部 provider 自报、截图、模拟和推断在此之前标记 `unverified`。review/research/test-observation agent 不拥有 E2E Gate。

## 4. 失败分类与完整性

失败分类为本 Ticket 新失败、基线既有失败、环境/权限/基础设施失败、无效验证或 candidate stale。不得通过跳过、放宽断言、吞错、删除用例或迁移验证位置制造绿色。

受控反向验证只用于可能静默通过的关键门禁：证明检查能在目标风险出现时失败，再恢复并重跑。普通测试不为形式执行破坏性操作。

## 5. Evidence 最低内容

每个 Ticket Evidence 至少包含：Lead、Dispatch/返回（若有）、workspace 策略、base/source/result SHA、candidate 字段（required 模式适用，current 模式明确不适用）、实际路径、每条命令/环境/退出状态、合同映射、双轴审查、E2E disposition、未运行项、失败分类、偏差、残余风险和父分支重读结果。

required Ticket Done 必须有 source commit、通过 candidate、父分支 result 与 Lead Evidence；current Ticket Done 必须有 implementation commit、通过 direct-parent 验证、父分支 result 与 Lead Evidence。无法运行 required 验证、存在未批准偏差、父分支未包含 Ticket commit 或 Evidence 不完整时不得 Done。

Direct Spec Evidence 至少包含：用户批准与轻量合同、Lead、实施前/最终 checkpoint、实际路径、定向/回归/E2E 命令及环境、验收映射、未运行项、偏差、残余风险和提交授权状态。

父实现 change 的 Implementation Orchestration Evidence 不能替代子 Evidence。它至少记录最终 Map revision、全部成员最终状态和子证据指针、dependency/serialization 实际顺序、跨 change 合同检查、aggregate 命令/环境/结果、stale candidate 处理、偏差和残余风险。任何成员未 completed 或整体验证未通过时不得形成父完成证据。

Evidence 原文不出仓库。对 GitHub 的公共投影由 T-triage publish 按公共投影规则生成，不替代本文件的完整记录。

## 6. 按改动选择检查与复用证据

先固定当前真实 base/head、dirty 写集、配置和消费者，选择能在本次回归上失败的最窄检查；动态配置、Worker、子进程、发布构件或跨模块接口需显式选择真实入口。CI 负责目标项目规定的全量矩阵，本地不因 commit/push 机械重跑刚通过且仍有效的检查；原 required Gate 不因此降级。

复用记录须给出原证据、代码/输入/配置/Skill 摘要、命令选择、环境和仍成立的原因。基线合入、head 改变、配置/依赖/生成器或被测输入变化时重估失效范围；不能把不相关改动当作所有证据永久无效，也不能沿用旧 head 的完成结论。readiness、skipped、pending、环境失败和未运行分别报告。

异步、资源、CI 或测试删除使用 下方 `<ref-common-rules-test-reliability>` 标签；失败后的状态和安全继续使用 下方 `<ref-common-rules-error-handling>` 标签。验证结果须关联真实退出、事件、文件或输出，不能只相信组件/Agent 自报。

## 7. 特殊行为与文档证据

纯文档使用可执行示例、链接、类型与生成一致性、源码语义核对；不适用代码 TDD/E2E时明确理由。prompt、工具定义、错误或 UI/CLI 字符串改变属于行为变化，检查真实模型/用户可见内容，不只检查 Markdown。UI 原型、mock、真实服务器演示分别标记；录制证据对应准确提交、环境、运行方式和片段，不能拼接不同运行冒充一次成功，也不强制无关任务录 GIF。

性能测量必须有真实用户操作、可比较工作量/时钟/冷暖状态、原始样本与端到端结论；微基准改善不能代替整体收益。专业分支仅在原报告追加 下方 `<ref-common-rules-engineering-evidence>` 标签，结构通过不证明测量、翻译或工具执行真实。

删除、合并测试的决定需记录旧行为/错误/兼容/回归到新用例的覆盖承接；无法证明就保留。新准入规则至少有一个从真实执行入口失败的反例，并在恢复基线后确认通过。

</evidence-and-verification>

<deviation-control>

# 偏差控制

偏差是“当前事实或实现需要偏离已批准工件”的显式事件。偏差不是普通进度说明，也不能作为先改后补文档的许可证。

## 1. 偏差等级

- **local**：只改变局部实现，不改变 Ticket 的行为、范围、公共契约、路径所有权或验证；记录到 Evidence 后可继续。
- **ticket**：改变 Ticket 的执行路线、可写范围、局部契约或验收映射，但不改变 Spec；必须停止相关修改、更新 Ticket 并获得该 Ticket 或计划明确的批准 owner 同意。
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
- 父 Implementation Map 的成员、组合 Ticket、dependency、serialization 或 revision 已与子状态、路径或 Git 事实不一致。

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
- 偏差影响并行执行、source checkpoint 或 candidate 集成时，Lead 必须暂停受影响 Wave，重新计算路径所有权、依赖、Gate 与父分支顺序；任何 subagent 都不能自行改写上层合同。
- 偏差跨越多个成员时，父 Lead 先递增 Implementation Map revision，再重算 Implementation Plan；旧派单和 candidate 全部标记 stale。

</deviation-control>

<research>

# SpecDev Research

## 输入

- `decision`：研究要支持的一个具体决定；
- `questions`：需要回答的穷尽问题集；
- `stop_condition`：何时证据已足够；
- `caller`：D、G、S、W、R、T 或 I；
- `target_artifact`：调用方拥有且将接收结果的完整 Path。

缺少 owner 或 target 时返回阻塞，不创建 `{change}/research/` 等共享 namespace。

## 流程

1. 固定问题、版本、环境和停止条件。
2. 优先官方文档、规范、源代码、论文或维护者材料；技术问题使用一手来源。
3. 核对发布日期、版本、适用环境、限制和已知冲突。
4. 对每个会改变决定的实质声明就近给出来源；关键结论交叉验证，来源冲突时并列呈现。
5. 区分来源事实、代码库事实、推断、建议和未知项。
6. 返回一个 Markdown block，由 caller 原子写入 `target_artifact`；本 Skill 不自行写 state。

## 输出

```markdown
## Research: <问题>
- Decision / target:
- Scope / version:
- Stop condition:

### R-001
- Claim:
- Type: official fact / code fact / inference / recommendation
- Source:
- Confidence:
- Limits:
- Artifact impact:

### Conflicts and Unknowns
### Recommendation
```

不得长篇复制受版权保护内容。长期有效且经实现验证的结论只能由 Archive 从调用方工件提升到永久 research。

## 完成标准

- 每个输入问题有答案或明确未知；
- 每个实质声明就近引用一手来源；
- 版本、限制、冲突和置信度已记录；
- 结果有唯一 owning artifact；
- 本 Skill 没有创建自己的 state 路径。

</research>

<config-template>

```json
{
  "schema_version": 6,
  "interaction_language": "zh-CN",
  "artifact_language": "zh-CN",
  "git": {
    "default_branch": null
  },
  "execution": {
    "max_implementation_agents": 3,
    "max_integration_attempts": 3,
    "deep_ticket_human_approval": true,
    "shared_path_owner": "explicit"
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
    "require_evidence": true,
    "ui_design_default_candidates": 3,
    "ui_design_max_candidates": 4
  },
  "github": {
    "include_external_prs": false,
    "labels": {}
  }
}
```

</config-template>

<config-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:config:v6",
  "title": "SpecDev Configuration",
  "type": "object",
  "required": [
    "schema_version",
    "interaction_language",
    "artifact_language",
    "git",
    "execution",
    "verification",
    "planning",
    "github"
  ],
  "properties": {
    "schema_version": {
      "const": 6
    },
    "interaction_language": {
      "type": "string",
      "minLength": 1
    },
    "artifact_language": {
      "type": "string",
      "minLength": 1
    },
    "git": {
      "type": "object",
      "required": [
        "default_branch"
      ],
      "properties": {
        "default_branch": {
          "type": [
            "string",
            "null"
          ]
        }
      },
      "additionalProperties": false
    },
    "execution": {
      "type": "object",
      "required": [
        "max_implementation_agents",
        "max_integration_attempts",
        "deep_ticket_human_approval",
        "shared_path_owner"
      ],
      "properties": {
        "max_implementation_agents": {
          "type": "integer",
          "minimum": 1
        },
        "max_integration_attempts": {
          "type": "integer",
          "minimum": 1
        },
        "deep_ticket_human_approval": {
          "type": "boolean"
        },
        "shared_path_owner": {
          "type": "string",
          "minLength": 1
        }
      },
      "additionalProperties": false
    },
    "verification": {
      "type": "object",
      "required": [
        "test",
        "typecheck",
        "lint",
        "build"
      ],
      "properties": {
        "test": {
          "type": [
            "string",
            "null"
          ]
        },
        "typecheck": {
          "type": [
            "string",
            "null"
          ]
        },
        "lint": {
          "type": [
            "string",
            "null"
          ]
        },
        "build": {
          "type": [
            "string",
            "null"
          ]
        }
      },
      "additionalProperties": true
    },
    "planning": {
      "type": "object",
      "required": [
        "default_depth",
        "require_ready_gate",
        "require_evidence",
        "ui_design_default_candidates",
        "ui_design_max_candidates"
      ],
      "properties": {
        "default_depth": {
          "enum": [
            "lite",
            "standard",
            "deep"
          ]
        },
        "require_ready_gate": {
          "type": "boolean"
        },
        "require_evidence": {
          "type": "boolean"
        },
        "ui_design_default_candidates": {
          "type": "integer",
          "minimum": 2,
          "maximum": 4
        },
        "ui_design_max_candidates": {
          "type": "integer",
          "minimum": 2,
          "maximum": 4
        }
      },
      "additionalProperties": true
    },
    "github": {
      "type": "object",
      "required": [
        "include_external_prs",
        "labels"
      ],
      "properties": {
        "include_external_prs": {
          "type": "boolean"
        },
        "labels": {
          "type": "object",
          "additionalProperties": {
            "type": "string",
            "minLength": 1
          }
        }
      },
      "additionalProperties": false
    }
  },
  "allOf": [
    {
      "$comment": "ui_design_default_candidates <= ui_design_max_candidates is enforced by validate-specdev.mjs because JSON Schema cannot compare sibling numeric values."
    }
  ],
  "additionalProperties": false
}
```

</config-schema>

<status-template>

```json
{
  "schema_version": 5,
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
  "$id": "urn:speculo:specdev:status:v5",
  "title": "SpecDev Global Status",
  "type": "object",
  "required": ["schema_version", "workflow", "active", "archived"],
  "properties": {
    "schema_version": {"const": 5},
    "workflow": {"const": "specdev"},
    "active": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["change"],
        "properties": {
          "change": {
            "type": "string",
            "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
          }
        },
        "additionalProperties": false
      },
      "uniqueItems": true
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
  "schema_version": 6,
  "artifact": "change-status",
  "change": "<YYYY-MM-DD-topic>",
  "change_status": "active",
  "current_work": null,
  "works_run": [],
  "claimed_investigations": [],
  "execution_authorization": {
    "implementation_commit": {"status": "not-authorized", "source": null, "granted_at": null, "scope": "Ticket implementation commits"},
    "local_candidate_integration": {"status": "not-authorized", "source": null, "granted_at": null, "scope": "Lead-owned local direct-parent or candidate integration and parent update"},
    "source_cleanup": {"status": "not-authorized", "source": null, "granted_at": null, "scope": "Source worktree and branch cleanup"}
  },
  "leadership": {
    "current": "<owner-or-session-locator>",
    "epoch": 1,
    "assigned_at": "<ISO-8601>",
    "history": []
  },
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
  "$id": "urn:speculo:specdev:change-status:v6",
  "title": "SpecDev Change Status",
  "type": "object",
  "required": [
    "schema_version", "artifact", "change", "change_status", "current_work", "works_run",
    "claimed_investigations", "execution_authorization", "leadership", "created_at", "updated_at",
    "completed_at", "archived", "archive_path", "blockers", "deviations", "worktrees"
  ],
  "properties": {
    "schema_version": {"const": 6},
    "artifact": {"const": "change-status"},
    "change": {"type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"},
    "change_status": {"enum": ["active", "blocked", "completed", "archived"]},
    "current_work": {"type": ["string", "null"], "pattern": "^specdev/"},
    "works_run": {"type": "array", "items": {"type": "string", "pattern": "^specdev/"}, "uniqueItems": true},
    "claimed_investigations": {"type": "array", "items": {"$ref": "#/$defs/claim"}},
    "execution_authorization": {"$ref": "#/$defs/authorization"},
    "leadership": {"$ref": "#/$defs/leadership"},
    "created_at": {"type": "string", "minLength": 1},
    "updated_at": {"type": "string", "minLength": 1},
    "completed_at": {"type": ["string", "null"]},
    "archived": {"type": "boolean"},
    "archive_path": {"anyOf": [{"type": "null"}, {"type": "string", "pattern": "^specdev/archive/[0-9]{4}-[0-9]{2}/.+/$"}]},
    "blockers": {"type": "array", "items": {"type": "string"}},
    "deviations": {"type": "array", "items": {"type": "string"}},
    "worktrees": {"type": "array", "items": {"$ref": "#/$defs/worktree"}}
  },
  "$defs": {
    "claim": {
      "type": "object",
      "required": ["id", "owner", "session", "claimed_at"],
      "properties": {
        "id": {"type": "string", "minLength": 1},
        "owner": {"type": "string", "minLength": 1},
        "session": {"type": ["string", "null"]},
        "claimed_at": {"type": "string", "minLength": 1}
      },
      "additionalProperties": false
    },
    "authorization-entry": {
      "type": "object",
      "required": ["status", "source", "granted_at", "scope"],
      "properties": {
        "status": {"enum": ["authorized", "not-authorized", "revoked"]},
        "source": {"type": ["string", "null"]},
        "granted_at": {"type": ["string", "null"]},
        "scope": {"type": "string", "minLength": 1}
      },
      "allOf": [{
        "if": {"properties": {"status": {"const": "authorized"}}, "required": ["status"]},
        "then": {"properties": {"source": {"type": "string", "minLength": 1}, "granted_at": {"type": "string", "minLength": 1}}}
      }],
      "additionalProperties": false
    },
    "authorization": {
      "type": "object",
      "required": ["implementation_commit", "local_candidate_integration", "source_cleanup"],
      "properties": {
        "implementation_commit": {"$ref": "#/$defs/authorization-entry"},
        "local_candidate_integration": {"$ref": "#/$defs/authorization-entry"},
        "source_cleanup": {"$ref": "#/$defs/authorization-entry"}
      },
      "additionalProperties": false
    },
    "leadership-history": {
      "type": "object",
      "required": ["owner", "epoch", "assigned_at", "ended_at"],
      "properties": {
        "owner": {"type": "string", "minLength": 1},
        "epoch": {"type": "integer", "minimum": 1},
        "assigned_at": {"type": "string", "minLength": 1},
        "ended_at": {"type": "string", "minLength": 1}
      },
      "additionalProperties": false
    },
    "leadership": {
      "type": "object",
      "required": ["current", "epoch", "assigned_at", "history"],
      "properties": {
        "current": {"type": "string", "minLength": 1},
        "epoch": {"type": "integer", "minimum": 1},
        "assigned_at": {"type": "string", "minLength": 1},
        "history": {"type": "array", "items": {"$ref": "#/$defs/leadership-history"}}
      },
      "additionalProperties": false
    },
    "full-suite": {
      "type": "object",
      "required": ["required", "status", "reason", "evidence"],
      "properties": {
        "required": {"type": "boolean"},
        "status": {"enum": ["not-required", "pending", "passed", "failed"]},
        "reason": {"type": ["string", "null"]},
        "evidence": {"type": ["string", "null"]}
      },
      "allOf": [{
        "if": {"properties": {"required": {"const": false}}, "required": ["required"]},
        "then": {"properties": {"status": {"const": "not-required"}, "reason": {"type": "string", "minLength": 1}}}
      }],
      "additionalProperties": false
    },
    "worktree": {
      "type": "object",
      "required": ["ticket_id", "owner", "implementation_owner", "integration_owner", "provider", "base_sha", "parent_branch", "branch", "workspace_ref", "source_checkpoint", "integration", "status", "updated_at"],
      "properties": {
        "ticket_id": {"type": "string", "pattern": "^T-[0-9]{2,}$"},
        "owner": {"type": "string", "minLength": 1},
        "implementation_owner": {"type": "string", "minLength": 1},
        "integration_owner": {"type": "string", "minLength": 1},
        "provider": {"const": "git"},
        "base_sha": {"type": "string", "minLength": 1},
        "parent_branch": {"type": "string", "minLength": 1},
        "branch": {"type": "string", "minLength": 1},
        "workspace_ref": {"type": "string", "pattern": "^(?:current|specdev-worktree/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*/T-[0-9]{2,})$"},
        "source_checkpoint": {"type": ["string", "null"]},
        "integration": {"$ref": "#/$defs/integration"},
        "status": {"enum": ["planned", "active", "review", "integrating", "integrated", "removed", "blocked"]},
        "updated_at": {"type": "string", "minLength": 1}
      },
      "allOf": [
        {
          "if": {"properties": {"workspace_ref": {"const": "current"}}, "required": ["workspace_ref"]},
          "then": {
            "properties": {
              "integration": {
                "allOf": [{
                  "properties": {
                    "candidate_sha": {"const": null},
                    "candidate_tree_sha": {"const": null},
                    "candidate_branch": {"const": null},
                    "candidate_workspace_ref": {"const": null},
                    "method": {"enum": [null, "direct-parent"]}
                  }
                }]
              }
            }
          },
          "else": {
            "properties": {
              "integration": {
                "allOf": [{"properties": {"method": {"enum": [null, "fast-forward", "merge-commit"]}}}]
              }
            }
          }
        }
      ],
      "additionalProperties": false
    },
    "integration": {
      "type": "object",
      "required": ["status", "parent_ref", "parent_before_sha", "source_sha", "candidate_sha", "candidate_tree_sha", "candidate_branch", "candidate_workspace_ref", "result_sha", "method", "conflict_paths", "verification", "full_suite", "e2e", "evidence", "attempts", "promotion_status"],
      "properties": {
        "status": {"enum": ["pending", "candidate", "passed", "failed", "stale"]},
        "parent_ref": {"type": ["string", "null"]},
        "parent_before_sha": {"type": ["string", "null"]},
        "source_sha": {"type": ["string", "null"]},
        "candidate_sha": {"type": ["string", "null"]},
        "candidate_tree_sha": {"type": ["string", "null"]},
        "candidate_branch": {"type": ["string", "null"]},
        "candidate_workspace_ref": {"anyOf": [{"type": "null"}, {"type": "string", "pattern": "^specdev-worktree/\\.integration/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*/T-[0-9]{2,}$"}]},
        "result_sha": {"type": ["string", "null"]},
        "method": {"enum": [null, "direct-parent", "fast-forward", "merge-commit"]},
        "conflict_paths": {"type": "array", "items": {"type": "string"}},
        "verification": {"enum": ["pending", "passed", "failed"]},
        "full_suite": {"$ref": "#/$defs/full-suite"},
        "e2e": {"$ref": "#/$defs/full-suite"},
        "evidence": {"type": "string", "pattern": "^\\{roots\\.state\\}/specdev/changes/[^<]+/evidence/T-[0-9]{2,}\\.md$"},
        "attempts": {"type": "integer", "minimum": 0},
        "promotion_status": {"enum": ["pending", "applying", "applied", "failed", "stale"]}
      },
      "additionalProperties": false
    }
  },
  "allOf": [{
    "if": {"properties": {"change_status": {"const": "archived"}}, "required": ["change_status"]},
    "then": {"properties": {"archived": {"const": true}, "archive_path": {"type": "string", "pattern": "^specdev/archive/[0-9]{4}-[0-9]{2}/.+/$"}}}
  }],
  "additionalProperties": false
}
```

</change-status-schema>

<spec-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:spec:v3",
  "title": "SpecDev Spec Frontmatter",
  "type": "object",
  "required": ["schema_version", "artifact", "change", "status", "ready_for_tickets", "sources"],
  "properties": {
    "schema_version": {"const": 3},
    "artifact": {"const": "spec"},
    "change": {"type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"},
    "status": {"enum": ["draft", "ready", "superseded"]},
    "ready_for_tickets": {"type": "boolean"},
    "sources": {"type": "array", "items": {"type": "string", "minLength": 1}, "minItems": 1, "uniqueItems": true}
  },
  "additionalProperties": true
}
```

</spec-schema>

<activation-and-memory>

# Activation and memory retrieval protocol

本规则只在用户明确激活当前 workflow 或某个 Work 后读取。INDEX 只用于被动发现，不初始化状态、不读取 active change、不写入知识。

## Locate before read

1. 先打开 `workspace.json`，从中解析当前 workflow 的 roots、状态索引和稳定 ID；roots 必须来自该文件，不得凭字面猜测。不存在时静默跳过，不能凭旧路径猜测。
2. 根据当前请求、Work 分支、关键词、稳定 ID、状态和 provenance，先搜索相关索引行或目录项，再定位最小相关 entry；不把索引全文默认装入上下文。
3. 只回读命中的 entry 和直接 provenance；需要恢复、冲突裁决、归档、迁移或执行安全证明时，才读取该阶段声明的完整证据集合。
4. 没有匹配证据时返回缺失证据并停止依赖该结论的分支，不补造事实。

## Memory writes

正式知识、永久 context、synthesis 或 archive 写入前，先解析唯一 owner 与 gateway，检查 pending transaction、lock、未完成 promotion 和 recovery evidence。gateway 不明或事务未闭合时，只阻塞记忆写入，继续独立且已授权的审计、定位、验证和其他工作。

每次写入必须记录 source IDs、证据定位、验证时间或 digest；写入后定位受影响索引项并重新读取目标 entry，确认 owner、locator、内容和状态投影一致。原始证据不可被派生视图覆盖。

## Read budget

当前 Work 的权威状态、schema、Map/Plan、当前输入和直接所有权合同可以完整读取；非当前分支的知识树、历史 change、研究库、项目 Skill 和示例只按索引与关键词读取。执行、冲突、恢复和归档 Work 需要完整证据时，以该 Work 的显式合同为准。

## 事务与归属隔离

启动正式写入前检查原网关未闭合事务与写集。属于本任务的事务按原恢复协议处理；属于其他任务的事务不得接管、解锁、清空或覆盖。只暂停资源重叠的写入与依赖分支，继续独立、已授权工作；事务年龄不构成接管授权。写后按变更 ID 定位受影响的索引项并回读目标原文，不为核验默认整读整库。

</activation-and-memory>

<ref-common-rules-error-handling>

# 错误、状态保证与恢复

在设计、实现或审查失败、重试、取消、后台任务和恢复时读取。此规则决定失败后的工程判断；既有授权、状态 owner 与远程操作协议仍分别拥有执行权，不在这里创建账本或更换恢复网关。

## 先定义失败后仍成立的事实

预期失败使用可区分的类型或稳定代码，保存必要原因和处理信息；不要解析展示文案来选择恢复分支。无法预期的缺陷可以作为异常报告，但不能被 catch 转成成功。对每个可能改变状态的操作，记录实际处理者、报告者、清理责任及失败后的保证：

| 已知副作用 | 可以作出的判断 | 下一步 |
|---|---|---|
| 未开始或确认未发生 | 未产生本次效果 | 仍需核对授权、取消与重试条件 |
| 已确认全部提交 | 效果已发生 | 回读结果，不能再次创建相同效果 |
| 已确认部分发生 | 只有已核实部分可信 | 停止依赖完整结果的工作，按 owner 的补偿或继续协议处理 |
| 结果未知 | 无法保证没发生或已成功 | 保留原操作标识，先对账；不能声称回滚或安全重试 |

捕获异常不撤销已经发生的修改，记录日志不等于完成恢复。只有受影响状态的 owner 能证明后续操作的前置条件仍成立；否则停止依赖该状态的工作、弃用无效实例或升级处理。无关、独立且已授权工作仍可继续。

## 重试、取消与无进展

重试必须说明安全重复的依据、执行 owner、取消途径和预算。只读、可幂等重试和需要先确认副作用的操作分别处理；“发生了超时”本身不能证明可重复。持续监督需要可释放的生命周期和可见降级，不伪装为有限次数操作。

同一输入、同一方法、同一失败且没有新证据时，不通过更换 Agent、清空 attempts 或重复问用户来制造进展。恢复既有 Goal/Ticket 时沿用原失败记录，由 Lead 说明新增证据或方法变化后再派发。远程对账与 marker 去重由 “请求分诊阶段” 路由到原远程协议；进入远程分支后再读取，不在普通错误审查中加载传输实现。

取消只说明发出了取消请求，不保证远端副作用或子进程已经停止。传播 signal 后仍需等待属于本操作的完成信号；清理失败和业务失败分别报告，不能用后者隐藏前者。

## 面向用户的结果

最终说明必须指出受影响操作、已知影响、尚不确定的结果、系统当前处置和下一安全动作。失效状态持续存在时，提示也应持续可见；错误提示组件不能随已关闭的来源界面一起消失。保留有效数据，不为展示瞬时错误清空它。使用目标项目原有语言和诊断机制；敏感内部信息不进入公开文案。主要报告渠道失败时有独立的安全回退。

S 把适用保证写成行为合同，T-tickets 指定验证，I 落实和记录，D 调查实际失败，C 追踪所有可达路径。验证应观察外部状态、文件、事件、退出或用户可见结果，不只断言异常被捕获。

## 判断示例

请求创建 PR 后超时，应先按稳定 marker 查询原目标；直接重发可能重复创建。读取无副作用的数据遇到临时网络错误，在预算、取消和环境允许时可以重试。这两个场景不能共享无条件 retry。

方法参考：DeepSeek Harness 的错误处理标准，固定参考版本见 <Url>https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/.agents/skills/dsh-error-handling/SKILL.md</Url>；这里采用 SpecDev 原有 owner 和持久化，不导入其运行时实现。

</ref-common-rules-error-handling>

<ref-common-rules-skill-invocation>

# 可验证的 Skill 调用契约

本规则用于 T 规划、P 调度和 I 执行。Map 维护最低读取路由；每票 `skill_bindings` 才定义本票调用，二者不得互相代替。

## 定位与绑定

1. 从项目 Agent 指令解析真实 Skill 根，先枚举元数据和触发条件，再读取命中入口及当前阶段要求的参考；不整读所有 Skills。
2. 保留逻辑路径、解析真实源，检查不存在的路径、越界软链接、缓存和入口 `name`。默认不使用插件缓存或 node_modules 充当项目可维护源；用户维护的项目内软链接保持原状。仓库外技能需要先取得明确源域授权并由项目网关处理，控制器不会自行扩大根目录。
3. 每个绑定必须包含真实 `id`（SKILL 的 name）、项目根相对路径 `path`、入口字节 `sha256`、`phase`（plan/implement/verify）、`operation`、非空 `inputs`、`outputs`、`required` 与 `on_failure`。引用较长参考时在 references 字段 中记录明确 Path、sha256 与 `when`；相关参考在调用前按条件回读。
4. 必需绑定失败固定为 `block-ticket`；可选绑定只有说明 `condition` 与不适用原因才允许 `report-and-continue`。可选标记不能覆盖用户要求或技能自身硬门禁。
5. 在模板 frontmatter 中，数组对象用单行 JSON；不使用自定义 YAML 对象语法。缺失 Skill、摘要漂移、占位符或入口 ID 不符，票不得进入 ready。没有适用项目 Skill 时 `skill_bindings: []`，`skill_scan` 必须写真实扫描范围与不适用理由，Map 同步无适用项。

## 示例形状（生成真实票时全部替换）

```json
{"id":"project-test","path":".agents/skills/project-test/SKILL.md","sha256":"<真实64位摘要>","phase":"verify","operation":"run-regression","inputs":["当前Ticket与定向diff"],"outputs":["含命令、退出码和验收映射的Evidence"],"required":true,"on_failure":"block-ticket","references":[]}
```

此示例不是项目已存在的 Skill，不得复制为可执行绑定。SpecDev 自带技能在 Work 中按明确 Path 调用，不能伪装为项目 Skill。

## 执行证据

到相应阶段后，实际调用宿主能力或执行该 Skill 明确的步骤。记录技能 ID、phase、operation、所用摘要、输入定位、执行轨迹、输出与结果。仅展示 `@skill`、复制入口、声明“已读”都不是完成证据。

新版票 done 前，在本票 `specdev/changes/{change}/evidence/T-NN.md` 增加 `## Skill Execution Records`，紧接一个 JSON 数组代码块。每项有 `id`、`phase`、`operation`、`sha256`、`status`（passed/failed/skipped）、非空 `evidence` 字符串数组。required 项必须 passed；验证器只能检查记录结构与摘要一致，Lead 仍需回读真实工具/过程证据，不能把结构通过称为宿主调用已经被认证。

摘要变更先由 Lead 检查影响、更新绑定和 map 后重验；不自动接受最新文件，不回写已完成旧证据。

</ref-common-rules-skill-invocation>

<ref-common-rules-engineering-evidence>

# 专业分支的工程证据

本规则只约束新运行的 R.performance、I.documentation 和 D.evidence-triage；既有工件与主持久化 schema 不升级。普通 Work 不要求额外记录。记录是某次 checkpoint 的观察，不拥有 Ticket/Goal/change 状态、授权或恢复锁；不能用它代替原 Evidence、诊断和验收。

## 写入原 owner

在原工件正文添加 `Engineering Evidence` 小节及一个标记为 `json specdev-engineering-evidence` 的代码围栏，里面是一个 JSON 对象。performance 位于 specdev/changes/{change}/architecture-review.md；incident 位于 specdev/changes/{change}/diagnosis.md；documentation 位于原本票 specdev/changes/{change}/evidence/T-NN.md 或原 specdev/changes/{change}/evidence/direct-spec.md。禁止写到另一模式的 owner，旧归档与旧完成证据不回填。

公共字段：`version: 1`、`kind`、实际源码/输入的 `checkpoint`、非空 `evidence` 字符串数组。指针使用原 Path/来源定位约定，不写机器绝对路径、密钥或未脱敏数据。记录每次真实观察，恢复时追加新 checkpoint 的证据；不能更改旧事实来制造成功。

## Performance

`operation` 是用户操作，`outcome` 为 baseline、improved、no-gain 或 inconclusive，`uncertainty` 解释测量局限。没有样本时只能 inconclusive。baseline/candidate 各含实际 `checkpoint`、`entrypoint`、`environment`、`clock`、`workload`、64 位 `workload_digest`、`unit`（ms/bytes/ops/s）、`direction`（lower/higher）、`cache`（cold/warm/not-applicable）、`excluded_costs` 字符串数组和有限非负 `samples` 数组。

普通 R 调查只记录 baseline 或 inconclusive；improved/no-gain 需已有可比较的 baseline 与 candidate。比较除源码 checkpoint 外的工作量、入口、环境、时钟、单位、方向、缓存与排除成本必须一致。improved 还需 `behavior_verification: passed`，并且样本算术均值沿目标方向改善。满足这些必要条件仍不证明超过噪声、具备统计显著性、内存可接受或测量真实，Lead 必须回读数据与行为证据。

## Documentation

记录 `owner_paths`（真实源指针数组）、`outcome`（verified/partial/blocked）、`visible_behavior_changed` 布尔值、`behavior_verification`（passed/failed/not-run/not-applicable），以及非空 `claims` 数组。每项 claim 有 subject、method（command/source/manual）、state（verified/unverified）和 evidence。未验证项必须写 reason；verified 的 command 项还必须有 command、`executed: true`、`exit_code: 0` 和非空 output 原始结果摘要数组。

总体 verified 要求所有声明 verified；可见行为改变时必须有 passed 的行为证据。partial/blocked 是诚实的阶段结果，不授予 Ticket done。工具仍不能认证 Agent 自报，Lead 继续核对真实命令、输出和来源。

## Incident

记录非空 facts、unknowns、next_checks 字符串数组；`feedback_loop_ready: false` 与 `root_cause_confirmed: false` 必须明确。这是事件证据截面，不是根因结论。正式 diagnosis 的红灯、假设和状态仍由原诊断规则验证；未来获得红灯后保留原事件观察，转入正常 D 流程，不把旧观察改写成当时已确认。

## 验证入口

新分支分别执行现有校验器的 `--engineering performance`、`--engineering documentation` 或 `--stage diagnosis --engineering incident`，输入当前 change。可与原 `--repo` 和适用 `--stage` 结合。没有标记记录的历史工件继续按原规则验证；显式专业模式缺少记录会失败，已有标记记录在普通 change 校验中也会检查。

代码块语法是 `json specdev-engineering-evidence`，不是新文件类型。校验器只读，无论成功、失败或不完整都不写状态、不创建缺失工件、不执行命令、不获取授权。源记录、结构校验、真实工具执行和宿主观察是不同证据，报告时分别说明。

</ref-common-rules-engineering-evidence>

<ref-common-rules-documentation-standard>

# 开发文档的归属、保真与验证

在 SpecDev 中新增、修改、审查或整理项目文档时读取。本规则负责开发文档的工程要求，不改写全局写作能力。注释继续使用 下方 `<ref-common-rules-code-commenting-rule>` 标签；工件冲突遵守 下方 `<artifact-contract>` 标签。

## 一项事实的负责位置

Work 入口说明如何执行；common 说明跨 Work 判断；项目源码、接口说明与 README 描述当前行为；change ADR 保存已经接受的决定和真实取舍；CONTEXT 保存本 change 已确认领域语义；LOG 保存讨论、待验证解释和被替代结论；Evidence 记录实际验证。永久知识仅经 A 晋升，archive 是只读历史。

按读者与任务区分教程和查询参考。教程按前置知识与操作顺序组织，参考限定自身负责的主题。上层文档只说明下属职责并链接具体 owner，不复制整个子模块实现。用户不需要的内部过程不要挤进入口；详细信息需要可定位而不是被删掉。

## 改写前保留完整命题

逐项保留行动者、动作、条件、时间与顺序、必须/可以/禁止、例外、所有权、副作用、失败保证及后果。删掉这些词可能改变行为，不是简单精简。局部使用点仍要有安全调用所需的完整契约；长篇理由、历史和算法说明链接其 owner。参考或生成内容先改真实源，再重建派生文件，不手工改生成物。

正文描述当前机制，不保留“本轮修改”“下一张 PR”“审查者已认可”或只有某次会话才能解释的编号。必要历史与事故证据留在 LOG/ADR/复盘中；真实 issue、公开规范和可定位历史引用不因出现编号就删除。未知理由保持未知，不补写想象中的设计史。

## 运行声明与升级说明

字段、默认值、命令和平台行为查 owning source，并在有执行条件时运行文档给出的实际操作。仅检查文字或链接不能证明命令成功。缺少网络、凭据、平台或权限时，明确未执行项、风险与验证 owner；不换成模拟后声称真实路径已验证。

外部可感知的破坏性变更在引入时同步升级说明：受影响对象、旧新行为、精确迁移步骤、成功确认和真实恢复限制。用户数据已经发布就不是可随意覆盖的开发数据；预发布名称不解除兼容义务。使用目标项目已有升级文档位置，没有惯例时由当前任务批准的项目文档路径承载，不新建 SpecDev 永久 namespace。

双语或多语仅在目标项目要求时同步。保留未改变的已审文本，核对条款含义、术语、代码及链接；哈希或结构一致不证明翻译正确。不要照搬 DSH 的双语三件套、行数对齐和字数配额。

## 文档维护与可见行为

纯文档可以使用链接、示例、类型片段、生成一致性和事实核对，不伪造 TDD 或 E2E。涉及工具说明、prompt、错误消息或 CLI/UI 输出时按行为变更处理，追加实际模型/用户可见证据或明确未验证。执行入口见 下方 `<ref-i-implement-references-documentation-procedure>` 标签；C 可仅审查，不获得写入权。

方法参考：<Url>https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/.agents/skills/dsh-prose-standard/SKILL.md</Url> 与 <Url>https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/AGENTS.md</Url>。

</ref-common-rules-documentation-standard>

<ref-common-rules-test-reliability>

# 可重复的测试与有效反例

新增、修改或调查异步、资源、时钟、并发、进程或 CI 易抖动测试时读取。检查选择和执行证据由 下方 `<evidence-and-verification>` 标签 拥有；本规则只规定测试怎样可靠地观察目标行为。

## 按真实拓扑设计隔离

从实际测试配置与 CI 定义确认同文件用例、不同 worker、不同测试进程和共享主机的 job 是否可能重叠。进程隔离不隔离端口、可预测目录、数据库、外部服务和继承的子进程。

每个资源都有获取者、原子分配动作、可观察就绪、立即登记的清理和清理完成信号。测试服务器绑定 loopback 的系统分配端口后再读取地址，不先扫描“空闲端口”；目录使用独立临时根，数据库/会话使用独立 namespace。稳定录制 ID 与临时地址在 fixture 内映射，不强迫真实资源复用固定地址。仅作解析输入的 URL 或路径不属于已获取资源。

不得为了掩盖一个 fixture 的冲突把整个套件串行化。共享资源修复涉及跨进程隔离时，使用独立并发进程证明隔离，而不只把同一文件中的测试顺序执行。

## 全局变量、时钟与平台

优先注入依赖而不是修改进程全局状态。必须修改 env、cwd、timer、locale、模块 mock 或 fetch 拦截时，保存“缺失/存在及原值”，立即登记恢复，并在最小作用域用 finally 恢复；必要时增加失败兜底。拦截只覆盖本 fixture 的精确请求。

平台拥有的语义从真实读回结果确认。不要假定时间戳精度、环境变量大小写、信号、权限或文件句柄关闭语义跨平台相同；确实不适用的场景明确跳过并说明原因，不削弱所有平台断言。超时预算依据真实 lane 与被等待操作，setup/teardown 一并考虑。用例预算应明显大于被测试的超时。

## 同步与彻底清理

等待 readiness、handshake、状态、promise 或外部可观察条件；sleep 只可作为已经完成状态的展示停留，不作为正确性的依据。竞态使用 barrier/deferred 明确制造重叠，不靠随机重复碰运气。

清理要停止新工作、解除监听、恢复全局修改，并等待子进程 exit、server close、worker termination 或等价信号。仅调用 abort/close/kill 不代表清理完成。测试需能在断言失败后仍清理，并在存在晚到回调时验证它不能污染下一个测试。

## 有效 red、负向对照与测试删除

有效 red 必须来自目标行为断言。编译错误、没选中测试、fixture 初始化失败、探针未执行、timeout 杀死子进程都不是目标回归证据。强制变异先证明修改落在真实执行路径，观察预期断言失败，再还原并复跑基线。

新增静态或工件准入规则，要从实际顶层 runner 投入故意无效输入并观察预期拒绝；只单测未接入的辅助函数不算落实。对于普通回归，在实际可行且安全时观察修复前失败。无法重现的部分明确未验证。

删除旧测试前逐项核对它所保护的行为、错误、兼容和历史回归在新测试中的承接位置与有效证据。新的公共接口测试存在，不证明旧测试全部冗余；缺失承接则保留或补齐。不要用 sleep、宽断言、吞错、重试、归一化或跳过来制造绿色。真实外部服务允许的有界重试须由该测试政策明确批准，并报告重试与跳过。

方法参考：<Url>https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/.agents/skills/dsh-ci-test-reliability/SKILL.md</Url>。使用目标项目的框架和真实 CI，不照搬 DSH 的工具、覆盖率或超时常量。

</ref-common-rules-test-reliability>

<ref-common-rules-code-commenting-rule>

# Code Commenting Rule

注释只用于记录**代码本身无法清晰表达，但对正确使用或安全修改至关重要的信息**。

## Requirements

- 优先通过命名、类型、结构、断言和测试表达意图；不要用注释掩盖复杂或含糊的代码。
- 公共 API 应说明调用契约，包括重要的输入限制、返回语义、错误、副作用、并发、所有权和安全要求。
- 内部实现仅在必要时解释非显然的：
  - 设计原因与取舍；
  - 不变量；
  - 顺序约束；
  - 安全或并发风险；
  - 兼容、迁移或 workaround 的原因与退出条件。
- 单位、时区、精度、哨兵值、生命周期等无法由类型或名称表达时必须说明。
- TODO 必须包含可追踪标识、具体动作以及完成或删除条件。
- 修改代码行为时，必须同步检查并更新相关注释。

## Do Not

- 不要为每个函数或方法机械添加注释。
- 不要逐行复述代码。
- 不要解释名称和类型已经表达的信息。
- 不要保留注释掉的旧代码。
- 不要记录修改历史或临时开发过程。
- 不要猜测“为了性能”“为了兼容”等设计原因。
- 不要使用注释数量或覆盖率衡量质量。

## Decision Rule

添加注释前确认：

1. 这条信息是否无法由代码清晰表达？
2. 缺少它是否可能导致错误使用或错误修改？
3. 它是否在正常重构后仍然有效？

只有答案均为“是”时才添加注释。

> 公共接口记录 Contract；内部实现记录非显然的 Why、Invariant 和 Risk。

</ref-common-rules-code-commenting-rule>

<ref-i-implement-references-documentation-procedure>

# 文档维护执行分支

仅在已授权的 Ready documentation Ticket 或满足原条件的 Direct Spec 中使用；当前 Work 仍为 `specdev/implement`，权限、workspace、commit 和验收仍走 I。文档建议或审查请求不授权写入。入口预检和两轴审查不因选择本分支消失。

## 定位事实与修改范围

读取 下方 `<ref-common-rules-documentation-standard>` 标签，先定位项目的真实源码、当前接口说明、相关 README、生成器和适用写作规范。区分只改说明、修正示例以及改变 prompt/tool/CLI/UI 可见行为。按 Ticket 的获批写集维护项目文档；Evidence 留在原 change 的本票文件或 Direct Spec Evidence，不创建第二份文档状态。

列出每条行为声明的 owner 与验证方法：源码、类型、实际命令、运行场景或人工核对。先修 owner，再同步相应派生物与项目要求的语言侧；禁止手改生成文件。保存行为、条件、否定、例外、失败与所有权，消除仅本会话可理解的叙述。

## 验证与交付

纯说明修改使用相关链接、类型片段、示例、生成一致性和语义核对，不伪造代码 red/green。写入命令实际运行后才记录对应成功结果；缺网络、平台、凭据或权限时保留未验证和责任人，不替换成 mock 后写“真实入口通过”。

可见行为改变时，补充实际输出或目标项目的行为快照/场景证据，并在需要时读取 下方 `<ref-common-rules-agent-experience>` 标签。默认值、错误、兼容或数据格式变化与代码同改；外部破坏的升级说明在当前改动产生，写清旧新行为、受影响者、迁移验证与真实回退限制。

在原 Evidence 记录 `Engineering Evidence`，kind 为 `documentation`；字段与校验见 下方 `<ref-common-rules-engineering-evidence>` 标签。每项声明为 verified 或 unverified；总体 partial/blocked 不等于 Ticket done。新分支使用 `--engineering documentation` 校验对应原工件，再完成 I 的适用项目验证、两轴审查、状态回读和交付。

## 失败与恢复

以原 Ticket/Spec、文档 owner、源摘要和已运行证据恢复；输入漂移使相应验证失效，不覆盖旧证据。上层行为合同冲突返回原 owner。required 验证未运行时不能以“只改文档”越过 Gate；不适用须说明原因。结果明确区分修改了什么、实际运行了什么、只核对了什么和仍待验证什么。

</ref-i-implement-references-documentation-procedure>

<ref-common-rules-agent-experience>

# 面向 Agent 的工具与 Work 体验

修改工具名称、描述、参数、返回、prompt、Work、Skill 或上下文加载时读取。Work 的具名入口 Markdown 就是本工作流的技能入口；保留原 ID 与文件名，不另建技能注册根，也不要求每个 Work 启动子 Agent。

## 发现、加载与执行分开

description 写真实触发时机、任务范围和相近但不适用的场景，不写“资深专家”式角色自述。先展示用途、可用动作和必要限制，再按模式加载正文或 reference。延后资源必须有可理解的描述、可靠定位和读取条件；不能为减少首轮内容把必要信息藏到不可发现的位置。

已加载同版本正文的同一次任务不重复读取；输入范围、摘要或 owner 变化时重读受影响内容。首次选中只看到摘要时必须读正文，不能从名称推导步骤。实际执行记录继续遵守 下方 `<ref-common-rules-skill-invocation>` 标签；读过入口不是执行完成。

## 工具描述与结果

参数的范围、默认值、配对和使用条件写在参数定义中。工具说明描述行为与返回，避免复制其他工具或系统段已经拥有的规则。权限、破坏性副作用、不可重复操作和必需验证必须在动作之前可见；描述不是底层权限检查的替代。

返回有界的结果摘要以及可回读的 ID、路径或游标，明确截断、遗漏、分页和证据完整性。包含少量当前动作确实需要的邻近上下文，不整页倒出日志，也不因过度裁剪迫使下一步反复搜索。缺少资源、格式无效和加载失败要能辨认，不伪造可用性。

## 作为行为验证

检查模型真正收到的工具 schema、prompt、结果和诊断，覆盖正常、失败、取消、权限不足、重复调用和恢复中的适用分支。用户直接调用已注入的 Work 不应再次重复加载同一正文。仅宿主支持时才依赖自动/显式调用元数据；文字字段本身不是安全控制。

比较优化前后实际首轮输入、总读取、重复调用、误触发和任务结果。在没有同模型、同工具、同任务的实际使用记录时，只报告文件字符或字节变化，不能宣称 token、费用或配额节省。已有正反任务观察与结构检查分别报告。

方法参考：<Url>https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/.agents/skills/agent-experience/SKILL.md</Url>。SpecDev 不因此获得 DSH 的运行时 Skill 加载器。

</ref-common-rules-agent-experience>
