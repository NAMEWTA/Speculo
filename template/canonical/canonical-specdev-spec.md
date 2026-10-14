# 编写 Spec

## 网页平台运行约定

本文是可独立上传的单文件能力快照，不依赖 Speculo CLI 的根别名或源目录。执行时统一采用以下逻辑布局：

- 项目根下的 `specdev/` 是业务工件区。普通 Work 的直接使用不要求安装元数据；先明确项目、可读方法资源和获批写入根，不按 cwd 猜测另一个项目。
- 当前 change 位于 `specdev/changes/{change}/`，其中 `{change}` 使用真实日期 `YYYY-MM-DD-<kebab-topic>`。新归档位于 `specdev/changes/archive/{change}/`；旧月份归档原位只读，同名跨位置冲突必须先解决。
- 当前 change 的设计、规划和证据工件都写入该目录；永久 ADR、领域上下文和研究分别写入 `specdev/adr/`、`specdev/context/` 和 `specdev/research/`。永久设计位于 `specdev/design/`，消费、确认、离线导出和原 owner 恢复遵守下方 `<design-portability>` 标签。
- 整体结论只在 `specdev/changes/{change}/README.md` 的唯一正文行 `Outcome: active|completed|cancelled` 中表达。新 change 不创建重复业务状态 JSON，也不默认创建 config；实际工具配置只在使用该分支时读取。正文、真实验收与 owner 证据共同决定能否完成或取消，Outcome 本身不授权。任务进度由 README、Goal 或 Ticket 择一负责。
- 轻量 README 保留 scope、acceptance、verification 明确锚点、真实 AC 和证据；复杂 Goal/Ticket、并行隔离、Git 集成与 UI 专用合同仍按内联规则执行。当前工程 docs 位于 `docs/` 或引用项目原有负责文档；只在明确请求时建立基线。
- 项目代码与测试始终使用项目根相对路径；不写机器绝对路径。工件之间使用上述逻辑路径，不使用 Speculo 的运行时路径标签。
- 如果网页平台不能直接写项目文件，则以 `### FILE: specdev/changes/{change}/README.md` 等完整路径输出所有本次修改文件的完整内容，标明需要保存，随后列实际所需的 Spec/Goal/Ticket、源码资源、确认/浏览器证据与 pending 网关请求；不输出重复旧业务状态。下一会话先读用户保存后重新提供的完整工件；不得把无法写文件伪装成已经持久化。
- 若本地项目提供 Speculo Node 校验器，可运行它补充结构校验；纯网页环境按本文内联的 schema、Ready 清单和完成标准逐项核对，并明确记录未运行的自动校验。
- 本地只读 Goal 控制器和 Plan 合同校验库不随网页快照提供，不能把其名称当作可执行命令。网页执行者按内联 map-control/调用合同逐项计算依赖与门禁；缺少真实项目 Skill 源或执行能力时阻塞对应任务，不声称自动验证通过。
- 提交、推送、合并、部署、发布、归档移动和不可逆迁移仍需用户明确授权。

激活后读取 下方 `<domain-runtime>` 标签 与 下方 `<activation-and-memory>` 标签。本 Work 综合已有事实，定义为什么、为谁、系统应表现为何，不另开宽泛访谈，也不写逐文件施工计划。

## 形成行为合同

1. **Grounding**：定位用户目标与当前代码、测试、接口、schema、配置和运行事实。按存在情况定位 change 的来源、分诊、诊断、LOG、CONTEXT、ADR 及相关永久领域词汇/决策；只回读命中原文，可选工件缺失静默跳过，不当作已确认事实。按 下方 `<planning-principles>` 标签 区分可发现事实、高影响偏好和可逆实现细节；冲突按 下方 `<artifact-contract>` 标签 返回权威 owner。
2. **关闭必要决定**：只确认会改变外部行为、接口、数据、兼容、安全、迁移、发布或验收的高价值问题。广泛取舍未定时返回 “设计访谈能力”；陌生外部依赖或版本行为通过 下方 `<research>` 标签 查证。不虚构错误码、性能阈值、法规或迁移政策。
3. **写入合同**：先按下述轻量/完整边界选择唯一负责位置；轻量写 README 等价章节，完整模式以 下方 `<spec-template>` 标签 写入 `specdev/changes/{change}/spec.md`。模板拥有问题/用户/成功、正常/边界/失败/角色/状态行为、IN/REUSE/OUT、保持项、接口数据与 NFR 的完整结构及 `US-### / AC-### / NFR-### / DEC-### / OOS-###` 稳定编号。实现约束仅锁定会影响公共合同、兼容、安全或验收的决定。
4. **绑定验证接缝**：优先复用稳定接缝，通常从用户端到端行为、公共 API/CLI、事件/集成、稳定单元接缝选择；按实际风险与项目先例决定，不机械追求最高测试层级。每个接缝注明入口类型/位置、触发方式、可观察结果、覆盖 AC 和实际测试先例/命令。选择显著改变可测试性、事故半径或范围时聚焦确认；可由已有代码推导时记录依据即可。证据遵守 下方 `<evidence-and-verification>` 标签。
5. **Readiness**：对照 下方 `<spec-readiness>` 标签；完整 Spec 再校验 下方 `<spec-schema>` 标签。高影响未决问题使 `ready_for_tickets: false`；低影响、可逆默认值可作为带验证方式的显式假设。每个 AC 必须可观察、可判定、绑定接缝；不适用影响写明理由。

简单单 change 可使用 README 的 scope/acceptance/verification 等价章节承载规格，仍须通过同一行为/AC/Ready 语义；独立 specdev/changes/{change}/spec.md 存在时默认使用它，双权威先裁决。用户明确要求 Spec 或存在复杂设计/Deep/并行/跨 change 时交付完整 Spec。迁出 README 规格改为导航。

## 失败与兼容合同

适用时读取 下方 `<ref-common-rules-error-handling>` 标签，把未开始/部分发生/已提交/未知结果、重复/乱序/取消、可重试前提、状态有效性和可见诊断写入原 AC/NFR。公共接口与旧数据变更须给出兼容、迁移和恢复限制。每项绑定真实可观察接缝或待建设接缝，不虚构错误码、性能阈值或安全保证。已知低风险变更不为了填表增加无关条款。

## 验证、状态与交接

```bash
node Speculo Node 校验器 --stage spec --repo <project-root> specdev/changes/{change}
```

回读真实规格与 Ready 结论，返回负责工件完整路径、行为/验收合同、范围、验证接缝、风险、高影响缺口与验证结果；接续写原 README/规格，不维护调用或全局状态镜像。

只有用户请求或工作流已显式串联时才进入 “拆分 Tickets 阶段”；产出 Ready Spec 本身不授权实施。

## UI 设计与逻辑原型

涉及 UI 外部行为时读取 下方 `<design-contract>` 标签，硬引用已批准 specdev/changes/{change}/DESIGN.md 的 revision/digest、项目基线和指定 UI 原型；把页面/状态/交互映射到 Spec AC。未确认、摘要漂移或与行为合同冲突时 UI 部分不可 Ready，返回 P 或相应 owner；不在 S 重新选风格。纯后端不强制设计文档。

LOGIC 原型仍可作为已验证行为和边界证据，记录具体 locator/hash；它不自动成为生产实现，也不要求 UI DESIGN。未闭合高影响产品决定返回 G。

---

## 参考内容

以下内容均已内联。主流程提到标签时，直接使用对应标签中的完整规则、模板或 schema。

<spec-readiness>

# Spec Readiness

本检查适用于独立 Spec 或合同允许的 README 等价范围/AC/验证；轻量不机械要求 Spec YAML，但行为、可观察 AC、风险与 Ready 判断不变。独立 Spec 存在则读取它，不能双权威。

- [ ] 问题、目标用户和成功标准从用户或调用者视角可理解。
- [ ] 主要、边界、错误、角色和状态场景足以生成垂直切片。
- [ ] 每个用户故事至少被一个验收合同覆盖。
- [ ] 每个验收合同可观察、可判定且有验证接缝。
- [ ] IN、REUSE、OUT 无冲突。
- [ ] 公共接口、数据、兼容、安全、迁移和发布影响已决定或明确不适用。
- [ ] 已锁定实现约束有来源，没有把偏好伪装成事实。
- [ ] UI 范围已实际读取并引用批准有效的 change DESIGN、基线 revision/digest 与 UI 原型，页面/状态对应 AC；没有 UI 影响时明确不适用。
- [ ] 高影响未决问题为零。
- [ ] 低影响假设可逆且有验证方式。
- [ ] 项目路径引用使用项目根相对路径，内部工件使用本文约定的逻辑路径。
- [ ] Spec 不包含逐文件施工清单或容易过时的行号承诺。
- [ ] 独立 Spec 的 `ready_for_tickets: true` 与实际内容一致；轻量在原 README 明确同等就绪/缺口，不为免拆票创造 Map。

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

## 轻量输入与唯一事实

整体结论仅在 change README 顶层唯一 `Outcome: active | completed | cancelled` 行；简单任务的范围、可判定 AC、当前清单、真实验证与下一步也由 README 负责。被工具引用的章节使用唯一显式 `<a id="scope"></a>`、`<a id="acceptance"></a>`、`<a id="verification"></a>` 锚点。无 Ticket 的 Goal 只在原计划维护清单；有独立 Ticket 的进度在票及 Evidence，README/Goal/Map 不复制状态。

工具用临时 `{path, section?}` 定位原文，不创建登记表。存在独立 Spec 默认读取它；仅当前合同允许且 README 等价章节完整时读取 README。两份都自称规格权威时停止裁决，不按时间挑一份。跨 change 集成、Deep、真实并行或复杂设计依赖使用完整工件，迁出位置改成导航；用户明确要求 Spec/Ticket/Goal 时照办。UI 小任务同样保留 DESIGN、具体批准及真实浏览器；LOGIC-only 保留独立验证。无需拆票的轻量任务不制造 Ticket/Map。

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
| Tickets Map | `specdev/changes/{change}/tickets-map.md` | 总体实施背景、项目 Skill 最低调用路由、依赖 DAG、合同覆盖、Gate 导航、并行候选和路径冲突 | 单 Ticket 的完整实现契约、Ready、状态或执行 owner 副本 |
| Goal Plan | `specdev/changes/{change}/goal-plan.md` | 跨 Ticket 调度、Gate、共享所有权、迁移顺序、集成和偏差治理 | 复制 Ticket 全文 |
| Implementation Map | `specdev/changes/{change}/implementation-map.md` | Ready 成员、组合 Ticket inventory、跨 change dependency/serialization 与 revision | 创建或改写子 Spec、Ticket 或实现细节 |
| Implementation Plan | `specdev/changes/{change}/implementation-plan.md` | 父 Lead、全局 workspace/实现上限、frontier/Wave/locks/integration queue 和可恢复进度投影 | 改写子 change 权威或伪造完成 |
| Implementation Orchestration Evidence | `specdev/changes/{change}/evidence/implementation-orchestration.md` | 成员完成、组合 Ticket 顺序/锁、repository integration、整体验证、漂移和残余风险 | 新产品/架构决定或单 Ticket Evidence 替代品 |
| Evidence | `specdev/changes/{change}/evidence/T-NN.md` | 实际修改、命令、结果、验收映射、偏差、风险和提交引用 | 新的产品或架构决策或远程 Issue 正文 |
| Change 学习图解 | `specdev/changes/{change}/learning/index.md` 与 `specdev/changes/{change}/learning/{number}_{topic}.md` | 面向零专业背景读者解释当前 change 的已验证工件、实现和测试事实；索引按序号持续追加 | 产品决定、架构决定、实现授权或 Learning workflow 知识 |
| 代码审查 | `specdev/changes/{change}/reviews/CR-###.md` | 固定点、标准轴和规范轴 finding | 实施修复或合并两轴排名 |
| 项目设计基线 | specdev/design/DESIGN.md | 跨 change 的语义 token、组件/交互规范、版本及来源；A 唯一正式写入 | 单次页面设计或未批准提案 |
| Change 设计合同 | specdev/changes/{change}/DESIGN.md | 本 change 已批准的页面、状态、视觉/交互、基线版本和例外；P 拥有 | 改写永久基线或替代 Spec/ADR |
| UI 设计包 | `specdev/changes/{change}/prototypes/{design-id}/design-system.md`、`specdev/changes/{change}/prototypes/{design-id}/comparison/` 与 `specdev/changes/{change}/prototypes/{design-id}/final/` | 项目 UI 检测、模板组合、集中批准证据、可运行 HTML/CSS/JS 源码与浏览器证据 | 生产 UI 实现或替用户确认高影响偏好 |
| Stakeholder 问卷 | `specdev/changes/{change}/questionnaires/{slug}.md` | 第三方原始回答和恢复条件 | 未经转录确认的产品/架构决定 |
| Wayfinder 地图 | `specdev/changes/{change}/wayfinder-map.md` | 目的地、说明、已关闭决策索引、战争迷雾和范围之外 | 开放 Ticket 正文或答案详情 |
| Wayfinder Ticket | `specdev/changes/{change}/investigation/{investigation-id}.md` | 一个可精确陈述的问题、类型、阻塞和关闭状态 | 解决方案评论或交付目标 |
| Wayfinder solution comment | `specdev/changes/{change}/investigation/comments/{investigation-id}/NN-solution.md` | Ticket 的答案、结果事实和资产指针 | 地图索引或产品实现 |
| 架构审查 | `specdev/changes/{change}/architecture-review.md` | 结构性候选、code-judo 机会、证据、选择和访谈状态 | 未经用户选择的执行契约 |

UI 设计包中的 `{design-id}` 由 P-prototype 分配为当前 change 内最小未占用的 `UI-NNN`；design-system.md 保留文件名但只拥有源码与证据，change DESIGN 是当前设计合同；comparison 与 final 不建立第二套规则。UI 分支按 下方 `<design-contract>` 标签 处理继承、确认、失效与下游硬引用。

Change CONTEXT/ADR/DESIGN 是 active change 内各自领域的执行权威，不是 workflow 级永久知识。G 和其他设计/执行 Works 只读 `specdev/context/` 与 `specdev/adr/`；ADR/context 的正式写入只有 A 在适用证据、价值评估和具体授权通过后执行；独立维护无需虚构 change，research/非标准 store 仍按实际声明及原 owner 判断，不能自动纳管；design 的首次批准意图发布与归档提升均只经 A 设计网关，按 design-contract 执行。未毕业内容随归档 change 保留，不能从 change 工件消失。

## 2. 权威顺序

先确定问题类型，不以一个万能优先级覆盖全部事实：

- 原始请求由 source 负责；产品目标和真实授权来自用户决定，当前 Spec/README 负责已确认外部行为。
- 当前实现是什么，以真实源码、运行与验证为证；代码不静默授权修改已批准目标。
- 长期取舍由 ADR 负责，领域含义和兼容范围由 context 负责；当前工程用法由负责 docs/源码维护，不复制决策全文。
- 当前 change 的已接受 ADR 约束本次架构；与永久知识冲突必须显式记录替代范围，未通过 A 网关不改永久版本。
- Ticket 拥有本票范围/依赖/写集/实现证据；Goal 和父 Implementation Map/Plan 拥有各自的 Gate、组合依赖、workspace 与集成安排，不能覆盖子行为合同。
- 日志与历史解释出处，未确认推断不能提升为当前事实。

视觉/交互事项先读取已批准 change DESIGN 和其引用的项目设计 revision；它不能覆盖 Spec 的外部行为或 ADR 的架构决定。缺少确认、内容漂移或规则冲突时返回 P，不由下游重新选择设计。

当前 change 决定与永久知识冲突时，必须在 LOG/ADR（设计事项为 DESIGN overrides）中显式说明替代关系；它只约束当前 change，直到 A 决定是否提升并更新永久版本。

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
- UI 范围按 下方 `<design-contract>` 标签 硬引用已批准 change DESIGN、基线版本和原型，确认/摘要未失效；
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

UI 范围的 Ready Spec 同样要求已批准且未漂移的 change DESIGN 和页面/状态 AC 映射；纯后端或 LOGIC-only 无此要求。

轻量 README 的 scope/acceptance/verification 使用同样的外部行为、风险与可判定 AC 门；没有独立票不要求 Spec YAML 或 Map。Deep、真实并行、跨 change 或复杂设计依赖必须使用完整工件；用户明确产物要求不因轻量分支降低。

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

任务执行者 只返回候选命令与结果，不写 Evidence。Lead 重读 workspace/Git、必要时复跑或核对输出后落盘；外部 provider 自报、截图、模拟和推断在此之前标记 `unverified`。review/research/test-observation agent 不拥有 E2E Gate。

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
- 偏差影响并行执行、source checkpoint 或 candidate 集成时，Lead 必须暂停受影响 Wave，重新计算路径所有权、依赖、Gate 与父分支顺序；任何 任务执行者 都不能自行改写上层合同。
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
  "schema_version": 7,
  "interaction_language": "zh-CN",
  "artifact_language": "zh-CN",
  "git": {
    "default_branch": null
  },
  "execution": {
    "max_concurrent_implementations": 3,
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
  "$id": "urn:speculo:specdev:config:v7",
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
      "const": 7
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
        "max_concurrent_implementations",
        "max_integration_attempts",
        "deep_ticket_human_approval",
        "shared_path_owner"
      ],
      "properties": {
        "max_concurrent_implementations": {
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

<workflow-state-and-lifecycle>

# 工件生命周期与恢复

创建、恢复、结束或归档 change 时读取。安装与业务运行分开；新项目不预造空目录、全局状态或工作调用记录。

## 身份与位置

change 的稳定身份是同一项目、领域内的 `YYYY-MM-DD-topic[-NN]` 目录名，日期为创建日期，不随归档重命名。真实首次创建时选择未占用名称；检查 active、新 archive 和旧历史，重名或多位置阻塞。只有需要相应内容时才建目录。

- 活动/已结束未归档对象：specdev/changes/{change}/README.md。
- 新封存对象：specdev/changes/archive/{change}/README.md。
- 既有历史：specdev/archive/YYYY-MM/{change}/，原位只读，保留原 schema、许可、模式和字节。
- 直接 A 无 change 的必要维护回执：specdev/maintenance/{date}-{topic}[-NN].md，只在跨会话/跨对象恢复需要时创建。
- 工程 docs：docs/README.md，明确请求基线后按需存在；它是跨领域工程事实，不是 SpecDev 独占知识 store。

归档实际位置和原回执表示封存；不在 README 增加 archived、archive_path 或全局 active/archived 列表。新 archive 不嵌套月份。旧历史移动须另有明确计划，验证所有 locator 和 DESIGN 摘要；不可变正文不做路径替换。

## 唯一整体结论

每个新 change README 正文恰有一行：

```text
Outcome: active
```

合法值只有 `active | completed | cancelled`，ASCII 大小写和格式固定；不从标题、YAML、清单、代码围栏或时间推断。重复/缺失/非法 Outcome、同义 YAML status 或新旧混合权威均拒绝写入。README 保存目的、当前接续和验收导航；完成/取消必须先通过 下方 `<ref-common-rules-change-completion>` 标签，结论文本本身不是证据。

简单任务清单、范围、AC 和验证在 README；无独立 Ticket 的 Goal 用 goal-plan 清单；有 Ticket 则票和对应 Evidence 负责进度。迁出进度的位置改成导航，不能双写。复杂 Spec、Ticket、Map、Goal、Implementation、DESIGN 与专用工具合同保留真实消费者需要的字段。

## owner 与独有事实

不默认创建 leadership epoch、空批准槽或每 Work 记录。实际交接、并行、worktree/集成发生时，在原计划、Ticket Evidence 或操作回执记录唯一负责者、获批写集、输入、真实交接与下一步。复杂任务 owner 从原 implementation-plan/goal-plan 的 `lead` 读取。无 Goal 且动作确需 owner 时，README 的 `## Ownership` 内保存 `Owner: <session locator>` 与 `Evidence: <对象内相对路径>[#anchor]`，证据指向实际会话/交接；设计 bootstrap 还保存 `Work: specdev/prototype` 且依据正文绑定该 Work。普通只读不预建所有权记录，字段不创造授权。

每个实现 Ticket 的 Evidence 在 `## Workspace Execution Record` 下以唯一 JSON object 保留实际执行记录（原 worktree 字段），不创建全局 array 镜像；其中保留 base SHA、父分支、workspace/implementation/integration owner、workspace locator、implementation/source checkpoint、candidate/result SHA、验证与 E2E disposition。current 使用 current/direct-parent；required 使用 source/parent-candidate，清理后也保留集成证据。父计划只导航，不另复制一套结果。

语言、用户工具和数量来自当前请求/既有项目说明；实际并发、worktree 与尝试上限由原 Goal/项目约定负责，原 Goal/Implementation Plan 的 `## Execution Policy Source` 说明实际策略来源；已有 config 仍校验相应上限，Lead 自己实现计入并发。旧 config 的真实远程/验证用途可选保留；未知独有字段不能以简化为由丢弃。默认 UI 3 个、配置 2–4、明确用户数量覆盖，均不变。

## 创建、恢复和历史边界

首次真实任务才创建 README 和实际需要的其他工件。简单形态参考 下方 `<ref-specdev-i-init-setup-assets-change-readme-template>` 标签；实际需要 owner、验证或取消记录时读取 下方 `<ref-specdev-i-init-setup-references-change-record-examples>` 标签，不预填空槽。默认目录发现只枚举 changes 直接子目录，不递归把 ticket、archive 或临时目录当 change。指定历史再查询新 archive/旧月份 archive；同身份多位置报冲突。

恢复重读原 owner、输入摘要、实际 writer、Git/工具结果与未决动作。结果未保存不等于操作没发生；超时不证明 writer 结束。仅使受影响证据失效，不清零尝试、不抢锁，不改完成历史。review-only、performance、documentation、evidence-triage 留原报告或 Evidence，不能伪造问题已解决。

新 writer 不新增或更新旧 status 镜像。发现旧活动 status、未知 schema、混合协议或 specdev/.markdown-conversion-pending 时只读盘点，停止重叠写入并交显式转换 owner；不自动升级、不因 README 存在跳过。pending 不证明互斥，也不能按年龄删除。旧 archive 原位冻结，历史 reader 不产生可写新对象。

CLI 刷新先 staging/验证再原子替换并保全未知 runtime；Work 不修改 back/、安装元数据或命令 sidecar。安装故障只在与本次路径冲突时阻塞相关动作。

</workflow-state-and-lifecycle>

<domain-runtime>

# SpecDev 运行合同

只在用户明确激活当前 Work 后读取；当前入口已明确时不重入领域 Skill，也不先执行初始化。项目与必要资源明确即可直接使用，无需 Speculo CLI 或安装元数据。

## 启动顺序

1. 明确项目根、方法资源根与获批业务数据根。已有安装时验证真实 workspace 与 roots；没有安装时使用明确根参数，方法资源可以只读。相对参数基于项目根，cwd 只作线索；不静默切换项目。根冲突、越界链接或重叠安装事务仅阻塞依赖该根的写入。详见 本文的网页平台运行约定。
2. 读取当前请求和所选 Work；按 下方 `<activation-and-memory>` 标签 检索相关知识 ID/关键词，再回读少量原文与 provenance。没有相关知识不要求先初始化知识目录。
3. 有 change 时定位用户指定对象或唯一合法候选，读取 README 的唯一 Outcome、当前负责工件和接续点。只枚举 changes 直接子目录，排除 archive；多个候选真实消歧。只读代码/架构审查、知识审计、capture 和初始化不强造 change。
4. 按实际分支读取必要参考。创建、恢复、完成、取消或归档时读取 下方 `<workflow-state-and-lifecycle>` 标签；轻量/完整输入或事实冲突读取 下方 `<artifact-contract>` 标签；实际交接、并行、父子集成才加载 下方 `<ref-common-rules-operating-governance>` 标签 和 下方 `<ref-common-rules-parent-implementation-orchestration>` 标签。
5. 写前核对路径、原 owner、实际写入者、相关 pending transaction、lock 和 recovery evidence。失败/阻塞记录在原 README、计划、Evidence 或操作回执；真实交接只更新原负责位置。完成产物、适用验证并回读，返回证据和下一入口。

新普通流程不读写全局 status、change status 或 Work 调用镜像。发现旧活动协议、混合权威或转换 pending 标记时停止受影响写入，保留原件并交显式转换；README 存在不证明转换已完成。旧归档仅走独立历史只读定位。

## 工件与能力

小请求使用 README 中等价范围、AC 与验证；用户明确要求 Spec/Ticket/Goal 时交付指定工件。复杂需求可经 W → G → S → T → P → I 逐步形成合同，不要求全部 Work 串行必跑。Ticket frontmatter 拥有本票状态、依赖、写集与 Skill binding；有票的 Map/Goal 只管导航、依赖、Gate、集成和恢复，无票 Goal 由计划清单负责进度。整体结论只在 README，归档事实只在目录位置与回执。

真实使用的 Spec/Ticket/Map/Goal、DESIGN、调查、远程账本 schema 与验证继续有效。并发上限、worktree 与集成尝试策略只在实际启用时由原 Goal/项目约定提供来源；缺省 current 单写入者、严格串行/direct-parent。Lead 自己实现也计入实现并发，只读 review/research/test-observation 不新增数字上限。GitHub labels 等实际工具配置仅对应分支读取；未知配置保留，缺标签只阻塞有关远程写入。

UI 候选缺省 3 个，配置范围 2–4；用户明确数量覆盖默认及上限。W 每会话最多完成一张调查票。专业分支保留：R performance 先测量，D evidence-triage 不以观察冒充根因，I documentation 在原授权范围维护当前工程事实。

## 写入边界

实现只写获批项目路径；Work 不写 CLI-owned back/install/managed/baselines，不要求创建空 namespace。ADR/context 的提升、纠错、替代和清理由 A 原网关处理，research/非标准 store 只有声明的 owner 才可写。DESIGN 首次 approved-intent 和后续 promotion 都由 A 专用网关发布；P 嵌入调用保持原 owner，不启动归档。详见 下方 `<design-contract>` 标签。

提交、推送、合并/父分支更新、来源 branch/worktree 清理、发布、部署、远程写入、归档移动、永久知识改写和不可逆迁移仍由 owning 入口核对具体授权。同一目标/动作/范围批准复用；新增副作用、范围或漂移才补充确认。文本、Outcome 和 owner 字符串都不能创造授权。

只阻塞重叠写集及依赖分支，继续独立已授权工作。普通多文件修改没有整体原子保证；恢复先检查已落地结果，不能因报告缺失重复操作。同次任务已加载且未变化的规则可复用。

## 验证与路由

按当前分支运行 Speculo Node 校验器 的适用 stage；传明确项目/方法/数据根，不用 CLI 包装器作为普通 Work 前置。prototype 传具体 UI-NNN/LOGIC-NNN；完成/取消按 下方 `<ref-common-rules-change-completion>` 标签 核验真实证据，票全 done 不替代整体验收。归档后以实际目标运行 archived 验证。

场景出口见 下方 `<ref-common-rules-workflow-routing>` 标签。T 的 capture、publish、PR 和独立 TRI 各有原账本 owner；未请求远程动作不创建空账本或新完成门。completed/cancelled 不自动授权外部动作，已承诺而未结束的外部交付仍阻塞封存。已完成/归档来源的复盘另建 review-only change，不改写历史。

</domain-runtime>

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

1. 复用当前入口已经明确的项目、方法和数据根。已安装时验证 workspace roots；未安装时使用明确根参数与 Skill 内相对资源，不猜旧路径。根不明只阻塞依赖它的写入；按稳定名称定位所需对象。
2. 根据当前请求、Work 分支、关键词、稳定 ID、状态和 provenance，先搜索相关索引行或目录项，再定位最小相关 entry；不把索引全文默认装入上下文。
3. 只回读命中的 entry 和直接 provenance；需要恢复、冲突裁决、归档、迁移或执行安全证明时，才读取该阶段声明的完整证据集合。
4. 没有匹配证据时返回缺失证据并停止依赖该结论的分支，不补造事实。

## Design retrieval

UI 工作先按 specdev/design/ 的索引条目或 scope/规则 ID 定位，再读取命中的 DESIGN revision 和来源。已有 change DESIGN 按它固定的 baseline revision/digest 回读，不静默换成最新版本。永久设计的唯一 owner 是 A，网关为 下方 `<design-portability>` 标签的设计检查、发布与恢复协议；首次批准和归档提升遵守 下方 `<design-contract>` 标签。

## Memory writes

正式知识、永久 context、synthesis 或 archive 写入前，先解析唯一 owner 与 gateway，检查 pending transaction、lock、未完成 promotion 和 recovery evidence。gateway 不明或事务未闭合时，只阻塞记忆写入，继续独立且已授权的审计、定位、验证和其他工作。

每次写入必须记录 source IDs、证据定位、验证时间或 digest；写入后定位受影响索引项并重新读取目标 entry，确认 owner、locator、内容和状态投影一致。原始证据不可被派生视图覆盖。

## Read budget

当前 Work 的权威状态、schema、Map/Plan、当前输入和直接所有权合同可以完整读取；非当前分支的知识树、历史 change、研究库、项目 Skill 和示例只按索引与关键词读取。执行、冲突、恢复和归档 Work 需要完整证据时，以该 Work 的显式合同为准。

## 事务与归属隔离

启动正式写入前检查原网关未闭合事务与写集。属于本任务的事务按原恢复协议处理；属于其他任务的事务不得接管、解锁、清空或覆盖。只暂停资源重叠的写入与依赖分支，继续独立、已授权工作；事务年龄不构成接管授权。写后按变更 ID 定位受影响的索引项并回读目标原文，不为核验默认整读整库。

</activation-and-memory>

<design-contract>

# UI 设计权威、批准与继承

P 创建 UI 包，或 S/T/I/C/W 消费 UI 决定时读取。纯 LOGIC 和没有 UI 影响的 change 不强制生成 DESIGN；不能以缺少 UI 工件阻塞独立的后端工作。

## 三层产物与 owner

| 层 | 位置 | 权威与 owner |
|---|---|---|
| 项目设计基线 | specdev/design/DESIGN.md | 跨 change 的视觉语言、语义 token、组件与交互规范；唯一正式写入 owner 为 A |
| Change 设计合同 | specdev/changes/{change}/DESIGN.md | 本 change 的页面、任务流、状态、响应式、基线引用与已批准例外；P 写入并维护 |
| 原型源码与证据 | specdev/changes/{change}/prototypes/{design-id}/design-system.md | P 拥有项目检测、候选来源、HTML/CSS/JS 源码、验证和批准证据；不再重复拥有设计规则 |

`design-id` 为当前 change 内最小未用的 `UI-NNN`。每个 UI 包引用同一 change DESIGN 的适用页面/规则；不能以新包覆盖其他已批准页面。comparison 与 final 是源码投影，项目内预览是有明确写集的临时验证。CONTEXT 拥有产品事实，ADR 拥有架构决定，Spec 拥有外部行为；DESIGN 不夺取这些职责。

初始化只创建空的 specdev/design/，不从模板预填品牌或创建已批准 DESIGN。根项目已有 DESIGN.md 或其他设计规范时记录实际 locator 和 owner；不得自动覆盖或同步出第二套可写基线。

## 基线生命周期

1. 先按 design 索引的 app、页面、关键词或规则 ID 定位，再读取相关原文与 provenance。已有基线时核验 revision/digest 与代码；未声明 rebrand 的局部变更继承它。
2. 没有基线时先检测现有 token、组件和真实页面；新项目明确没有既有事实。P 在 change 内准备 baseline draft，观察值、用户约束与待验证建议分开。持久化草案不等于永久知识。
3. 默认先自动组合模板并生成 HTML，再把基线差异、候选、推荐最终页、关键交互和提升范围作为一次初始批准包展示。用户可以选择、组合、修改或拒绝；不逐项追问可由代码或模板推导的 CSS 偏好。首次批准前，将候选基线的确定 revision/designDigest 预绑定到 draft DESIGN，以 draft 状态及包内发布记录明确它尚未发布，并连同候选完整字节 SHA-256、HTML 摘要及当前基线 CAS 条件一并展示。这样批准涵盖最终规范内容；发布后仅验证同一内容落盘。临时发布状态保存在包/回执中，不写入会改变 designDigest 的规范正文。

4. 包获批后，P 通过 下方 `<design-portability>` 标签的设计检查、发布与恢复协议 请求 A 创建首次永久基线；该嵌入网关保持调用方原 owner，不执行整项归档。P 无永久目录直写权。已有基线的普通 change 仅记录 delta，不能借初始批准覆盖永久基线。正式 baseline 的不可变快照保存到 specdev/design/revisions/{revision}.md，`revision` 来自网关验证的 DESIGN-NNNN；恢复和历史 change 按引用版本读取，不静默替换为 current。

5. 实施与验证后，A 在归档阶段按同一网关评估共享规则，生成 promotion diff 并在原授权范围内写入；一次性页面内容、未采纳方向、纯原型设想不提升。保持原 ID、来源和替代关系；未提升内容随 change 归档。

基线冲突、未知 owner、未闭合事务或相关锁只阻塞永久写入及依赖分支。仍可完成独立的检测、草案和候选，但不得把未成功发布的基线当作已存在。正式写入前后遵循 activation-and-memory 的定位、事务检查、原子写入与回读。

## 批准与失效

用户批准绑定具体 change DESIGN 内容、基线版本和原型文件摘要，并记录可回读的确认来源。发布批准的 record.path/sha256 绑定不可追加改写的本次确认快照；LOG 追加其定位和回执。项目根已有设计规范时保留原 owner，以 derived-readonly 和根文件字节摘要明确只读派生关系。模板推荐和 Agent 自评不构成人类批准。用户已指定方向或已授权自主组合时直接完成 HTML；仍需取得最终 HTML/交互与设计合同的集中确认，不额外要求重复的风格选单。

HTML、交互、设计合同、引用基线或影响布局的输入变化时，旧批准只对原摘要有效。先标记受影响部分待重新确认，完成新证据后再批准；无关页面不重新访谈。多个原型包与历史失败包并存时按 `--prototype-id UI-NNN` 选择本次目标，不能以任意一个 ready 包掩盖当前包失败。

## 下游硬引用

- **S**：UI 范围的 Spec 明确引用 change DESIGN、项目基线版本与原型 ID；将页面/状态映射到 AC。设计未批准或漂移时 UI 合同不可 Ready，返回 P。
- **T**：UI Ticket 使用 ui_change=true、design_ref={revision,digest,pages,acceptance}，Map 引用同一版本和适用规则；实现票明确只读设计来源、组件复用边界与视觉/交互验收。不可让执行者重新选风格。
- **I**：预检重算 design_ref 引用和摘要；按已批准设计实现，在 Evidence 的 Design Conformance 记录 digest/page/AC 与真实页面、原型差异、视口及任务证据。发现设计无效返回 P，行为冲突返回 S，不能修改设计文件给实现偏差补票。
- **C**：规范轴读取适用 DESIGN 与批准证据，区分规则偏离、未验证 UI 与可接受实现差异；审查不代替用户确认。
- **W**：solution comment 只保留 change DESIGN、指定 UI 包和 comparison/final 的定位与证据。探索原型不是 child change 的默认批准；child 复用时必须绑定自身范围并验证引用。

下游必须实际读取引用内容；仅写路径或模板中的 `approved` 文本不算已消费。纯 LOGIC 仍用自身 logic.md/hash/浏览器合同，不生成虚假 UI DESIGN。

## 质量与证据

先做独立的视觉/任务 critique，再做可机械验证的 audit，最后按严重程度修复和 polish。检查产品特征、层级、字体、密度、色彩语义、完整状态、键盘/focus、缩放、触屏、长文案、响应式和 reduced motion。审美反模式是诊断提示，用户约束与已批准项目体系优先；检测器无告警不证明设计优秀。

浏览器证据必须来自实际打开的本次产物，保存工具、环境、视口、操作、结果和截图相对路径。至少覆盖桌面与窄屏，适用手势单独操作；模拟 viewport 不证明真实触屏。无浏览器时可交付 draft，但不能 ready。原型 mock 只证明原型，不证明真实服务、生产性能或真实用户研究。

schema 与 hash 校验由 下方 `<design-portability>` 标签的设计检查、发布与恢复协议 和 下方 `<design-portability>` 标签的设计检查、发布与恢复协议 承担；通过结构校验后仍需上述人工批准及运行证据。归档引用按 `--stage archived` 验证，不能用活动 change 的路径判断历史失效。

</design-contract>

<design-portability>

# 设计合同的离线消费、导出与恢复

单文件能力消费 UI 决定、需要首次基线发布或归档提升，而宿主不具备原项目工具时使用。本文保留相同 owner、摘要和批准门；不能把不可执行工具的名称当作已执行能力。纯 LOGIC 与无 UI 影响的工作独立继续。

## 工件与能力检查

项目基线位于 specdev/design/DESIGN.md，不可变版本位于 specdev/design/revisions/{revision}.md，检索投影位于 specdev/design/INDEX.md。当前 change 的合同位于 specdev/changes/{change}/DESIGN.md，原型、确认和浏览器证据位于 specdev/changes/{change}/prototypes/{design-id}/。change DESIGN 是规范，源码包不是第二份规则来源；跨 change 发布仍由项目设计知识网关唯一负责，消费方不能直写基线。

先确定宿主能否读取全部相关文件、保留原始字节、计算 SHA-256、解析无重复键的 YAML/JSON、实际打开浏览器、写入文件，以及调用原 owner 的发布网关。缺少某能力只阻塞需要它的门。不能计算摘要时输出原始材料和待计算清单，不能编造 64 位字符串；没有真实浏览器时原型保持 draft/blocked；不能调用网关时导出待执行发布包，不宣称基线已发布。

使用本文内联的项目设计、change 设计、UI 源码包和浏览器证据 schema 核对字段、类型、必需值和枚举；字段表不是许可。路径必须是所属根内的正斜杠相对 locator，不含绝对路径、反斜杠、空段、点段或符号链接。已有用户根设计文件保留原 owner，记录只读派生来源，冲突未解决不发布。

## 可移植的摘要算法

拥有确定性解析和加密工具时按以下算法计算；对话推测和人工抄写不能代替它们。

1. `byte SHA-256` 对文件原始字节计算，保留换行和编码差异；用于候选、确认快照、实际 HTML、根设计文件和 current 的并发比较。
2. `designDigest`：解析 Markdown YAML 头部及正文；删除头部顶层 confirmation、status、updated_at；递归按键名排序对象，数组次序保持不变；对排序结果生成无额外空白的 JSON，再连接一个换行和将 CRLF 换成 LF、首尾 trim 后的正文；以 UTF-8 计算 SHA-256。同一算法用于项目基线与 change 合同，不能用全文字节摘要替代。
3. `prototype digest`：递归枚举该包 final/ 和 comparison/ 中全部普通文件，拒绝符号链接和其他文件类型；按路径排序，形成 `[包内相对路径, 文件字节SHA-256]` 数组。将 `{candidates, selected_candidate, files}` 递归按对象键排序后生成无额外空白 JSON，以 UTF-8 计算 SHA-256。候选内容、选择或任一运行文件变化都会使旧确认失效。所有运行依赖必须位于这两个目录中，离线运行，不能通过其他目录或网络旁路摘要。

token 引用必须可解析且无循环；页面/规则/来源 ID 唯一。正式合同的 confirmation.digest 等于 designDigest，confirmation.record_digest 等于固定确认快照的字节 SHA-256，快照正文必须包含当前 designDigest、prototype_ref.digest 与 baseline.digest。baseline 指向存在的不可变 revision 且其 digest 相同；prototype_ref 与当前选中的包 ID、prototype digest 和 selection 一致。不得静默更新历史 change 所引用的基线。

## 初始设计与下游消费门

1. 已有项目先读代码中的 token、组件和真实页面，再继承已批准基线；没有基线时准备 change 内的 baseline-draft。默认自动组合候选并生成同任务 HTML，再集中展示。默认 3 个候选，配置范围 2–4 个；用户明确指定数量则记录 candidate_count_override 并严格按该数量生成。候选结构需要实质差异，不用换色复制冒充选择。
2. 源码包保留 final/index.html、final/styles.css、final/app.js 三个具名源码块；提取后与实际文件逐字一致。comparison 索引能访问每个候选，候选和 final 内容、控制与状态完整，所有资源存在且离线。源码、候选、资源先全部生成，包仍处于 awaiting-confirmation。
3. 浏览器证据对应当前 prototype digest。inspected_files 包含所有 candidate.entry 与 final/index.html；每个候选及 final 都至少有 390px、1440px case，case.entry 与实际入口相同，保存真实 PNG，final cases.states 覆盖每个页面的 `page-id:state`。实际检查操作、键盘/focus、溢出、长文案、缩放、reduced motion，记录 console_errors、offline、设计审查、技术审查及修复复核。模板或布尔标记不证明真实执行。
4. 预览门先核对全部资源、源码一致性、页面状态与浏览器证据。首次批准前，将候选基线的确定 revision/designDigest 预绑定到 draft change DESIGN；一次展示最终 HTML、change 合同、候选基线、永久目标、来源和例外。批准绑定上述原始字节与规范摘要，固定用户决定为 approval.md；后续 LOG 只追加定位。首次批准范围必须包含永久规范写入，原有同范围批准可继续使用。
5. 首次基线经原 owner 网关成功发布后回读 current、revision 和回执，确认与获批候选一致；再登记同一次 change confirmation。完整 approved 门通过后才能 ready。内容或摘要漂移时保持 blocked，先修订证据并重新确认受影响内容；不得用 pending 发布包满足 ready。
6. S 的 UI 行为/页面/状态 AC 引用 change 合同和基线版本。T 的 UI Ticket 使用 ui_change 和 design_ref 的 revision/digest/pages/acceptance；I/C 在开始时重新计算并实际读取对应内容，在 Design Conformance 中逐页逐 AC 记录实现证据。仅引用路径或标记 approved 不算消费。W 探索材料复用于子 change 时重新绑定其范围；历史包保留，消费的是 change prototype_ref 指定的包。

## 待执行网关包

无法调用原 owner 网关或无法写项目时，在 specdev/changes/{change}/prototypes/{design-id}/gateway-request.json 输出完整请求，状态为 `pending`；这是交接记录，不是新写入网关。请求明确 owner、mode（bootstrap/promotion）、候选路径、目标 current、预期 current 字节摘要（首次为 null）、批准对象、所需但尚未运行的门、已经完成的检查点。批准对象保留 approved、source、confirmed_at、candidate_sha256、current_sha256 和 新 `locator_version: 2`、`record: {base: "change", change, path, sha256}`；bootstrap 的 `preview: {base: "change", change, path, sha256, package_path, prototype_digest}` 绑定同一包实际 final HTML 和所有候选/运行资源。根项目已有设计规范时添加 `project_design: {owner, disposition: derived-readonly, sha256}`，候选 sources 保留相同 locator/digest。

按稳定路径顺序输出完整 FILE 文件包：README 与原负责计划/owner 依据、原始请求、draft change DESIGN、候选 baseline、源码包、comparison/各候选/final 全部运行文件、浏览器证据和截图、固定确认、gateway-request、LOG。二进制截图保留为可下载原文件；若宿主不能导出则明确缺失并保持 blocked，不用 Markdown 假装 PNG。不要只提供 diff 或摘要，不导出并声称已经发布永久 current。若缺少真实批准，approval 为 null 且请求保持 draft，不伪造批准字段。

答复必须区分“已实际保存”“待保存”“待网关执行”和“已验证/未验证”，列出每个完整相对路径、当前 phase、阻塞条件与下一步。只有工具成功回执才能宣称持久化或发布；消费方可以在依赖未满足时完成独立非 UI 工作。

## 原 owner 恢复与归档提升

恢复先重新读取用户保存或工具实际写入的状态、gateway-request、固定批准快照、全部候选与资源；检查原 pending transaction、相关锁、owner 和 recovery evidence。重新计算候选/确认/current/HTML/prototype 摘要，任一变化停止该发布并重备具体 diff。未知锁不接管，不因年龄删除，不改其他任务状态。

由原 owner 先 dry-run，再按同一明确批准 apply；写入顺序是不可变 revision、current、INDEX，逐步保存 validated/revision-written/current-published/index-written 的真实回执。current 已是相同候选且 snapshot 一致时只修复缺失索引/回执，不重复发布；只有 snapshot 存在时核验原批准和 expected current 后继续；current 已被其他发布更新则停止合并。调用方原 owner 保持不变。

实施完成后，归档仅提升有跨 change 价值并有来源的规则。一次性页面与未采用候选留在原 change；implemented 必须有实质实现证据，只有设计确认的规则保持 approved-intent。promotion 展示下一连续 revision、保留规则、merge/supersede/skip、证据和 current 并发条件，取得该具体 diff 的授权后交给同一网关。promotion 在移动前完成；若原操作已移动，则从 archive 实际位置恢复，只补原批准操作缺失步骤、不再次移动。移动后核验唯一位置、未变 Outcome、原型/合同/批准 locator 与原发布回执，完成原回执后冻结。

请求 v2 的 path/package_path 相对稳定 change 根；旧请求 v1 保持 project locator 只读解释。移动不可变材料前后须能解析相同原字节，不能为修路径重算批准或另建 operation。

</design-portability>

<project-design-schema>

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "schema_version": {
      "const": 1
    },
    "artifact": {
      "const": "project-design"
    },
    "revision": {
      "type": "string",
      "pattern": "^DESIGN-\\d{4,}$"
    },
    "owner": {
      "const": "specdev/archive-and-consolidate"
    },
    "scope": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "tokens": {
      "type": "object",
      "minProperties": 1
    },
    "rules": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1
          },
          "statement": {
            "type": "string",
            "minLength": 1
          },
          "scope": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "string",
              "minLength": 1
            }
          },
          "verification": {
            "enum": [
              "approved-intent",
              "implemented"
            ]
          },
          "sources": {
            "type": "array",
            "minItems": 0,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "change": {
                  "type": "string",
                  "pattern": "^\\d{4}-\\d{2}-\\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
                },
                "locator": {
                  "type": "string",
                  "minLength": 1
                },
                "digest": {
                  "type": "string",
                  "pattern": "^[a-f0-9]{64}$"
                }
              },
              "required": [
                "change",
                "locator",
                "digest"
              ]
            }
          }
        },
        "required": [
          "id",
          "statement",
          "scope",
          "verification",
          "sources"
        ]
      }
    },
    "sources": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1
          },
          "locator": {
            "type": "string",
            "minLength": 1
          },
          "url": {
            "type": "string",
            "minLength": 1
          },
          "revision": {
            "type": "string",
            "minLength": 1
          },
          "license": {
            "type": "string",
            "minLength": 1
          },
          "digest": {
            "type": "string",
            "pattern": "^[a-f0-9]{64}$"
          }
        },
        "required": [
          "id",
          "locator"
        ]
      }
    },
    "supersedes": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1
        },
        {
          "type": "null"
        }
      ]
    },
    "updated_at": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "schema_version",
    "artifact",
    "revision",
    "owner",
    "scope",
    "tokens",
    "rules",
    "sources",
    "supersedes",
    "updated_at"
  ],
  "$id": "urn:speculo:specdev:project-design:v1",
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

</project-design-schema>

<change-design-schema>

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "schema_version": {
      "const": 1
    },
    "artifact": {
      "const": "change-design"
    },
    "change": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
    },
    "revision": {
      "type": "integer",
      "minimum": 1
    },
    "status": {
      "enum": [
        "draft",
        "approved",
        "superseded",
        "blocked"
      ]
    },
    "scope": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "baseline": {
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "revision": {
              "type": "string",
              "pattern": "^DESIGN-\\d{4,}$"
            },
            "digest": {
              "type": "string",
              "pattern": "^[a-f0-9]{64}$"
            }
          },
          "required": [
            "revision",
            "digest"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "prototype_ref": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^UI-\\d{3,}$"
        },
        "digest": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$"
        }
      },
      "required": [
        "id",
        "digest"
      ]
    },
    "selection": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "candidate_id": {
          "type": "string",
          "minLength": 1
        }
      },
      "required": [
        "candidate_id"
      ]
    },
    "tokens": {
      "type": "object",
      "minProperties": 1
    },
    "pages": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1
          },
          "route": {
            "type": "string",
            "minLength": 1
          },
          "task": {
            "type": "string",
            "minLength": 1
          },
          "states": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "string",
              "minLength": 1
            }
          },
          "acceptance": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "string",
              "minLength": 1
            }
          }
        },
        "required": [
          "id",
          "route",
          "task",
          "states",
          "acceptance"
        ]
      }
    },
    "overrides": {
      "type": "array",
      "minItems": 0,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "rule_id": {
            "type": "string",
            "minLength": 1
          },
          "reason": {
            "type": "string",
            "minLength": 1
          },
          "scope": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "string",
              "minLength": 1
            }
          }
        },
        "required": [
          "rule_id",
          "reason",
          "scope"
        ]
      }
    },
    "confirmation": {
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "by": {
              "const": "user"
            },
            "at": {
              "type": "string",
              "format": "date-time"
            },
            "record": {
              "type": "string",
              "minLength": 1
            },
            "digest": {
              "type": "string",
              "pattern": "^[a-f0-9]{64}$"
            },
            "record_digest": {
              "type": "string",
              "pattern": "^[a-f0-9]{64}$"
            }
          },
          "required": [
            "by",
            "at",
            "record",
            "digest",
            "record_digest"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "updated_at": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "schema_version",
    "artifact",
    "change",
    "revision",
    "status",
    "scope",
    "baseline",
    "prototype_ref",
    "selection",
    "tokens",
    "pages",
    "overrides",
    "confirmation",
    "updated_at"
  ],
  "$id": "urn:speculo:specdev:change-design:v1",
  "allOf": [
    {
      "if": {
        "properties": {
          "status": {
            "const": "approved"
          }
        }
      },
      "then": {
        "properties": {
          "baseline": {
            "type": "object"
          },
          "confirmation": {
            "type": "object"
          }
        }
      }
    }
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

</change-design-schema>

<design-package-schema>

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "schema_version": {
      "const": 3
    },
    "artifact": {
      "const": "ui-prototype"
    },
    "change": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$"
    },
    "design_id": {
      "type": "string",
      "pattern": "^UI-\\d{3,}$"
    },
    "status": {
      "enum": [
        "detecting",
        "selecting",
        "awaiting-confirmation",
        "ready",
        "blocked"
      ]
    },
    "project_kind": {
      "enum": [
        "existing",
        "new"
      ]
    },
    "platforms": {
      "type": "array",
      "minItems": 1,
      "items": {
        "enum": [
          "desktop",
          "web",
          "mobile"
        ]
      }
    },
    "candidates": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1
          },
          "template_id": {
            "type": "string",
            "minLength": 1
          },
          "primary_reference": {
            "type": "string",
            "minLength": 1
          },
          "auxiliaries": {
            "type": "array",
            "minItems": 0,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "reference_id": {
                  "type": "string",
                  "minLength": 1
                },
                "dimension": {
                  "type": "string",
                  "minLength": 1
                }
              },
              "required": [
                "reference_id",
                "dimension"
              ]
            }
          },
          "rationale": {
            "type": "string",
            "minLength": 1
          },
          "structural_difference": {
            "type": "string",
            "minLength": 1
          },
          "task_id": {
            "type": "string",
            "minLength": 1
          },
          "entry": {
            "type": "string",
            "minLength": 1
          }
        },
        "required": [
          "id",
          "template_id",
          "primary_reference",
          "auxiliaries",
          "rationale",
          "structural_difference",
          "task_id",
          "entry"
        ]
      }
    },
    "candidate_count_override": {
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "count": {
              "type": "integer",
              "minimum": 1
            },
            "request": {
              "type": "string",
              "minLength": 1
            }
          },
          "required": [
            "count",
            "request"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "selected_candidate": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1
        },
        {
          "type": "null"
        }
      ]
    },
    "sources": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1
          },
          "locator": {
            "type": "string",
            "minLength": 1
          },
          "url": {
            "type": "string",
            "minLength": 1
          },
          "revision": {
            "type": "string",
            "minLength": 1
          },
          "license": {
            "type": "string",
            "minLength": 1
          },
          "digest": {
            "type": "string",
            "pattern": "^[a-f0-9]{64}$"
          }
        },
        "required": [
          "id",
          "locator"
        ]
      }
    },
    "prototype_files": {
      "type": "array",
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1
      },
      "allOf": [
        {
          "contains": {
            "const": "final/index.html"
          }
        },
        {
          "contains": {
            "const": "final/styles.css"
          }
        },
        {
          "contains": {
            "const": "final/app.js"
          }
        }
      ]
    },
    "browser_evidence": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1
        },
        {
          "type": "null"
        }
      ]
    },
    "updated_at": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "schema_version",
    "artifact",
    "change",
    "design_id",
    "status",
    "project_kind",
    "platforms",
    "candidates",
    "candidate_count_override",
    "selected_candidate",
    "sources",
    "prototype_files",
    "browser_evidence",
    "updated_at"
  ],
  "$id": "urn:speculo:specdev:ui-prototype:v3",
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

</design-package-schema>

<prototype-browser-evidence-schema>

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "schema_version": {
      "const": 1
    },
    "artifact": {
      "const": "prototype-browser-evidence"
    },
    "prototype_digest": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "generated_at": {
      "type": "string",
      "format": "date-time"
    },
    "provider": {
      "type": "string",
      "minLength": 1
    },
    "inspected_files": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "cases": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1
          },
          "width": {
            "type": "integer",
            "minimum": 320
          },
          "height": {
            "type": "integer",
            "minimum": 200
          },
          "screenshot": {
            "type": "string",
            "minLength": 1
          },
          "checks": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "rendered": {
                "const": true
              },
              "no_overflow": {
                "const": true
              },
              "keyboard": {
                "const": true
              },
              "focus": {
                "const": true
              },
              "long_text": {
                "const": true
              },
              "zoom": {
                "const": true
              },
              "reduced_motion": {
                "const": true
              },
              "states": {
                "const": true
              }
            },
            "required": [
              "rendered",
              "no_overflow",
              "keyboard",
              "focus",
              "long_text",
              "zoom",
              "reduced_motion",
              "states"
            ]
          },
          "states": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "string",
              "minLength": 1
            }
          },
          "entry": {
            "type": "string",
            "minLength": 1
          }
        },
        "required": [
          "id",
          "width",
          "height",
          "screenshot",
          "checks",
          "states",
          "entry"
        ]
      }
    },
    "console_errors": {
      "type": "array",
      "maxItems": 0
    },
    "offline": {
      "const": true
    },
    "design_review": {
      "type": "string",
      "minLength": 1
    },
    "technical_review": {
      "type": "string",
      "minLength": 1
    },
    "rechecked": {
      "const": true
    }
  },
  "required": [
    "schema_version",
    "artifact",
    "prototype_digest",
    "generated_at",
    "provider",
    "inspected_files",
    "cases",
    "console_errors",
    "offline",
    "design_review",
    "technical_review",
    "rechecked"
  ],
  "$id": "urn:speculo:specdev:prototype-browser-evidence:v1",
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

</prototype-browser-evidence-schema>

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

使用现有 config/Plan 的预算，不在下游偷偷扩大次数。只读操作也可能依赖已变化输入，仍需核实范围。

同一输入、同一方法、同一失败且没有新证据时，不通过更换 Agent、清空 attempts 或重复问用户来制造进展。恢复既有 Goal/Ticket 时沿用原失败记录，由 Lead 说明新增证据或方法变化后再派发。远程对账与 marker 去重由 “请求分诊阶段” 路由到原远程协议；进入远程分支后再读取，不在普通错误审查中加载传输实现。

取消只说明发出了取消请求，不保证远端副作用或子进程已经停止。传播 signal 后仍需等待属于本操作的完成信号；清理失败和业务失败分别报告，不能用后者隐藏前者。

取消必须说明停止接收、停止执行和外部工作终止各自的时点；无法确认终止时保留未知状态和后续核实责任。

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

数字和来源没有核实就写未验证，不编造备选方案或测试经历。HTTP API、服务、进程边界和事务边界有实际含义时保留精确术语，不机械替换成 module/seam。

## 运行声明与升级说明

字段、默认值、命令和平台行为查 owning source，并在有执行条件时运行文档给出的实际操作。仅检查文字或链接不能证明命令成功。缺少网络、凭据、平台或权限时，明确未执行项、风险与验证 owner；不换成模拟后声称真实路径已验证。

外部可感知的破坏性变更在引入时同步升级说明：受影响对象、旧新行为、精确迁移步骤、成功确认和真实恢复限制。用户数据已经发布就不是可随意覆盖的开发数据；预发布名称不解除兼容义务。使用目标项目已有升级文档位置，没有惯例时由当前任务批准的项目文档路径承载，不新建 SpecDev 永久 namespace。

双语或多语仅在目标项目要求时同步。保留未改变的已审文本，核对条款含义、术语、代码及链接；哈希或结构一致不证明翻译正确。不要照搬 DSH 的双语三件套、行数对齐和字数配额。

## 文档维护与可见行为

纯文档可以使用链接、示例、类型片段、生成一致性和事实核对，不伪造 TDD 或 E2E。涉及工具说明、prompt、错误消息或 CLI/UI 输出时按行为变更处理，追加实际模型/用户可见证据或明确未验证。执行入口见 下方 `<ref-specdev-i-implement-references-documentation-procedure>` 标签；C 可仅审查，不获得写入权。

没有所需行为层运行能力时报告缺口，并按原 Gate 保持未通过，不能借文档任务绕过。验收回读修改源和派生物，列出检查、未验证项及明确的新增行为；不用字数变化宣称 Token 或费用节省。

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

清理失败保留原故障及清理故障，不吞掉其中一个。

## 有效 red、负向对照与测试删除

有效 red 必须来自目标行为断言。编译错误、没选中测试、fixture 初始化失败、探针未执行、timeout 杀死子进程都不是目标回归证据。强制变异先证明修改落在真实执行路径，观察预期断言失败，再还原并复跑基线。

新增静态或工件准入规则，要从实际顶层 runner 投入故意无效输入并观察预期拒绝；只单测未接入的辅助函数不算落实。对于普通回归，在实际可行且安全时观察修复前失败。无法重现的部分明确未验证。

删除旧测试前逐项核对它所保护的行为、错误、兼容和历史回归在新测试中的承接位置与有效证据。新的公共接口测试存在，不证明旧测试全部冗余；缺失承接则保留或补齐。不要用 sleep、宽断言、吞错、重试、归一化或跳过来制造绿色。真实外部服务允许的有界重试须由该测试政策明确批准，并报告重试与跳过。

覆盖率和测试数量不能证明等价。结构检查、可执行反例和真实宿主观察分别报告，不把第一层写成第三层。

方法参考：<Url>https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/.agents/skills/dsh-ci-test-reliability/SKILL.md</Url>。使用目标项目的框架和真实 CI，不照搬 DSH 的工具、覆盖率或超时常量。

</ref-common-rules-test-reliability>

<ref-common-rules-change-completion>

# Change Completion

本规则是 change 整体完成或取消的唯一合同。README 的 Outcome 只是结论，必须能沿原工件重建证据；结束不等于已归档。

## 完成门

一个 change 只有同时满足以下条件才能 completed：

1. 所有计划内 Ticket 为 done，或因权威事实无需改动而记录为 cancelled；Direct Spec/非实现流程有等价验收。
2. required Ticket 有 source commit、passed candidate、父分支 result SHA，且父分支包含 source commit；current Ticket 有 implementation commit、passed direct-parent 验证和父分支 result SHA；对应 Ticket Evidence 的 workspace/集成记录均完整；不要求 JSON 镜像。
3. 每个行为有 Lead Evidence，全部 Spec 合同与 Goal Gate 可定位。
4. current Ticket 的 current-workspace 检查/回归和适用 E2E，或 required Ticket 的 source-worktree 非 E2E 检查、parent-candidate 集成/回归和 required E2E 已通过；not-required 有理由。
5. 迁移、发布、监控、恢复和不可逆批准已完成或明确不适用。
6. 没有未批准 deviation、blocker、unverified、活动 candidate 或未集成 source checkpoint。
7. Ticket、Map 的依赖/导航、Goal Plan、Evidence、README 与实际 Git 一致；不复制单票状态。

UI 实施还需 Evidence 对照已批准 change DESIGN、固定基线与页面/状态验收；原型截图不代替实现的真实渲染。设计漂移或未确认例外按 下方 `<design-contract>` 标签 返回 owner，不能以票全 done 消除缺口。

Evidence-only Done 和 empty commit 不满足完成门.

父实现 change 还必须满足 下方 `<ref-common-rules-parent-implementation-orchestration>` 标签：全部成员 completed，Implementation Map 与 Implementation Plan completed 且 revision 一致，跨 change 全套验证通过，`specdev/changes/{change}/evidence/implementation-orchestration.md` 完整，没有活动派单、candidate、serialization lock 或未裁决冲突。父完成不自动归档或移动任何成员。

## 转换 Owner

- 有 Goal Plan：其唯一 Lead 在关闭最后 Gate 后拥有转换；
- 无 Goal Plan 的 Ticket/Direct Spec：当前 I-implement 主会话 owner 拥有转换；
- 非实现型终点：最终验收工件 owner 使用本规则。
- 父实现 change：Implementation Plan 的唯一 Lead 在全部成员与 aggregate gate 关闭后拥有转换。

Owner 依据来自原 Goal/Implementation Plan、I 的真实会话或非实现验收工件，不由调用方任意声明。门全部通过后，重验 README 旧字节和证据，由同一 owner 原子更新 specdev/changes/{change}/README.md 唯一 `Outcome: completed` 行并链接完成依据，再重读；不连带改票时间戳或复制进度。轻量任务由 README 的范围、逐 AC 实际结果、适用验证和下一步承接等价证据；用户要求的独立工件和复杂实现门不得省略。

## 远程来源与归档

远程动作不参与本地完成判定。Triage `external_action` 为 `pending-close`/`close-failed` 时先 reconcile；`closed`、`waived` 或 `not-applicable` 才允许 Archive。Triage `publish_action` 为 `pending`/`publish-failed` 时先恢复或结束 publish；`not-requested`、`published` 或 `waived` 才允许 Archive。`not-requested` 是默认，未点过 publish 的 change 不被新模式绑架。归档后工件只读。

**完成标准**：完成声明可由本地工件、Git 与验证重建；只有一个 owner 命中；失败 candidate 不污染父分支。

## 非实现复盘终点与 PR 归档门

仅有 R-retro（可先经 T intake）的 review-only change，以 completed 的 RETRO 报告作为等价验收；不能同时存在 Spec、Ticket、Map、Goal Plan、implementation 工件、Evidence 或 worktree。报告 sources 非空、结果诚实、全部验收完成，owner 按原完成转换规则更新状态；存在实现工件时仍走原实现完成门。insufficient-evidence 仅表示报告完整，不表示问题已解决。

PR requested=true 且 status=planned/failed 时阻塞归档；delivery_target=ready 时 draft 也保持未闭合。draft 目标可由 draft/ready 满足，ready 目标只由 ready 满足；waived 须记录放弃交付的授权与原因。创建成功不等于已授权 merge。独立 TRI 不因关联 change 就参与完成/归档门。

## 整体取消

只有真实用户取消请求发生时，由原完成 owner 核对并记录：决定来源、范围和时间；未交付内容与已落地代码/数据/设计/远程影响；活动 writer 已停止或明确交接的证据；父子依赖、未集成 checkpoint/candidate 的处置；已承诺外部动作的结果或明确放弃/转交依据；后续 owner、保留材料和恢复限制。记录放 README 或原 Goal 决定章节并链接，齐全后重验旧字节，写入唯一 `Outcome: cancelled` 并重读。

A 只验证取消结果，不代替用户取消。单 Ticket cancelled 不推导整体取消；不批量改票为 done/cancelled，不自动回滚、远程关闭或删除 branch/worktree。未知外部结果继续阻塞归档；超时/无响应不能证明 writer 结束。已发布 DESIGN revision 保留，未实现候选随 change 保存；cancelled 不满足 promotion 的 implemented 完成来源门。


## 轻量证据与取消的只读语法

轻量 README 使用唯一 scope/acceptance/verification 显式锚点，acceptance 列可观察的 AC-n。完成时 verification 表使用 `AC | Result | Evidence`（可选 SHA256 列），每个 AC 恰一行 `passed` 和可回读实际证据 locator；提供摘要时必须匹配真实字节。证据可用 #anchor 指向同 README 的独立证据段，不能指向 Outcome/Ownership 或该结果声明自身，记录 `Method`、`Source`、`Observed`、`Result: passed`；有 `Command` 时须 `Exit: 0`。实际运行后才形成，不为 active 任务先造空证据；静态字段只供回读，不认证语义真实性或授权。

无 Goal 的 owner 在 README `## Ownership` 写 `Owner` 与 `Evidence`；后者指向实际会话/交接原文或同 README 的独立证据锚点，其 `Owner` 或 `Session` 必须匹配。若动作绑定 `Work`，原证据必须同值；不是每 Work 调用登记。

取消在 README `<a id="cancellation"></a>` 下保留 `Source`、`Scope`、`Time`（实际 ISO 时间）、`Confirmed-By`（原 owner）、`Undelivered`、`Landed`、`Writers`、`Dependencies`、`Checkpoints`、`External`、`Next`。Source 指向真实取消决定原件或同 README 的独立原请求锚点，不能以取消结论自证。Writers 为 `none: <依据>` 或 `stopped: <停止/交接证据 locator>`；后者原件须有 `Writers: stopped` 与真实 Observed。Dependencies/Checkpoints/External 使用 `none|resolved|transferred|waived: <处置依据>`，不能把未知写成已解决。活动/review/integrating/blocked 的执行记录仍须原 owner 处置，不由取消声明抹掉。

独立 Spec 的无票 Direct Spec 使用原 evidence/direct-spec 的 `## Acceptance Verification` JSON array 逐 AC 回读实际结果：id/result/method/source/observed；command 存在时 exit 为 0，外部 evidence 引用须有匹配 sha256，内联观察无需另建文件。空 Evidence、仅标题或 passed 自评不通过。`--stage complete` 只判本地完成；A 移动前使用 `--stage archive-ready` 同时核对对应 completed/cancelled 门和已承诺远程交付，目标移动后再使用 archived。

</ref-common-rules-change-completion>

<ref-specdev-i-init-setup-assets-change-readme-template>

# <本次目标>

Outcome: active

<a id="scope"></a>
## 目的与范围

<当前单一目标、授权写集、IN/OUT、真实请求出处和约束。独立 specdev/changes/{change}/spec.md 已负责规格时删除本模板 scope/acceptance/verification 并改为导航，不维护两套权威。>

<a id="acceptance"></a>
## 验收

- [ ] AC-1：<可观察、可判定行为及验证方式>

## 当前工作

<简单任务清单与接续点；若使用无票 Goal 或独立 Ticket，则这里只导航其负责清单，不复制进度。>

<a id="verification"></a>
## 验证依据

<尚未执行时如实描述缺口，不预填 passed。完成后每 AC 一个实际结果行：>

| AC | Result | Evidence |
|---|---|---|
| AC-1 | <实际结果> | <#独立证据锚点或对象内文件 locator> |

<需要校验原件摘要时可增加 SHA256 列，填写实际计算结果；非必需。真正执行后才在独立证据段记录 Method、Source、Observed、Result；有 Command 须有真实 Exit。>

## 下一步

<下一 owner、入口、阻塞与恢复限制；没有实际交接不建空 ownership/批准槽。>

</ref-specdev-i-init-setup-assets-change-readme-template>

<ref-specdev-i-init-setup-references-change-record-examples>

# 按需 owner、验证与取消记录

只在相关动作需要可回读证据时采用；不是每 Work 的默认表单。占位文本不是实际证据，也不创造批准。

## 简单任务的原 owner

无 Goal 时，README 可用以下段落绑定实际会话依据。复杂任务使用原 Goal/Implementation Plan 的 lead，不再复制：

```markdown
## Ownership

Owner: session:actual-locator
Evidence: #handoff

<a id="handoff"></a>
## 本次会话依据

Session: session:actual-locator
Source: 用户请求或真实交接的可回读来源
Observed: 实际接受的目标、范围和当前负责关系
```

需要绑定 P bootstrap 时，Ownership 与原会话依据都保存 `Work: specdev/prototype`；仅此实际动作需要，不逐 Work 更新镜像。Evidence 不得指回 Ownership 自身。

## 真实验证后记录

```markdown
<a id="verified-ac-1"></a>
## AC-1 观察

Method: 实际使用的验证方法
Source: 被检验源码/工件与实际输入的 locator
Observed: 实际输出、结果与覆盖边界
Command: 确实执行的命令（未执行命令则省略本项）
Exit: 0
Result: passed
```

README verification 的 AC-1 行引用 `#verified-ac-1`；可以引用原 Evidence 的对应段。不以声明 passed 替代真实运行；提供 SHA256 时工具严格匹配原件字节，缺摘要能力不编造值。

## 整体取消

用户确实取消后，保留独立原请求/交接依据，再按原完成 owner 核对下面字段。实际无某项时写有理由的 none，尚未知不能写 resolved。

```markdown
<a id="cancellation"></a>
## 取消说明

Source: #actual-cancellation-request
Scope: 实际取消范围
Time: 2026-10-14T10:00:00+08:00
Confirmed-By: session:actual-locator
Undelivered: 尚未交付的需求
Landed: 已落地代码、数据、设计与远程影响
Writers: none: 实际核验没有活动写入者的依据
Dependencies: none: 没有父子依赖的依据
Checkpoints: resolved: 未集成 checkpoint/candidate 的实际处置
External: waived: 已承诺外部动作经具体决定放弃的依据
Next: 后续 owner、保留材料和恢复限制
```

Writers 有过实际写入者时用 `stopped: <证据 locator>`，原件须有 `Writers: stopped` 和真实 Observed；超时不是停止。Dependencies/Checkpoints/External 允许 none/resolved/transferred/waived，但都要具体依据。全部核对通过后才将唯一 Outcome 改 cancelled，不批量改票、不回滚或关闭远程。

</ref-specdev-i-init-setup-references-change-record-examples>

<ref-common-rules-operating-governance>

# 运行治理细则

仅真实交接、并行写入、共享所有权或父子集成时读取；普通启动不要求加载全部治理。


1. **先发现、后询问**：仓库、配置、schema、测试和文档能回答的事实先探索；只询问真正影响行为、架构、风险、范围、迁移或验收的偏好。
2. **规划深度随风险增长**：Lite、Standard、Deep 由复杂度和事故半径决定，不由文档长度决定。
3. **Ticket 是微型计划**：每个 Ready Ticket 决策完备，但不展开逐行代码。
4. **Goal Plan 按需出现**：简单单票可沿用既有 I/Direct Spec；用户要求长期目标、多个 change 或总控时由统一 P 显式生成，不以固定章节数量作为质量标准。
5. **证据优先**：每个验收合同、Ticket 和 Gate 都必须有可重复验证与 Evidence。
6. **路径所有权**：并发实现者只能修改授权项目路径；shared path 有唯一 owner。
7. **偏差显式化**：计划与事实冲突时停止、记录、修订，不静默扩大范围或改写契约。
8. **状态单一来源**：Ticket frontmatter 是单 Ticket 状态权威；Map 和 Goal Plan 是投影与编排。
9. **知识以当前真相为目标**：归档保留历史，永久知识只保留仍真实且经实现验证的结论。
10. **恢复依赖权威工件**：跨 Work 或 Agent 的实际交接在原 README/计划/Evidence 记录 owner、范围、未决动作和下一步，不维护 Work 调用镜像；返回下一 Work 和权威工件完整路径。
11. **本地执行权威**：远程 Issue/PR/URL 只作为来源或完成投影；Spec、Ticket、Map、Goal Plan、Evidence 和状态始终以本地工件为准。
12. **完成与归档分离**：本地完成按 change completion 合同决定；远程 close 失败不回滚完成，但必须 reconcile 或 waive 后才归档。
13. **Lead 与隔离正交**：Lead 固定拥有原计划、Evidence 与父分支；是否派遣 任务执行者 由 Lead 动态决定。Goal Plan 创建时询问 Ticket 是否开启 worktree，默认不开启；选择只作用于当前 Goal Plan。
14. **策略化验收**：current 模式使用当前 workspace 严格串行、direct-parent 验证；required 模式使用 source worktree 与 parent-candidate。只有 required 模式创建独立 Ticket worktree。
15. **父子权威隔离**：父实现 change 只拥有 Ready 子 change 的组合 Ticket DAG、serialization、全局 workspace/资源和实现进度投影；子 change 继续拥有全部行为与实现合同。一个未完成子 change 只能属于一个未完成父实现 change。

共享规则：

- 下方 `<planning-principles>` 标签
- 下方 `<artifact-contract>` 标签
- 下方 `<readiness-and-depth>` 标签
- 下方 `<ref-common-rules-path-ownership>` 标签
- 下方 `<evidence-and-verification>` 标签
- 下方 `<deviation-control>` 标签
- 本文的网页平台运行约定
- 下方 `<ref-common-rules-codebase-design>` 标签
- 下方 `<ref-common-rules-change-completion>` 标签
- 下方 `<ref-common-rules-parent-implementation-orchestration>` 标签


## 保真与局部暂停

用户明确的交付数量、默认工具、风险门禁和权限不会因为入口精简而改变；行为变化必须显式列出。真实源优先，保留软链接、必要元数据、许可和用户未提交改动；系统或插件缓存不属于可写源。资源冲突只暂停相关写集及其依赖闭包；不接管他人 owner、锁或未闭合事务。正式知识必须走原网关。

</ref-common-rules-operating-governance>

<ref-common-rules-parent-implementation-orchestration>

# Parent Implementation Orchestration

本规则只约束 Ready Spec/Tickets 之后的跨 change 实现，供统一 P-goal-plan、I-implement 与 A-archive-and-consolidate 读取。

## 输入边界

父实现 change 只能在所有成员通过 Ready Spec/Tickets 输入门后创建。父 Work 不调用或代行 Triage、Grill、Wayfinder、Spec、Tickets 或普通 Goal Plan；输入不足时不留下父状态或父工件。

## 权威边界

- 父 Implementation Map：成员、组合 Ticket inventory、跨 change dependency/serialization 与 revision 的唯一权威投影。
- 父 Implementation Plan：Lead、全局 workspace 策略、implementation agent/integration attempt 上限、frontier、Wave、locks 和 integration queue 的唯一权威。
- 子 change：自己的 Spec、Ticket、内部 Goal Gate、workspace、Git、Evidence 和完成状态的唯一权威。

父工件不得复制完整子合同。子权威变化时停止旧派单、递增父 Map revision 并重算父 Plan；不能从旧父投影覆盖子工件。

## 唯一所有权

一个 active/blocked 子 change 最多属于一个未完成父实现 change。v1 不支持父实现 change 嵌套。父 Lead 是父工件、父计划及授权 Evidence 写入、E2E、repository/ref integration queue 和父分支推进的唯一 owner；implementation agent 只写授权项目 workspace。

## I-implement 调用

父 Plan 可以替代缺失的子 Goal Plan 提供 workspace/integration 策略和全局执行边界。子 Goal Plan 存在时继续拥有子 change 内 Gate，但不得与父策略冲突。I-implement 完成或阻塞一个组合 Ticket 后返回父 P Goal，不要求用户重新激活 change。

## 归档与完成

未完成父实现 change 的成员不得归档。成员满足普通 change completion 时可以先 completed，但不自动归档。父 change 只有全部成员 completed、Map/Plan completed、aggregate Evidence 完整且无 active dispatch/candidate/lock 后才能 completed；完成或归档均不自动级联。

## 局部阻塞不升级为全局停机

父创建前仍全部成员预检且 all-or-nothing。父开始运行后，单票 blocked/deviated、他人资源冲突或必需 Skill 失效只阻塞该票及其依赖闭包，父 Map/Plan 可保持 in_progress 与有效的全局执行门，继续独立已授权 frontier。只有共享的全局门禁失败、计划整体失效或没有合法 frontier 时，才将父运行暂停；不得为继续运行接管其他任务。

</ref-common-rules-parent-implementation-orchestration>

<ref-common-rules-workflow-routing>

# 场景路由


| 场景 | 入口 | 正常出口 |
|---|---|---|
| 需要冻结外部来源或审计摄入 | T-triage intake | D / G / W / P / S / C / T |
| 尚未成 Change，只要先在 GitHub 留一条仍 open 的记事项 | T-triage capture | 停止 / 以后 intake / W |
| 本地 change 完成且来源可关闭 | T-triage reconcile | A |
| 本地 change 完成且要把 Ticket 记到 GitHub | T-triage publish | reconcile / A / 停止 |
| 疑难 bug 或性能回归 | D-diagnose-bugs | S / T / I / R / W |
| 模糊但可通过决策访谈收敛 | G-grill-with-docs | P / S / T / W |
| 大需求包含多个未界定 change 或未知路径 | W-wayfinder | G / P / D / S / T |
| 需要检测项目 UI、选择设计方向并生成可运行设计包 | P-prototype | G / S / T / I |
| 固定点 diff、branch 或 PR review | C-code-review | completed / T / S / G |
| 外部行为已清楚 | S-spec | T-tickets |
| Ready Spec 需要垂直切片 | T-tickets | P-goal-plan / I |
| 单个已拆票 change 或多个 Ready change 的 Goal 规划、持续实现与恢复 | P-goal-plan | I / verify / completed / blocked |
| 旧 O 调用或恢复键 | P-goal-plan | 统一 P 多 change 模式 |
| Ready 执行 | I-implement | Triage / A / blocked / deviation |
| 开发完成后需要理解当前 change 或追问实现 | L-learn-change | 返回用户 / 继续提问 / Triage / A |
| 架构健康扫描 | R-review-architecture | G / T |

同 change 下一阶段需要当前一手推理且上下文健康时继续；切换 repo/person/harness 或旁路时使用 交接能力（完整保存原工件、检查点、余项与下一 owner；不可用时输出完整交接包）；严格限定且可独立派单时使用 Dispatch Packet；其他长上下文以权威工件路径恢复。平台不支持 clear/compact 时不虚构操作。


本地已清晰请求不强制绕行 Triage。完成后要记账才选 publish；尚未成 Change、只想先留 inbox 记录才选 capture。publish、reconcile 与 capture 写不同远程对象，可先后执行。G 是单 change Grill，P-prototype 是 UI 设计，不与统一 P-goal-plan 混淆。W 发现候选后逐个交 G/S/T；单 change 拆票后可交 P 规划，多个 child 创建父 Goal 前仍须全部 Ready。原缺陷诊断 D、风险分诊、远程 reconcile、完成后发布投影和记事项捕获职责不删除。

## 复盘与交付路由

开发环境/流程复盘 → 下方 `<ref-specdev-r-retro-skill>` 标签。代码讲解仍为 L；Speculo 产品反馈仍为 retro command。CI/安全/PR/包发布 → “请求分诊阶段” 的对应模式；确定性修复回到 D/I，不由 T 接管代码。

长任务在阶段边界按产物与待决问题选择继续、压缩上下文或 handoff；交接只携带准确 owner、SHA、输入和未闭合动作，不硬编码特定模型的上下文阈值，不自动启动其他会话。

## 专业分支与相邻请求

| 请求 | 入口/分支 | 不因此触发 |
|---|---|---|
| 测量哪个用户操作值得优化 | R-review-architecture / performance | 不直接实现，不先发明性能阈值 |
| 已有性能故障需要确认根因 | D-diagnose-bugs | 不把微基准替代原始症状 |
| 一次性事件暂时无法重现 | D / evidence-triage | 不标记 root-cause-confirmed，不创建 Ready 修复 |
| 已批准的文档维护 | I-implement / documentation | 不新建文档 workflow，不伪造 TDD |
| 只审查文档或某个 commit | C-code-review | 不写项目、不把单 commit 扩大到 HEAD |
| 理解已实现 change | L-learn-change | 不改 Learning workflow，不永久晋升 |

只读调查或审查不是后续修改授权。清晰的小请求继续走原适用阶段，不因增加专业分支强制进入 W/G/Triage；无差异、无候选和证据不足均可诚实返回，不制造工作量。

</ref-common-rules-workflow-routing>

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

<ref-specdev-i-implement-references-documentation-procedure>

# 文档维护执行分支

仅在已授权的 Ready documentation Ticket 或满足原条件的 Direct Spec 中使用；当前 Work 仍为 `specdev/implement`，权限、workspace、commit 和验收仍走 I。文档建议或审查请求不授权写入。入口预检和两轴审查不因选择本分支消失。

## 定位事实与修改范围

直接使用 下方 `<shared-writing-for-agents-references-current-facts-docs>` 标签 六步；格式需要时读取 下方 `<ref-common-rules-documentation-standard>` 标签。区分只改说明、修正示例以及改变 prompt/tool/CLI/UI 可见行为。按 Ticket 的获批写集维护项目文档；Evidence 留在原 change 的本票文件或 Direct Spec Evidence，不创建第二份文档状态。

列出每条行为声明的 owner 与验证方法：源码、类型、实际命令、运行场景或人工核对。先修 owner，再同步相应派生物与项目要求的语言侧；禁止手改生成文件。保存行为、条件、否定、例外、失败与所有权，消除仅本会话可理解的叙述。

## 验证与交付

纯说明修改使用相关链接、类型片段、示例、生成一致性和语义核对，不伪造代码 red/green。写入命令实际运行后才记录对应成功结果；缺网络、平台、凭据或权限时保留未验证和责任人，不替换成 mock 后写“真实入口通过”。

可见行为改变时，补充实际输出或目标项目的行为快照/场景证据，并在需要时读取 下方 `<ref-common-rules-agent-experience>` 标签。默认值、错误、兼容或数据格式变化与代码同改；外部破坏的升级说明在当前改动产生，写清旧新行为、受影响者、迁移验证与真实回退限制。

在原 Evidence 记录 `Engineering Evidence`，kind 为 `documentation`；字段与校验见 下方 `<ref-common-rules-engineering-evidence>` 标签。每项声明为 verified 或 unverified；总体 partial/blocked 不等于 Ticket done。新分支使用 `--engineering documentation` 校验对应原工件，再完成 I 的适用项目验证、两轴审查、状态回读和交付。

## 失败与恢复

以原 Ticket/Spec、文档 owner、源摘要和已运行证据恢复；输入漂移使相应验证失效，不覆盖旧证据。上层行为合同冲突返回原 owner。required 验证未运行时不能以“只改文档”越过 Gate；不适用须说明原因。结果明确区分修改了什么、实际运行了什么、只核对了什么和仍待验证什么。

实现改变源码入口、接口、持久化、默认行为、错误或恢复时，核对本次范围内 docs 的当前事实；已有负责正文只更新原处。命令、事实核对和未验证项放原 Evidence，轻量任务放 README verification。不创建 docs-sync state/sidecar，不推进其 commit 基线，不因此取得 Git 或永久知识权限。

</ref-specdev-i-implement-references-documentation-procedure>

<ref-common-rules-path-ownership>

# 路径所有权与并发规则

路径所有权是逻辑写入边界；worktree 是物理隔离边界，两者不能互相替代。

## 1. 四类路径

- `expected_changes`：导航预测；
- `writable_paths`：当前 Ticket implementation owner 可写的硬边界；
- `read_only_paths`：只读上下文；
- `shared_paths`：多个 Ticket 可能触达且必须有唯一 owner 的项目路径。

所有项目路径使用项目根相对路径。根依赖清单、锁文件、根导出、共享 schema、迁移索引、全局路由和跨 Ticket 合同默认视为 shared。

## 2. 所有权规则

1. 可能并行的 Ticket，其 writable paths 不得相交；glob 按覆盖关系判断。
2. shared path 只由专用 owner Ticket 修改；消费者 Ticket 只读。Lead 负责集成，不以冲突解决替代 shared owner。
3. 实现执行者 只写其 Packet 与 Ticket 授权路径；Lead 自行实现也受同一边界约束。
4. review/research/test-observation agent 只读项目与 SpecDev 工件。
5. 越界前停止并按 deviation control 提出 ownership change；不得先改后报。
6. 上游 Ticket 改变目录/合同后，下游基于已集成父分支重新解析路径和 preflight。

## 3. Ticket workspace strategy

Goal Plan 创建时选择 Ticket workspace strategy，默认 `current`。`current` 模式的 Ticket 使用当前分支、当前 workspace 和严格串行执行；允许一个 实现执行者 写入当前 workspace，但前一 Ticket 必须完成 commit、Lead 验收和 direct-parent 验证后才能开始下一个。`required` 模式每个 Ticket 使用唯一来源 worktree `specdev-worktree/<ticket-id>`，并通过 candidate-merge 集成。没有 Ticket 的获批 Direct Spec 继续由 current workspace 唯一 owner 执行；只读调查不创建实现 worktree。

workspace/implementation owner 可以是 Lead 或动态 实现执行者；integration owner 固定为 Lead。current 模式 Lead 在父分支直接验收和推进，required 模式 Lead 建立 parent-candidate、运行适用 E2E 并推进父分支。required 生命周期由 下方 `<ref-common-skills-dev-worktree-skill>` 标签 管理，current 生命周期由 I-implement 的 direct-parent 规则管理。

## 4. 并发

required 模式 实现执行者 上限取 Goal Plan、config 和平台能力共同约束，Lead 参与实现时计入。current 模式保持单 writer 串行安全不变量，Ticket 严格串行。review/research/test-observation agent 不设置 SpecDev 数字上限，但 Lead 必须避免重复工作与可变环境争用。

子 change 属于父 Implementation Map 时，再取父 Implementation Plan 的全局 实现执行者 上限与 workspace 策略；该上限跨全部成员合计。无 dependency 的组合 Ready Tickets 若 writable/shared paths 重叠，也必须在父 Map 建立 serialization。相同 repository/ref 的 parent integration 严格串行；一次父 HEAD 推进会使其他成员旧 candidate 失效。

**完成标准**：每个项目写入映射到唯一 change、Ticket、owner 和来源 worktree；shared 与父分支写入 owner 唯一。

</ref-common-rules-path-ownership>

<ref-common-rules-codebase-design>

# 代码仓设计

设计**深层模块**：通过一个小接口承载大量行为，放置在干净的缝合点处，可通过该接口进行测试。在任何设计或重构代码的地方使用这些语言和原则。目标是为调用者提供杠杆效应，为维护者提供局部性，为所有人提供可测试性。

使用 `specdev/changes/{change}/CONTEXT.md` 和 `specdev/context/` 的词汇谈论领域；使用本规则的词汇谈论架构。

## 术语表

以下术语用于讨论设计的共同含义，不是词语禁令。项目已有精确的 API、service、component、process/security boundary 等概念时使用其原名；不要为了套用词汇掩盖真实工程语义。

**Module（模块）** — 任何具有接口和实现的东西。有意识地与规模无关：函数、类、包或跨层切片。unit、component 或 service 可以是项目内具体模块类型，不要求改名。

**Interface（接口）** — 调用者正确使用模块所需了解的一切：类型签名，还包括不变量、顺序约束、错误模式、必需配置和性能特征。API/signature 只覆盖部分调用知识时，补充遗漏的约束，而不是禁止这些准确名称。

**Implementation（实现）** — 模块内部的内容，它的代码体。区别于 **Adapter（适配器）**：一个东西可以是一个小适配器加一个大实现（Postgres 仓库），也可以是一个大适配器加一个小实现（内存假实现）。当讨论缝合点时用 "adapter"；否则用 "implementation"。

**Depth（深度）** — 接口处的杠杆效应：调用者（或测试）每学习一个单位的接口可以驱动的行为量。当大量行为隐藏在小接口后面时，模块是**深层的**；当接口几乎和实现一样复杂时，模块是**浅层的**。

**Seam（缝合点）** _(Michael Feathers)_ — 一个可以在不编辑该位置的情况下改变行为的地方；模块接口所在的*位置*。缝合点放在哪里本身就是一个设计决策，与缝合点后面放什么不同。process、security、transaction boundary 与 DDD bounded context 各有明确含义，不统称为 seam。

**Adapter（适配器）** — 在缝合点处满足接口的具体事物。描述的是*角色*（它填充哪个槽位），而非实质（内部是什么）。

**Leverage（杠杆效应）** — 调用者从深度中获得的好处：每学习一个单位的接口获得更多的能力。一个实现为 N 个调用点和 M 个测试带来回报。

**Locality（局部性）** — 维护者从深度中获得的好处：变更、bug、知识和验证集中在一个地方，而非分散在调用者之间。一次修复，处处生效。

## 深层 vs 浅层

**深层模块** = 小接口 + 大量实现：

```text
┌─────────────────────┐
│   小接口             │  ← 少量方法，简单参数
├─────────────────────┤
│                     │
│  深层实现            │  ← 隐藏的复杂逻辑
│                     │
└─────────────────────┘
```

**浅层模块** = 大接口 + 少量实现（应避免）：

```text
┌─────────────────────────────────┐
│       大接口                     │  ← 大量方法，复杂参数
├─────────────────────────────────┤
│  薄实现                          │  ← 仅仅是透传
└─────────────────────────────────┘
```

设计接口时，问自己：

- 我能减少方法数量吗？
- 我能简化参数吗？
- 我能隐藏更多内部的复杂性吗？

## 原则

- **深度是接口的属性，而非实现的属性。** 一个深层模块内部可以由小型、可模拟、可替换的部分组成 — 只是它们不属于接口的一部分。一个模块可以拥有**内部缝合点**（对其实现私有，用于其自身测试）以及位于其接口处的**外部缝合点**。
- **删除测试。** 想象删除这个模块。如果复杂性消失，它就是个透传层。如果复杂性在 N 个调用者中重新出现，它就在发挥价值。
- **接口就是测试表面。** 调用者和测试穿过同一个缝合点。如果你想测试接口_之外_的内容，模块可能形状不对。
- **适配器数量不是设计门槛。** 用真实消费者、测试隔离、安全、生命周期或扩展义务证明接缝价值；一个生产实现也可能需要稳定接口，两个实现也可能只是无价值间接层。不要为满足数量发明第二个适配器。

## 为可测试性而设计

良好的接口使测试变得自然：

1. **需要替换、测试隔离或独立资源生命周期时显式接收依赖。** 在组装入口创建实例是正常职责；不为注入无状态常量或没有变化依据的对象增加配置。下面比较需要替换外部支付依赖的情形：

   ```typescript
   // 可测试
   function processOrder(order, paymentGateway) {}

   // 难以测试
   function processOrder(order) {
     const gateway = new StripeGateway();
   }
   ```

2. **纯计算优先返回结果；必要副作用明确由谁拥有。** 写文件、发请求等业务行为不能为了纯函数形式被删除，需声明失败后的状态保证、重试与清理。以下示例只比较计算函数的局部设计：

   ```typescript
   // 可测试
   function calculateDiscount(cart): Discount {}

   // 难以测试
   function applyDiscount(cart): void {
     cart.total -= discount;
   }
   ```

3. **小而明确的调用接口。** 减少调用者必须理解的独立选择；方法变少不保证测试变少，隐藏分支、不明确的可选参数与隐式默认仍需要验证。

## 关系

- 一个 **Module** 恰好有一个 **Interface**（它向调用者和测试呈现的表面）。
- **Depth** 是一个 **Module** 的属性，对照其 **Interface** 来度量。
- 一个 **Seam** 是一个 **Module** 的 **Interface** 所在的位置。
- 一个 **Adapter** 位于 **Seam** 处，满足 **Interface**。
- **Depth** 为调用者产生 **Leverage**，为维护者产生 **Locality**。

## 已拒绝的框架

- **深度作为实现行数与接口行数之比** (Ousterhout)：奖励填充实现。我们使用深度即杠杆效应来替代。
- **"Interface" 作为 TypeScript 的 `interface` 关键字或类的公开方法**：太窄 — 此处的接口包括调用者必须了解的每个事实。
- **模糊地互换 boundary、seam、interface**：分别说清进程/安全边界、可替换点或调用契约，不禁止具有准确语义的工程术语。

## 深化

如何在给定依赖关系的情况下，安全地深化一组浅模块。假定你已掌握上面的词汇 — **module**（模块）、**interface**（接口）、**seam**（接缝）、**adapter**（适配器）。

### 依赖类别

在评估一个深化候选时，对其依赖进行分类。类别决定了深化后的模块如何通过其缝合点进行测试。

#### 1. 进程内

纯计算、内存状态、无 I/O。先检查合并能否集中相关变化而保留独立职责；通过稳定调用接口测试。不要仅因进程内运行就合并不同领域或生命周期。

#### 2. 本地可替换

具有本地测试替代品的依赖（PGLite 替代 Postgres、内存文件系统）。先验证替代品覆盖目标契约，尤其是事务、并发、权限及失败语义；有替代品本身不证明等价。深化后的模块在测试套件中使用运行的替代品进行测试。接缝是内部的；在模块的外部接口处不需要端口。

#### 3. 远程但自有（端口与适配器）

跨网络边界的自有服务（微服务、内部 API）。在接缝处定义一个 **port**（端口，即接口）。深模块拥有逻辑；传输层作为 **adapter**（适配器）注入。测试使用内存适配器。生产环境使用 HTTP/gRPC/队列适配器。

建议形式：*"在接缝处定义一个端口，为生产环境实现 HTTP 适配器，为测试实现内存适配器，这样逻辑就驻留在一个深模块中，即使它跨网络部署。"*

#### 4. 真正的外部依赖（Mock）

你无法控制的第三方服务（Stripe、Twilio 等）。深化后的模块将外部依赖作为注入端口；测试提供一个 mock 适配器。

### 接缝纪律

- **证明接缝承担的义务，不按适配器计数。** 生产消费者、可靠测试、第三方扩展或安全隔离可以证明单实现接缝的价值；缺少这些依据时再质疑端口。不得仅凭数量删除已发布接口，也不发明第二实现来为抽象辩护。
- **内部接缝 vs 外部接缝。** 一个深模块可以既有内部接缝（对其实现私有，供其自身的测试使用），也有其接口处的外部接缝。不要仅仅因为测试使用了内部接缝就通过接口暴露它们。

### 测试策略：替换，而非叠加

- 删除旧测试前，逐项列出其行为、错误路径、兼容约束和历史回归，并定位新测试的承接证据。仅仅存在新的深模块接口测试，不证明覆盖等价；不能证明时保留旧测试或补齐缺口。删除决定与必要反例记录在本票 Evidence。
- 在深化后模块的接口处编写新测试。**接口就是测试表面**。
- 测试通过接口断言可观察的结果，而非内部状态。
- 测试优先描述可观察行为并经受内部重构；实现变化使某个测试需要调整，是复核其保护义务的信号，不自动证明测试冗余。生命周期、安全和性能约束可能需要内部观测，理由与公共行为证据分别说明。

## SpecDev 应用边界

扫描前先划定范围并遵循 YAGNI。用户指定 module、子系统或痛点时直接采用；否则从足够长的 Git 历史识别反复变化的热点，只有热点不明确时才扩大范围。实现中的局部设计遵守 Ticket/Spec；需要改变公共契约、数据、安全、兼容、范围、迁移或验收时返回拥有该决定的上游工件。

涉及生命周期、失败和重试时读取 下方 `<ref-common-rules-error-handling>` 标签；涉及测试替换或并发资源时读取 下方 `<ref-common-rules-test-reliability>` 标签。简化以减少实际维护义务为目标，不以删除行数、接口数或测试数为配额。

</ref-common-rules-codebase-design>

<ref-specdev-r-retro-skill>

# 开发复盘

先读 下方 `<domain-runtime>` 标签 和 下方 `<activation-and-memory>` 标签。本 Work 不自动修代码、提 Issue 或改永久知识。

## 流程

1. 固定本次会话/活动范围，按来源 ID 定位 change、测试、CI、交接和失败证据，不全读历史。缺失资料列 unknown；范围清楚且证据可定位才开始分析。
2. 未归档且尚未 completed 的当前 change 使用其 retro 目录。completed 或 archived 来源以及独立复盘建立非实现 review change，引用原 locator；不重开来源状态或改写归档。按 下方 `<workflow-state-and-lifecycle>` 标签 初始化/恢复；存在重叠实际 writer 时先由原 owner 停止或真实交接。
3. 调用 下方 `<shared-retrospective-retrospective-contract>` 标签，检查约束是否缺失、已有检查是否失效或未接入；区分环境事实、机械检查和判断规则。每个发现有因果证据或明确假设，建议有 owner、正反验收与路由。
4. 按 下方 `<ref-specdev-r-retro-assets-retro-template>` 标签 创建 specdev/changes/{change}/retro/RETRO-###.md，选择最小未占用 ID。原子保存并重读，运行 SpecDev --stage retro；修订保留来源与被替代结论。
5. 验证通过后回读原 RETRO 并在 README 导航接续；证据不足可完成一份 outcome=insufficient-evidence 的诚实报告，不冒充解决问题。只读复盘不创建 Spec/Ticket 或 implementation Evidence。review-only change 按专用完成门关闭。

## 改进必须能被证伪

逐项判断是规则缺失、规则未接入、规则判断错、测试不能失败或环境事实变化。建议说明真正修改位置、owner、正反验收、恢复影响和新增维护成本；不要对每个问题都增加一条提示词。记录已观察因果、尚未验证解释和不采纳理由，复盘报告不等于修复完成。

## 结果与路由

合法 outcome：findings、no-findings、insufficient-evidence。发现的 disposition 为 file-issue / lesson-only / discard / duplicate；每项记录理由，允许没有发现。

代码问题交 “Bug 诊断阶段”，计划改进交 “拆分 Tickets 阶段”，远程反馈交 “请求分诊阶段”；永久知识交 “归档与沉淀阶段”。返回完整报告、已验证与未验证项、下一入口；不自动推进这些后续副作用。

</ref-specdev-r-retro-skill>

<shared-writing-for-agents-references-current-facts-docs>

# 当前工程事实文档

跨领域局部方法，由实际调用方拥有范围、授权与原 Evidence/报告。只在建立或修改当前工程文档时读取；A/I/init/docs-sync 复用同一方法，不触发全局整理或增加常驻状态。

## 六步

1. 确定待回答的问题、主题 owner、唯一负责正文、目标路径和获批写集。已有负责文档时导航并补 Agent 必要边界，不建立镜像；生成文件先定位真实源。
2. 固定事实依据：Git HEAD 加本次纳入的 staged/unstaged/untracked 内容，明确未提交限制；非 Git 记录实际范围、时间和复现限制。不擅自 stash、提交、清理；风险较大才保存相应摘要/原件，不为每篇文档加版本元数据。
3. 读取负责源码、直接调用方、既有 docs 与必要验证，区分当前行为、目标、长期取舍和历史事件。文件覆盖不等于语义理解，静态理解不等于运行验证；不能从“代码用了 A”编造“团队为 B 放弃 C”，未知历史标待访谈/推断。
4. 修正唯一负责正文，保留范围、依据、失败/恢复、兼容与未知。源码说明当前实现，ADR 说明取舍，context 说明领域含义；只导航相互关系，不复制第二份权威。当前参考原地维护，真实退役/事故/旧数据说明有独立价值才保存历史快照。
5. 按变化验证事实、链接、例子、类型或行为；生成物重建并验证幂等。明确实际层级：源码核对、静态检查、隔离测试、真实运行/浏览器。没有执行不能写通过，未覆盖平台/状态保留具体限制。
6. 回读正文与入站引用，在调用方原 Evidence/报告中交付变化、命令/退出码、事实核对、未验证项与下一 owner。输入漂移只重验受影响项；未知结果不伪装成功。

本方法不做全局盘点、Git 暂存/commit、同步游标、语言镜像调度、永久知识发布或定时审计；这些继续归原 owning 入口。I/A 不创建 docs-sync state/sidecar，也不推进其 commit 基线。正式知识候选交 ADR/context/DESIGN/research 原网关，不能借 docs 修正越权。

## 明确请求全面基线时

只有用户要求“建立工程文档基线/全面理解当前代码”才扩大覆盖。docs/ 是目标项目面向 Agent 的工程事实，不是方法手册、任务池或项目 docs 镜像；主题 owner 仍按项目确定，不注册为某一 workflow 的永久知识 store。

最小可为 README 与 architecture；已有项目文档负责的主题只导航。无内容不建立 operations/subsystems/archive/AGENTS 空骨架，不引入 policy.json、中央目录注册或新 roots.docs。

在 docs README 或本次已有报告记录每项“已核对/未核对/不适用”及真实依据：

| 覆盖主题 | 核对内容 |
|---|---|
| 项目边界与入口 | 用户/API/CLI 入口、真实系统边界 |
| 模块职责与依赖 | 源目录、直接调用方、装配与构建依赖 |
| 数据与持久化 | 存储、schema、owner、兼容与迁移 |
| 关键运行路径 | 输入/处理/输出及失败路径 |
| 错误与恢复 | 重试、取消、并发、中断的真实保证 |
| 构建/验证/交付 | package/CI、实际命令和退出码、未验证环境 |
| 既有知识与 docs | 负责文档、ADR/context 与冲突/出处 |
| 排除与未知 | vendor/cache/generated/history/敏感材料的边界、理由及后续入口 |

基线说明不新增 baseline 状态枚举。后续源码入口、接口、持久化、默认行为、错误/恢复变化时局部维护相应正文；格式修正不重建全库。

</shared-writing-for-agents-references-current-facts-docs>

<ref-common-rules-agent-experience>

# 面向 Agent 的工具与 Work 体验

修改工具名称、描述、参数、返回、prompt、Work、Skill 或上下文加载时读取。Work 的具名入口 Markdown 就是本工作流的技能入口；保留原 ID 与文件名，不另建技能注册根，也不要求每个 Work 启动任务执行者。

普通代码修改不自动触发全库提示词审查。

## 发现、加载与执行分开

description 写真实触发时机、任务范围和相近但不适用的场景，不写“资深专家”式角色自述。先展示用途、可用动作和必要限制，再按模式加载正文或 reference。延后资源必须有可理解的描述、可靠定位和读取条件；不能为减少首轮内容把必要信息藏到不可发现的位置。

已加载同版本正文的同一次任务不重复读取；输入范围、摘要或 owner 变化时重读受影响内容。首次选中只看到摘要时必须读正文，不能从名称推导步骤。实际执行记录继续遵守 下方 `<ref-common-rules-skill-invocation>` 标签；读过入口不是执行完成。

## 工具描述与结果

参数的范围、默认值、配对和使用条件写在参数定义中。工具说明描述行为与返回，避免复制其他工具或系统段已经拥有的规则。权限、破坏性副作用、不可重复操作和必需验证必须在动作之前可见；描述不是底层权限检查的替代。

返回有界的结果摘要以及可回读的 ID、路径或游标，明确截断、遗漏、分页和证据完整性。包含少量当前动作确实需要的邻近上下文，不整页倒出日志，也不因过度裁剪迫使下一步反复搜索。缺少资源、格式无效和加载失败要能辨认，不伪造可用性。

要能区分无结果、读取失败、权限不足和不完整视图。分页未完整不能报告穷尽；有结果句柄不意味着结果已读。

## 作为行为验证

检查模型真正收到的工具 schema、prompt、结果和诊断，覆盖正常、失败、取消、权限不足、重复调用和恢复中的适用分支。用户直接调用已注入的 Work 不应再次重复加载同一正文。仅宿主支持时才依赖自动/显式调用元数据；文字字段本身不是安全控制。

增加空结果、截断后继续读取等真实行为场景。相同请求反复工具调用、换问法但没有进展时，记录已尝试方法与新增证据；使用原 I/P 的停止和恢复规则，不新建无限自动循环。失败后的副作用与安全动作按 下方 `<ref-common-rules-error-handling>` 标签。

比较优化前后实际首轮输入、总读取、重复调用、误触发和任务结果。在没有同模型、同工具、同任务的实际使用记录时，只报告文件字符或字节变化，不能宣称 token、费用或配额节省。已有正反任务观察与结构检查分别报告。

方法参考：<Url>https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/.agents/skills/agent-experience/SKILL.md</Url>。SpecDev 不因此获得 DSH 的运行时 Skill 加载器。

</ref-common-rules-agent-experience>

<ref-common-skills-dev-worktree-skill>

# Dev Worktree

本 Skill 由 T-tickets、P-goal-plan 和 I-implement 复用。仅在 Goal Plan 选择 `required` 时使用完整 source → candidate → parent 状态机；`current` Ticket 不调用本 Skill。

## 输入

- `operation=create | restore | finalize | remove`；
- `purpose=ticket`；
- repository、父分支、`base_sha`、branch、portable workspace locator；
- workspace、implementation 和 integration owner；
- 允许动作、路径合同、验证合同、调用方状态记录位置。

required Ticket 还必须提供 Ready Ticket、Goal Plan（若存在）、Evidence 路径、implementation commit 与本地 candidate integration/父分支更新授权。缺失时返回 blocked；current Ticket 应按 I-implement 的 direct-parent 规则执行。

## 1. 创建或恢复

`operation=create` 时加载 下方 `<ref-common-skills-dev-worktree-references-create>` 标签。Ticket 使用 `specdev-worktree/<ticket-id>`；同一 Ticket 只存在一个来源 worktree。`operation=restore` 时重读实际 Git worktree/branch/tip/dirty 状态并与调用方记录核对，漂移时停止。

**完成标准**：来源基线、branch、locator、owners 和实际 Git 状态一致；现有用户改动未被覆盖。

## 2. 来源实现门

implementation owner 只在来源 worktree 修改授权项目路径，运行 Ticket 要求的单元、组件、静态、类型、lint/build 等非 E2E 检查。进入 `review` 前，worktree 必须 clean，branch tip 必须是已授权的 `source_checkpoint` commit，实际 diff 必须符合路径合同。

**完成标准**：source checkpoint 不可变且可达；来源 worktree 没有 E2E pass 声明。

## 3. 候选合并与父分支推进

`operation=finalize` 仅由 Lead/integration owner 调用，并加载 下方 `<ref-common-skills-dev-worktree-references-finalize>` 标签。Lead 在独立 parent-candidate checkout 组合最新父分支与 source checkpoint，运行集成检查和适用 E2E，通过后才推进父分支。

本地 candidate checkout/branch 的创建、重建和回收属于已授权 local candidate integration；来源 branch/worktree 的删除仍需要独立 cleanup 授权。push、PR、remote merge、deploy、migration 和生产动作不从本 Skill 继承。

**完成标准**：Ticket `integrated` 时父 HEAD 精确等于记录的 result SHA，并包含 source checkpoint；失败或 stale 时父分支未变化。后续 `removed` 只表示来源 branch/worktree 已清理，不撤销该集成事实。

## 4. 移除

`operation=remove` 先验证 Ticket 已 `integrated`、目标 worktree clean、checkpoint 可恢复且删除目标精确。只有明确 cleanup 授权时删除来源 branch/worktree；强制删除需要单独确认。删除后重读 `git worktree list` 与 refs，并只把调用方生命周期状态更新为 `removed`；`base_sha`、source checkpoint、candidate/result、验证、E2E 与 Evidence 字段必须原样保留。

**完成标准**：只删除精确授权目标；失败保留现场与恢复命令。

## 固定规则

- Agent Team 不决定 worktree；Ticket 切片本身决定来源 worktree；
- Ticket E2E 只在 Lead-owned parent-candidate checkout 运行；
- 每个 Done Ticket 必须有 source commit 与父分支 result，worktree 状态为 `integrated` 或其清理后终态 `removed`；
- candidate 失败保留来源 worktree 修正，父分支不动；
- 成功集成不自动清理来源 branch/worktree。

</ref-common-skills-dev-worktree-skill>

<shared-retrospective-retrospective-contract>

# Retrospective

## 输入

- 当前会话、开发活动及调用方明确关联的 change/commands/workflows。
- `commands/<command>/*.md` 报告、active change 状态、archive 和 `INDEX.md` 声明的知识 store。
- 可选已有 issues，用于语义去重。

## 流程

1. 按本次 scope 和来源 ID 定位相关证据，再读取 friction-taxonomy.md（下方 `<local-references-retrospective-references-friction-taxonomy>` 标签）；穷尽当前范围内的已定位摩擦，不全量读取 archive/知识库。完成标准：每项都有来源路径或对话节点。
2. 按 bug、friction、missing-capability、doc-gap、ergonomics 归类，合并同一根因。完成标准：每项只属于一个根因簇，合并关系可追溯。
3. 按下方修复方向分类，再评估影响与频率，过滤一次性噪声；低信号项标为丢弃或仅记教训。完成标准：每项都有优先级和处置理由。
4. 读取 issue-drafting-sop.md（下方 `<local-references-retrospective-references-issue-drafting-sop>` 标签），生成 issue-ready 提案并与已有 issue 去重。完成标准：标题、证据、问题、建议、验收、影响资产和去重结论齐全。

## 输出

- 按优先级排序的 `file-issue | lesson-only | discard | duplicate | insufficient-evidence | no-findings` 结果，不强行制造 Issue。
- 合并/丢弃说明和调用方执行 `gh` 所需字段。

本 skill 不写文件、不调用外部 API；调用方 command/Work 负责持久化、授权和后续路由。

## 修复方向：先减少未来重复指令

每个根因簇保留原 issue type，同时选择一个 remediation_axis；这不是新的远程标签或状态机。

| remediation_axis | 首选提案与验收 |
|---|---|
| code-defect | 最小复现/回归测试与局部修复，证明目标症状红→绿 |
| deterministic-check-gap | lint、validator、pre-commit 或 CI 中可判定断言，至少一个通过与一个拒绝样本 |
| context-pointer | 修正触发、owner、失效路径或条件引用；验证应触发与近邻不触发 |
| judgment-rule | 仅保留不能由机械检查替代的真实判断、权衡与边界，注明反例 |
| environment-discovery | 修复命令/工具/配置的可发现性或环境反馈，避免文档缓存简单可查询事实 |

检查缺口优先提到测试/工具，不再把同一禁令复制到多个 Work。没有因果证据时标为假设并给验证方法；删除指令的提案必须附运行对照方案，不把“模型应该会”当作删除证据。

只提出建议，不直接改 AGENTS/全局提示词、永久知识或项目代码，不创建远程 Issue；调用方的报告、确认与目标仓库边界保持。

</shared-retrospective-retrospective-contract>

<ref-specdev-r-retro-assets-retro-template>

## 产物 YAML 头部

生成该工件时，将以下字段写在文档开头的 YAML frontmatter 中：

```yaml
schema_version: 1
artifact: retrospective
change: <YYYY-MM-DD-topic>
id: RETRO-001
status: completed
outcome: findings
sources: []
updated_at: <ISO-8601>
```

# 开发复盘

## Scope
本次活动、会话、change 与来源 locator。扩大范围必须有来源。

## Evidence
原始现象、证据与未知项；已归档来源只引用不修改。

## Findings
逐项：ID、根因/假设、影响和频率、已有约束是否失效/未接入、remediation_axis、owner、disposition、合并/重复关系。没有发现明确写 none；不能强造 Issue。

## Acceptance
每项建议的正反样例、验证命令/方法与完成条件；区分机械检查和人的判断。

## Routes
下一入口、所需授权、未完成项及恢复条件；无后续动作注明原因。

## 预防措施的验证

对每个建议指出缺规则/未接入/判断错误/测试失效/环境变化，给出实际 owner、修改位置、正向验收、目标反例和新增成本。未实施建议不写成修复；无发现和证据不足仍按原 outcome 报告。

</ref-specdev-r-retro-assets-retro-template>

<ref-common-skills-dev-worktree-references-create>

# Create Or Restore Worktree

## Ticket 前置条件

- Ticket Ready，项目根是有效 Git repository，父分支和 `base_sha` 可解析；
- implementation commit 与 local candidate integration/父分支更新已授权；
- workspace、implementation、integration owner 唯一；integration owner 必须为 Lead；
- `specdev-worktree/` 已由 Speculo init 加入项目 `.gitignore`；
- 目标 branch/worktree 不覆盖现有用户 workspace，路径合同无冲突。

## 创建 Ticket 来源 worktree

1. 重读父分支 HEAD、工作树、现有 worktrees 与 refs；父 HEAD 与计划基线不一致时由 Lead决定更新 `base_sha` 或阻塞；
2. 固定 branch `speculo/<change>/<ticket-id>` 与 locator `specdev-worktree/<ticket-id>`；
3. 确认目标 branch/path 不存在，或其实际记录精确匹配当前 Ticket；
4. 从 `base_sha` 创建 Git worktree，不复用其他 Ticket 目录；
5. 在来源 worktree 读取项目 Agent 指令、依赖、构建与路径合同；
6. 安装实际需要的依赖，运行最小非 E2E 基线；
7. Lead 将实际 workspace、owner、checkpoint 和 `status: active` 记录在该票 Evidence 的 `## Workspace Execution Record` 唯一 JSON object 中，保留原执行字段；不创建全局 worktree 镜像。

初始记录：

```json
{
  "ticket_id": "T-01",
  "owner": "lead",
  "implementation_owner": "lead-or-dynamic-agent",
  "integration_owner": "lead",
  "provider": "git",
  "base_sha": "<immutable-sha>",
  "parent_branch": "<parent-branch>",
  "branch": "speculo/<change>/T-01",
  "workspace_ref": "specdev-worktree/T-01",
  "source_checkpoint": null,
  "integration": {
    "status": "pending",
    "parent_before_sha": null,
    "source_sha": null,
    "candidate_sha": null,
    "candidate_branch": null,
    "candidate_workspace_ref": null,
    "result_sha": null,
    "method": null,
    "conflict_paths": [],
    "verification": "pending",
    "e2e": {"required": false, "status": "not-required", "evidence": null},
    "evidence": "specdev/changes/<change>/evidence/T-01.md",
    "attempts": 0
  },
  "status": "active",
  "updated_at": "<ISO-8601>"
}
```

`e2e.required` 与 Ticket/Goal Plan disposition 一致；required 时初始 status 为 `pending`。

## 恢复

恢复时核对 repository、branch、locator、`base_sha`、实际 HEAD、dirty 状态和 owner。状态记录与 Git 不一致、branch 被其他 worktree 占用或出现越界修改时停止；Lead 写 blocker，不重建覆盖。

进入 `review` 前必须由 implementation owner 创建最终 commit；Lead 重读 branch tip、diff 与 `git status`，把精确 SHA 写入 `source_checkpoint`。

**完成标准**：来源 worktree 可定位且唯一；基线、记录与 Git 一致；source 检查不含 E2E；失败时保留现场。

</ref-common-skills-dev-worktree-references-create>

<ref-common-skills-dev-worktree-references-finalize>

# Candidate Merge And Parent Integration

仅由 Lead/integration owner 对状态为 `review` 的 Ticket 调用。

## 1. 接收 source checkpoint

1. 核对 Ticket、Goal Plan、Evidence 目标、owner 与本地 integration 授权；
2. 验证来源 worktree clean，branch tip 精确等于 `source_checkpoint`，commit 从 `base_sha` 可达；
3. 审计实际 diff 未越过 writable/shared owner 合同；
4. 确认 source-worktree 必跑非 E2E 检查已执行，且没有把 E2E 自报为通过；
5. 重读父分支 checkout clean、HEAD 与 remote/本地约定，记录 `parent_before_sha`。

建立新 candidate 前先比较 Ticket `attempts` 与有效 Plan 的 `integration_attempt_limit`。若前一轮尚未通过且当前 attempts 已达到上限，不创建或重建 candidate、不增加 attempts；保留 source workspace、旧 candidate 与失败记录，将 Ticket/worktree 标为 `blocked`，向有效 Lead 返回 `integration-attempt-limit`。

其他预检失败时保持 `review`/`blocked`，不开始候选合并。

## 2. 建立 parent-candidate checkout

1. 使用 branch `speculo/integration/<change>/<ticket-id>` 和 locator `specdev-worktree/.integration/<ticket-id>`，从最新 `parent_before_sha` 建立 Lead-owned integration worktree；
2. 如果父 SHA 是 source checkpoint 的祖先，在 candidate checkout 执行 `git merge --ff-only <source_checkpoint>`，`method=fast-forward`；
3. 否则执行 `git merge --no-ff --no-commit <source_checkpoint>`；
4. 冲突按 下方 `<ref-specdev-i-implement-references-merge-conflict-protocol>` 标签 处理。需要新产品决定时执行 `git merge --abort`，记录 blocker 并返回来源 worktree；
5. 对分叉结果创建一次 Lead-owned candidate merge commit，`method=merge-commit`；
6. 记录 candidate branch/locator、`candidate_sha`、`source_sha`、冲突路径与 attempts，worktree 状态改为 `integrating`、integration 状态改为 `candidate`。

重试前从最新父分支重建 candidate branch/worktree；旧 candidate SHA 保存在 Evidence。候选生命周期的重建/回收包含在 local candidate integration 授权中。

## 3. 在候选父状态验证

在 candidate checkout 运行：

- Ticket 受影响集成与回归；
- 项目要求的 typecheck/lint/build 或其他父状态检查；
- 仅当 Ticket/Goal Plan `e2e.required=true` 时运行对应 E2E。

每条命令记录运行环境 `parent-candidate`、退出码与摘要。E2E required 未运行或失败时 integration `verification=failed`、`status=failed`；父分支保持 `parent_before_sha`。当本轮失败使 attempts 达到 Goal Plan 快照的 `integration_attempt_limit` 时，保存本轮失败并返回 Lead 复盘；不得继续机械修正、放宽断言、删除检查或发明行为。上限是 Lead 复盘触发点，不是永久禁止恢复。

## 4. 推进父分支

全部 required 检查通过后：

1. 重读父分支 HEAD；不等于 `parent_before_sha` 时将 candidate 标记 `stale`，不推进父分支并从步骤 2 重建；
2. 在父分支 checkout 执行 `git merge --ff-only <candidate_sha>`；候选 merge commit 本身已以父 SHA 为第一祖先，因此不再创建第二个 merge commit；
3. 重读父 HEAD、tree 与 ancestor 关系，确认 HEAD 精确等于 candidate SHA 且包含 source checkpoint；
4. 写入 `result_sha=candidate_sha`、`verification=passed`、E2E 最终状态和 Evidence；
5. integration/status 改为 `passed`/`integrated`，再由 Lead 标记 Ticket Done。

## 5. 失败、清理与恢复

- candidate 检查失败：父分支不动，Ticket 回 `in_progress` 或 `blocked`，来源 worktree 保留；
- 达到 integration attempt 上限：保留全部 source/candidate checkpoint 与失败记录，等待 Lead 在 Ticket Evidence 写明共同失败模式、最可能原因、下一轮改变和下一 owner/路由；只有形成有实质变化的新 Dispatch Packet 后，Lead 才可将当前 Ticket `attempts` 重置为 `0` 并重新进入 finalize；
- 父 HEAD 漂移：旧 candidate 记 `stale`，完整重建并重跑；
- 成功后可按 candidate integration 授权回收 transient integration worktree/branch；来源 branch/worktree 不自动清理。获得独立 cleanup 授权并清理后，只将生命周期状态改为 `removed`，完整保留已经通过的集成与 E2E 证据；
- push、PR、remote merge、deploy、migration 和生产动作仍需各自授权。

**完成标准**：passed 时父 HEAD=result/candidate SHA 且包含 source commit；failed/stale 时父 HEAD 仍为开始该轮记录的父状态或更新后的外部事实，没有本轮候选污染。

</ref-common-skills-dev-worktree-references-finalize>

<local-references-retrospective-references-friction-taxonomy>

# Friction Taxonomy SOP

复盘 Speculo 使用摩擦时的信号来源、分类法、优先级评分与噪声过滤规范。

## 信号来源清单

按以下顺序采集原始摩擦点，每条记录**证据出处**（文件路径或对话节点），后续起草 issue 时要引用：

1. **当前对话上下文** —— 本次会话激活过的 command / workflow；用户在哪一步卡住、追问、返工；为绕开限制做了哪些手动动作；哪些指令被误解。
2. **命令产物** —— `commands/{command}/*.md`：其中记录的验证失败、未完成和阻塞点是一手摩擦。
3. **change 状态机** —— 按所属 workflow schema 读取 `{workflow}/changes/{change}/.status.json`；SpecDev 使用 current_work、works_run、真实工件和失败记录，不假定存在 phase_history。停滞时间仅为线索，不能推断用户动机或问题根因。
4. **change 产物正文** —— 所属 workflow 的 Spec、Ticket、Evidence、diagnosis.md 等真实工件中显式写下的待澄清、风险和阻塞；不臆造不存在的文件。
5. **沉淀教训** —— 各 workflow 声明的 lessons/knowledge store：已记录但尚未转成改进项的教训，用于去重与佐证频率。
6. **契约落差** —— 实际产物路径、frontmatter、命名是否偏离所属入口的合同及 schema；不同工件命名分别判断，不能强制全部使用日期前缀。

## 摩擦类型分类

先从实际证据检查以下七个环境维度；没有信号的维度记为不适用，不扩大当前会话范围。维度、主类型和 remediation_axis 分别描述发生位置、问题性质和改进方向，不能互相替代。

| 维度 | 检查与建议 |
|---|---|
| 导航 | 隐藏依赖、跨模块跳转和关键文件入口是否可发现；优先修复上下文指针 |
| 自动检查 | 回读关联 scripts、lint、测试与 CI；区分缺少检查、已有检查未接入和检查失效，避免重建同类检查 |
| 编码标准 | 可确定判错的约束进入机械检查；权衡与设计判断留给审查规则 |
| 全局指令 | AGENTS 中反复追加的 steering 能否归入既有工程标准或检查；不直接修改用户全局文件 |
| 工具使用 | 无效调用、重复读取和命令发现成本；保留实际调用证据，建议可测量的改进 |
| 无效指令 | 指令是否未被触发、重复、过时或无法影响行为；删除建议须有正反样例与对照验证 |
| 信息访问 | 开发日志、只读服务、环境反馈是否足够定位问题；建议最小必要访问，不默认扩大凭据或服务权限 |


每个摩擦点归且仅归一个**主类型**：

| 类型 | 含义 | 典型表现 |
|------|------|---------|
| `bug` | 资产行为不符合契约或文档 | 产物写错位置、`.status.json` 缺字段、命令覆盖了用户改动 |
| `friction` | 能用但别扭、步骤冗余、易错 | 反复手动改路径、phase 频繁 `revisited`、确认环节缺失 |
| `missing-capability` | 缺一个本该有的 command/workflow/skill | 用户手动拼凑某个反复出现的流程 |
| `doc-gap` | 文档缺失、过时或与实现不符 | 指引说一套、资产做另一套；找不到用法 |
| `ergonomics` | 命名、触发词、措辞、可发现性 | description 区分度差、关键词命中不到、术语不一致 |

## 优先级评分

优先级 = **影响面 × 发生频率**，落到四档（由调用方映射标签）：

- 影响面：`broad`（影响所有使用者 / 破坏契约）｜`partial`（影响部分流程）｜`cosmetic`（轻微体验）
- 发生频率：`recurring`（多次出现 / 多来源佐证）｜`occasional`｜`one-off`

| 优先级 | 判定 |
|--------|------|
| `critical` | 破坏契约、数据/产物丢失、覆盖用户改动 —— 无论频率 |
| `high` | `broad` 影响且 `recurring`，或显著阻塞主流程 |
| `medium` | `partial` 影响，或 `broad` 但仅 `occasional` |
| `low` | `cosmetic`，或 `one-off` 且有 workaround |

## 噪声过滤规则

不是每个摩擦点都该变成 issue。按以下规则收敛：

- **合并** —— 语义重复的多条合成一条，频率累加（提升优先级佐证）。
- **丢弃** —— 纯属本次会话一次性、不可复现、或已被其他提案覆盖的，标注「丢弃」并写明原因。
- **降级为教训** —— 属于「用法/约定」而非「资产缺陷」的，建议记入 `LESSONS.md` 而非提 issue。
- **可行动性闸门** —— 无法描述出「改哪个 asset、怎么改、怎么验收」的，先标 `needs-design`，不要凭空提模糊 issue。

只把通过闸门、`medium` 及以上、或 `recurring` 的高信号项推进到 issue 起草。

</local-references-retrospective-references-friction-taxonomy>

<local-references-retrospective-references-issue-drafting-sop>

# Issue Drafting SOP

把通过过滤的改进提案规范化成 issue-ready 结构、对照已存在 issue 去重、生成交给调用方 / `gh` 的交接字段。

## 提案字段（issue-ready）

每条提案产出以下结构化字段，调用方据此写报告并据此调 `gh`：

```jsonc
{
  "title":        "string, 见标题规范",
  "type":         "bug | friction | missing-capability | doc-gap | ergonomics",
  "priority":     "critical | high | medium | low",
  "area":         "string|null, 例 commands / workflows / skills / cli / contract",
  "body":         "string, 见正文结构",
  "remediation_axis": "code-defect | deterministic-check-gap | context-pointer | judgment-rule | environment-discovery",
  "regression":   {"positive": "通过样本与可观察结果", "negative": "拒绝/停止样本与不应出现的副作用"},
  "affected":     ["相对路径，例 .agents/speculo/commands/archive-and-consolidate/COMMAND.md"],
  "evidence":     ["证据出处，例当前会话节点或具体工件及段落"],
  "disposition":  "file-issue | lesson-only | discard | duplicate",
  "dup_of":       "number|null, 疑似重复的已存在 issue 编号"
}
```

## 标题规范

- 用祈使句描述「要改成什么」，不是「哪里坏了」：`命名` 区分度差 ❌ → `enhancement: 提升 command description 在系统提示里的区分度` ✅
- 前缀对齐类型：`bug:` / `enhancement:` / `docs:` / `feature:`
- 单行、可独立读懂、不超过约 70 字，含受影响的 asset 名。

## 分类与标签

只返回语义类型、优先级与领域；标签名称、存在性、创建权限和映射由调用方决定，不要求每个仓库都具备某套标签。不确定改进方向时记录设计缺口，不自行增加远程标签。

## 正文结构

每条 issue body 用固定小节，占位符填实，禁止空话：

```markdown
## 问题
[一句话说清痛点 / 不符合预期的行为。]

## 证据
[引用具体出处：对话节点、`...` 产物路径、`.status.json` 字段、文档段落。可附最小复现。]

## 根因
[判断是 asset 设计 / 持久化契约 / 文档 / 工具问题，指明根因而非表象。]

## 建议改动
[改哪个 asset、怎么改。给相对路径与具体方向，不要泛泛而谈。]

## 验收标准
[可验证的完成判据、通过/拒绝样本、回归命令与未验证项。机械问题写确定性检查，不以新增提示词代替测试。]

## 受影响资产
[列出相关相对路径。]
```

## 去重

起草后、交给调用方提交前，对每条做去重判定：

1. 提取标题与根因的关键词。
2. 由调用方用 `gh issue list --repo <owner/repo> --search "<关键词>" --state all --limit 20` 检索；Skill 自身不执行远程检索。
3. 命中语义重复：把 `disposition` 设为 `duplicate` 并在 `dup_of` 记录已存在编号，默认不重复提；仅当用户明确要求才补提。

## 交接契约

本 skill 只返回结构化提案清单与丢弃/合并说明，**不写文件、不调用 `gh`、不创建 issue**。command 或 Work 选择自己的报告路径、标签和授权方式；无发现与证据不足同样是有效分析结果。

</local-references-retrospective-references-issue-drafting-sop>

<ref-specdev-i-implement-references-merge-conflict-protocol>

# Merge / Rebase Conflict Protocol

只在 `git status` 证明仓库正处于 merge/rebase 冲突时加载。

## 流程

1. 读取 Git 状态、操作类型、冲突路径、base/ours/theirs SHA、Ticket/Evidence 与匹配的 candidate integration 记录。
2. 从 commit、source、Spec、Ticket、ADR、测试和调用者追溯双方意图；信息不足时不猜产品行为。
3. 对每个 hunk 写出双方意图、共同约束和唯一可推导结果；需要新行为或上层决定时停止并登记 deviation。
4. 在授权路径内解决文本，运行受影响的非 E2E 检查；candidate checkout 中按 finalize 合同运行父状态检查/E2E。
5. 匹配的 local candidate integration 授权包含 `git add`、candidate merge commit、必要的 `git merge --abort` 和 transient candidate checkout/branch 生命周期；不扩展到来源 branch/worktree cleanup 或远端动作。
6. 需要改变 Spec/ADR、安全/迁移决定、越过 owner 或无法同时保持既有意图时，在 Lead-created candidate 中执行 `git merge --abort`，记录 blocker 并保留来源 worktree；未知普通冲突现场不擅自 abort。
7. 重读 Git 状态、parents 与 diff，确认无 marker、无未声明路径、双方合同及验证仍成立。

## 完成标准

- 每个 hunk 可追溯到既有意图；
- 新产品决定没有藏在冲突解决中；
- 验证记录命令、运行环境、退出码和摘要；
- Git 副作用来自明确的 candidate integration 或其他逐动作授权；
- 完成/暂停可以从 Git、原计划/README 与 Evidence 恢复。

</ref-specdev-i-implement-references-merge-conflict-protocol>
