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
- 提交、推送、合并、部署、发布、归档移动和不可逆迁移仍需用户明确授权。

本 work 以“综合已有上下文”为主，不启动宽泛访谈。它保留原有的代码库探索、领域词汇、ADR 约束、测试接缝设计和用户确认能力，但将确认限制为真正影响外部行为或验证的高价值问题。

Spec 决定“为什么、为谁、系统应表现为何”。它可以锁定影响公共接口、数据、兼容、安全或验收的实现约束，但不写逐文件施工计划。

## 输入

按存在情况读取：

- `specdev/changes/{change}/source-issue.md`
- `specdev/changes/{change}/triage.md`
- `specdev/changes/{change}/diagnosis.md`
- `specdev/changes/{change}/LOG.md`
- `specdev/changes/{change}/CONTEXT.md`
- `specdev/changes/{change}/ADR.md`
- `specdev/context/`
- `specdev/adr/`
- 当前代码、测试、接口、schema、配置和运行事实。

不存在的可选工件静默跳过，不得把缺失内容当作已确认事实。

## 流程

### 1. Grounding 与事实探索

1. 汇总用户目标、受众、问题、限制和已有决定；
2. 只读探索相关代码、测试、配置、schema 和相邻实现；
3. 使用 `specdev/changes/{change}/CONTEXT.md` 与 `specdev/context/` 的术语，不自创冲突名称；
4. 使用 `specdev/changes/{change}/ADR.md` 与 `specdev/adr/` 的已接受决策；
5. 按 下方 `<planning-principles>` 标签 区分可发现事实、高影响偏好和低影响实现细节；
6. 按 下方 `<artifact-contract>` 标签 处理冲突；
7. 外部依赖、标准或版本行为不清楚时使用 下方 `<research>` 标签。

广泛的产品或架构取舍仍未确定时，返回 “设计访谈能力”；不要在 Spec 中用猜测补齐。

### 2. 定义问题、用户和成功

从用户或调用者视角写明：

- 当前问题与影响；
- 目标用户、调用者或运营角色；
- 主要场景和现有痛点；
- 成功状态与可观察结果；
- 明确非目标。

目标不能只写“新增模块”“修改接口”或“完成 Ticket”。

### 3. 定义外部行为与范围

写明：

- 解决方案摘要；
- 正常路径；
- 边界和失败路径；
- 稳定错误行为；
- 状态转换和不变量；
- IN、REUSE、OUT；
- 需要保持的既有行为；
- 公共接口、数据、安全、迁移和运维影响。

局部文件组织、辅助函数和逐行实现不进入 Spec。

### 4. 设计验证接缝

优先复用现有稳定接缝。通常优先顺序是用户端到端行为、公共 API 或 CLI、事件或集成接缝、稳定单元接缝；实际层级由风险和项目先例决定，不机械追求最高层测试。

每个接缝写明：

- 入口位置和类型；
- 触发方式；
- 可观察结果；
- 覆盖哪些验收合同；
- 现有测试先例或命令。

若接缝选择会显著改变可测试性、事故半径或实现范围，向用户做一次聚焦确认；接缝可由代码和已有测试明确推导时，直接采用并记录依据，不为形式提问。

证据规则见 下方 `<evidence-and-verification>` 标签。

### 5. 编写 Spec

使用 下方 `<spec-template>` 标签 写入 `specdev/changes/{change}/spec.md`。

稳定编号：

- `US-###`：用户故事；
- `AC-###`：验收合同；
- `NFR-###`：非功能要求；
- `DEC-###`：已锁定实现约束；
- `OOS-###`：明确超出范围。

不得虚构错误码、性能阈值、schema、迁移政策、法规或合规要求。项目代码证据使用项目根相对路径。

### 6. Readiness Review

加载 下方 `<spec-readiness>` 标签 检查 `specdev/changes/{change}/spec.md`。

任何会改变以下内容的未决问题都会使 `ready_for_tickets: false`：

- 外部行为和范围；
- 公共接口或数据；
- 安全、隐私、资金或数据完整性；
- 兼容、迁移和发布约束；
- 验收合同或验证接缝。

低影响、可逆实现默认值可以作为显式假设，但必须有验证方式。

### 7. 发布与路由

1. 对照 下方 `<spec-schema>` 标签；
2. 运行：

> **结构校验：** 本地项目若已安装 Speculo，使用其 Node 校验器检查当前 change；
> 纯网页环境逐项核对本文内联的 schema、Ready 清单和完成标准，并记录自动校验未运行。

3. 更新 `specdev/status.json` 与 `specdev/changes/{change}/.status.json`；
4. 汇报主要用户故事、验收合同、范围、验证接缝、风险和 Ready 状态；
5. 返回 `specdev/changes/{change}/spec.md`、Ready 状态及下一 Work 的完整路径；
6. 只有用户请求或工作流显式串联时，进入 “拆分 Tickets 阶段”。

## 完成标准

- `specdev/changes/{change}/spec.md` 已按模板写入；
- 问题、目标用户、外部行为、范围和非目标明确；
- 用户故事覆盖主要、边界、错误、角色和状态场景；
- 每个验收合同可观察、可判定并绑定验证接缝；
- 公共接口、数据、兼容、安全和迁移已决定或明确不适用；
- 高影响未决问题与 `ready_for_tickets` 一致；
- 不包含逐文件施工计划；
- Spec、Ready 状态和下一 Work 路径已返回；
- 状态和用户摘要已更新。

## 子文件引用

- Spec 模板：下方 `<spec-template>` 标签
- Ready 检查：下方 `<spec-readiness>` 标签

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

<evidence-and-verification>

# 证据与验证规范

验证回答“怎样证明行为已经正确发生”，Evidence 回答“实际运行了什么、结果是什么、仍有什么风险”。

## 1. 验证矩阵

每一行绑定一个行为、合同或风险：

| 行为或风险 | 验证接缝 | 方法或命令 | 预期结果 | Evidence |
|---|---|---|---|---|
| 正常路径 | 公共接口 | 项目定向测试 | 指定外部行为成立 | `specdev/changes/{change}/evidence/T-NN.md` |
| 无效输入 | schema 或公共接口 | 定向失败测试 | 稳定错误行为成立 | `specdev/changes/{change}/evidence/T-NN.md` |
| 回归 | 现有测试套件 | 项目回归命令 | 相关既有行为保持 | `specdev/changes/{change}/evidence/T-NN.md` |

命令引用项目脚本时，项目文件路径使用项目根相对路径，例如 `package.json` 或 `Makefile`。

## 2. 最小充分验证

选择最接近目标行为的稳定接缝：

1. 公共接口或契约集成测试；
2. 稳定接缝上的单元测试；
3. 类型检查、静态分析、lint 和构建；
4. 可重复手动步骤、截图或查询结果；
5. 代码阅读推断。

E2E 仅在变更影响用户界面交互时加入验证矩阵，并且只由 Lead 在集成阶段执行。Worker 只记录场景、预期结果和待执行状态。API、CLI、后端、库或数据变更默认使用其稳定接缝，不追加 E2E。

低层证据不能替代明确要求的用户行为证据。高风险迁移还需要 dry-run、调用点扫描、数据核对、监控信号或回滚演练。

## 3. 失败分类

每个失败必须分类为：

- 本 Ticket 引入的新失败；
- 基线已存在的失败；
- 环境、权限或基础设施失败；
- 验证本身无效或无法观察目标行为。

不得通过跳过测试、放宽断言、吞错、删除用例或把命令移出验证矩阵来制造绿色。

## 4. Evidence 最低内容

每个完成 Ticket 在 `specdev/changes/{change}/evidence/T-NN.md` 记录：

- 基线、分支或 worktree；
- 实际修改的项目路径；
- 每条命令、退出状态和结果摘要；
- 每条验收合同的证据映射；
- 未运行项与原因；
- 新失败、既有失败和环境失败；
- 偏差及批准；
- 残余风险；
- worktree、提交或 PR 引用；
- 最终结论。

无法运行关键验证、存在未批准偏差或 Evidence 不完整时，Ticket 不得标为 `done`。

</evidence-and-verification>

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
