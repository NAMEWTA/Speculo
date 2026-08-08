# 拆分 Tickets

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

Ticket 是**决策完备的微型执行计划**：它消除执行者在目标、范围、公共契约、关键顺序和验收上的关键决策，但不展开逐行代码、局部变量或可从现有惯例自然推导的实现细节。

本 work 保留原有能力：代码库探索、prefactor 识别、曳光弹垂直切片、真实阻塞边、用户粒度核对、宽重构的 expand-contract 排序、Ticket 独立文件和总体 Tickets Map。

## 输入

优先读取：

- 当前 Spec：`specdev/changes/{change}/spec.md`
- 当前架构决策：`specdev/changes/{change}/ADR.md`
- 当前领域上下文：`specdev/changes/{change}/CONTEXT.md`
- 当前设计日志：`specdev/changes/{change}/LOG.md`
- Bug 诊断：`specdev/changes/{change}/diagnosis.md`
- 永久架构决策：`specdev/adr/`
- 永久领域上下文：`specdev/context/`
- 项目当前代码、测试、配置、schema 和 CI 事实。

若尚无 `specdev/changes/{change}/spec.md`，只有在用户提供的计划或对话已经等价覆盖目标、范围、关键决定和可判定验收时才可继续；否则建议先运行 “编写 Spec 阶段”。

## 流程

### 1. 输入预检

1. 读取所有存在的上游工件；
2. 检查 `specdev/changes/{change}/spec.md` 的 `ready_for_tickets`；
3. 按 下方 `<artifact-contract>` 标签 处理 Spec、ADR、用户决定与代码事实的冲突；
4. 将未知项分类为可发现事实、高影响用户决定和低影响实现细节；
5. 高影响未决问题没有关闭时停止，不通过更详细的 Ticket 文字伪装决策完备。

**完成标准**：拆分依据、权威顺序、合同范围与未决问题已明确。

### 2. 探索代码库与实现地形

如果尚未探索，进行只读探索：

- 找到行为入口、稳定接口、测试接缝、数据流和错误路径；
- 查找相邻或类似实现，优先复用项目现有模式；
- 识别可能修改的模块、公共路径、共享文件、迁移索引和全局注册点；
- 查找现有测试命令、夹具、类型检查、构建和 CI 门禁；
- 对照 `specdev/changes/{change}/CONTEXT.md` 使用项目领域词汇；
- 对照 `specdev/changes/{change}/ADR.md` 与 `specdev/adr/` 避免重新争论已接受决策。

遇到不熟悉的模块、外部依赖或第三方库时，使用 下方 `<research>` 标签，再继续拆分。

#### Prefactor

遵循“让变更变容易，然后做容易的变更”：

- 如果当前接口、依赖或接缝会使后续实现明显不安全或重复，提出前置 prefactor Ticket；
- prefactor 必须说明它解除的具体阻碍；
- prefactor 必须独立有价值且可验证；
- 不为了“更干净”而创建与目标无关的重构 Ticket。

**完成标准**：实现地形、稳定接缝、共享路径与必要 prefactor 已识别。

### 3. 草拟曳光弹式垂直切片

加载 下方 `<decomposition-rules>` 标签。每个切片应横向穿过交付该行为所需的最小层次组合，而不是把数据库、后端、前端和测试拆成互相无价值的水平 Ticket。

每个 Ticket 必须：

- 交付一个可观察行为，或一个能独立解除后续阻塞的安全准备能力；
- 完成后可以独立演示、测试或验证；
- 适合一个全新 Agent 上下文在不中断的情况下完成；
- 与其他 Ticket 有实质行为差异；
- 只依赖真正阻止它开始的前置产物；
- 自带至少一种完成证据。

#### 宽重构例外

字段重命名、共享符号类型变化、协议升级等宽机械变更无法安全塞入单个垂直切片时，按以下顺序：

1. **Expand**：在旧形式旁增加新形式，保持旧调用方可工作；
2. **Migrate batches**：按包、目录、消费者或风险分批迁移，每批独立成 Ticket；
3. **Contract**：确认旧调用点为零后删除旧形式；
4. 若迁移批次无法各自保持绿色，使用隔离集成分支和最终集成验证 Gate，但仍保留明确的批次与责任边界。

**完成标准**：每个 Ticket 的可观察产出、真实阻塞边和验证方式已草拟。

### 4. 判定规划深度与风险

按 下方 `<readiness-and-depth>` 标签 为每个 Ticket 标注：

- `lite`：局部、可逆、沿用既有模式、无公共契约或迁移影响；
- `standard`：大多数多文件或跨层垂直切片；
- `deep`：公共 API/schema、数据迁移、安全/隐私/资金、不可逆操作、expand-contract、共享核心路径、多 Agent 或高事故半径。

规划深度不是优先级，也不是 Gate。每个 Ticket 必须记录触发该深度的原因。

### 5. 写成决策完备 Ticket

使用 下方 `<ticket-template>` 标签 填写：

- 战略目标、可观察产出与来源追踪；
- 当前代码事实和需求差距；
- 已锁定决策、低影响假设和未决问题；
- IN / REUSE / OUT；
- 用户或调用者视角的端到端行为；
- Standard/Deep 的接口、输入输出、不变量、数据流、失败与兼容契约；
- 有序执行路线和安全落点；
- expected、writable、read-only、shared 路径；
- 正常、失败和回归验证矩阵；
- 用户界面交互受影响时的 E2E Gate 与执行 owner；后续委派 Goal Plan 可以显式把该 Gate 转交 Lead；
- Deep 的迁移、兼容窗口、监控、回滚和不可逆批准点；
- 可判定验收标准。

路径所有权必须遵守 下方 `<path-ownership>` 标签，证据设计必须遵守 下方 `<evidence-and-verification>` 标签。

### 6. 构建依赖 DAG、合同覆盖与并发检查

1. 使用 Ticket ID 建立 `blocked_by`；
2. 检测循环和不存在的引用；
3. 识别根 Ticket、汇合点、扇出与收缩点；
4. 为每个 Spec 验收合同映射至少一个 Ticket；
5. 检查并行候选的 `writable_paths` 是否相交；
6. 共享路径必须指定唯一 owner，通常由专门 Ticket 或明确的集成 owner 修改；
7. 不得用依赖边表达“可能更方便”或纯粹的人员交接。

使用 下方 `<tickets-map-template>` 标签 草拟总体 Map。

### 7. Definition of Ready

加载 下方 `<ticket-readiness>` 标签 逐个检查。

存在以下任一情况时 `ready: false`：

- 会改变行为、接口、数据、兼容、安全、范围或验收的未决问题；
- 依赖缺失或 DAG 有环；
- 可写路径不明确或并行所有权冲突；
- 验证方法不能执行且没有批准的替代证据；
- 单个新上下文无法完成；
- Standard/Deep 缺少有序执行路线；
- Deep 缺少迁移、兼容、监控、回滚或批准点。

### 8. 与用户核对

以完整编号列表展示所有 Ticket，至少包含：

- 标题；
- 可观察交付；
- 被阻塞于；
- Planning Depth 与触发原因；
- 风险；
- Ready 状态；
- 关键未决问题；
- 预计并行组和共享路径 owner。

核对：

- 粒度是否适合单一上下文；
- 是否出现水平切片；
- 阻塞边是否真实；
- 是否应合并、进一步拆分或增加 prefactor；
- 合同是否全部覆盖；
- 路径所有权和验证是否可信。

每次修改后重新展示完整列表，直到用户批准。用户明确要求一次性自主规划且不存在高影响未知项时，可使用推荐默认值并把假设写入 Ticket，不为形式重复询问。

### 9. 发布

创建：

- Ticket 目录：`specdev/changes/{change}/ticket/`
- Tickets Map：`specdev/changes/{change}/tickets-map.md`
- Evidence 目录：`specdev/changes/{change}/evidence/`

按拓扑顺序写入 Ticket：

```text
specdev/changes/{change}/ticket/NN-<ticket-name>.md
```

`NN` 使用两位或更多位零填充数字；Ticket frontmatter ID 使用 `T-NN`。Ticket 的 `blocked_by` 使用 Ticket ID，而不是相对文件路径。

使用 下方 `<ticket-template>` 标签 和 下方 `<tickets-map-template>` 标签 生成工件，并对照：

- 下方 `<ticket-schema>` 标签
- 下方 `<tickets-map-schema>` 标签

运行：

```bash
node Speculo Node 校验器 \
  --stage tickets \
  specdev/changes/{change}
```

更新 `specdev/status.json` 与 `specdev/changes/{change}/.status.json`。

## 完成标准

- Ticket 目录和 Map 已写入本文约定的位置；
- Spec 合同全部 covered 或有明确批准的 deferred；
- DAG 无环、阻塞引用存在；
- Ready Ticket 无高影响未知项；
- 并行 Ticket 无未解决的可写冲突；
- 每个 Ticket 可独立验证且适配单一上下文；
- Prefactor 与 expand-contract 使用条件正确；
- 用户已批准拆分或明确授权自主发布；
- 校验器无 error。

## 子文件引用

- 拆分规则：下方 `<decomposition-rules>` 标签
- Ticket 就绪规则：下方 `<ticket-readiness>` 标签
- Ticket 模板：下方 `<ticket-template>` 标签
- Tickets Map 模板：下方 `<tickets-map-template>` 标签

## 下一步

满足任一情况时建议运行 “目标规划阶段”：Ticket 数量达到或超过 10、存在多 Agent 并行、Deep Ticket、迁移、共享契约、多个 Gate 或高风险发布。少量线性 Ready Ticket 可直接进入 “实现阶段”。

---

## 参考内容

以下内容均已内联。主流程提到标签时，直接使用对应标签中的完整规则、模板或 schema。

<decomposition-rules>

# Ticket 拆分规则

本文件由 “拆分 Tickets 阶段” 在草拟切片时加载，并受 下方 `<planning-principles>` 标签 约束。

## 好的垂直切片

- 从稳定入口到可观察结果形成闭环；
- 包含该行为所需的最小 schema、接口、交互与测试组合；
- 完成后仓库处于可验证状态；
- 与其他切片有实质行为差异；
- 可以由一个全新上下文完成；
- 不需要执行者重新决定外部行为或公共契约。

## 拆分信号

出现任一情况应拆分：

- 包含两个可独立发布或验证的用户行为；
- 需要多个不同领域或架构决策；
- 预计超出单一上下文；
- `writable_paths` 过宽且可通过接缝隔离；
- 验证必须等到不相关工作完成；
- 一个部分高风险、另一部分低风险；
- 一个部分改变共享契约，其他部分只是消费者迁移。

## 合并信号

出现任一情况应合并：

- 两个 Ticket 单独完成都没有可观察价值或安全准备价值；
- 只是按技术层水平分割；
- 验收、代码范围和证据高度重叠；
- 依赖边只是人为交接，没有真实前置产物；
- 拆分后每个 Ticket 都需要重复相同关键上下文和同一不可分割验证。

## 特殊模式

### Prefactor

必须说明解除的具体阻碍、后续受益 Ticket 和独立验证。不能只写“清理代码”。

### Expand-contract

先扩展兼容层，再分批迁移，最后收缩。每批应保持绿色；不能保持绿色时必须有隔离集成分支与最终集成 Gate。

### Research spike

未知足以阻止决策时，进入 “寻路阶段”。调查 Ticket 只回答决策问题，不顺手实现产品代码。

### Shared contract

先由单一 owner Ticket 修改共享契约并形成稳定证据，再扇出消费者 Ticket。共享路径规则见 下方 `<path-ownership>` 标签。

### Bug fix

已确认根因时，以 `specdev/changes/{change}/diagnosis.md` 的修复契约为依据；根因未知时先运行 “Bug 诊断阶段”。

</decomposition-rules>

<ticket-readiness>

# Ticket Definition of Ready

本检查由 “拆分 Tickets 阶段” 使用，并细化 下方 `<readiness-and-depth>` 标签。

## 通用门禁

- [ ] frontmatter 字段完整，Ticket ID、文件名和 `specdev/changes/{change}/tickets-map.md` 一致。
- [ ] 可观察产出单一、明确且可验证。
- [ ] 来源和验收合同映射存在。
- [ ] IN、REUSE、OUT 无冲突。
- [ ] 高影响未决问题为零。
- [ ] `blocked_by` 指向存在的 Ticket，DAG 无环。
- [ ] `expected_changes`、`writable_paths`、`read_only_paths` 和 `shared_paths` 中的项目路径都使用项目根相对路径。
- [ ] `writable_paths` 非空，或明确为仅文档、调查或无代码变更。
- [ ] 每个 shared path 在 `shared_path_owners` 中有唯一 owner。
- [ ] 正常、失败和回归至少各有一条验证，或有可信的不适用原因。
- [ ] 仅当用户界面交互受影响时定义 E2E 与当前执行 owner；Ticket 不预设 Lead/Worker，委派 Goal Plan 可以显式改由 Lead 集成。
- [ ] Evidence 位置明确为 `specdev/changes/{change}/evidence/T-NN.md`。
- [ ] 单个全新上下文能够完成；否则已拆分。
- [ ] 所有内部文件与目录引用使用本文约定的逻辑路径。

## Standard 门禁

- [ ] 实现契约包含入口、输入输出、不变量、状态或数据流、失败行为和兼容。
- [ ] 有 3–7 步有序执行路线。
- [ ] 路径所有权足以支持并发判断。
- [ ] 验证矩阵可以证明外部行为，而非只检查内部调用。

## Deep 门禁

- [ ] 迁移顺序、兼容窗口、监控、回滚或前向恢复、收缩条件和批准点完整。
- [ ] 安全、隐私、资金或数据完整性风险有缓解与验证。
- [ ] 跨 Agent 路径所有权和集成 Gate 明确。
- [ ] expand-contract 的收缩条件可通过扫描、指标、查询或测试证明。

## Ready 状态

只有全部适用项通过时才能设置：

```yaml
ready: true
status: ready
```

未通过时保持 `ready: false`，并在未决问题、阻塞原因或偏差记录中写明原因。

</ticket-readiness>

<ticket-template>

## 产物 YAML 头部

生成该工件时，将以下字段写在文档开头的 YAML frontmatter 中：

```yaml
schema_version: 3
artifact: ticket
change: <YYYY-MM-DD-topic>
id: T-01
title: <标题>
status: draft
planning_depth: standard
planning_depth_reason: <触发该深度的事实>
ready: false
risk: medium
blocked_by: []
contract_ids: [AC-001]
owner: unassigned
expected_changes: ["src/example.ts"]
writable_paths: ["src/example/**"]
read_only_paths: []
shared_paths: []
shared_path_owners: []
```

# Ticket T-01: <标题>

- **Ticket 文件：** `specdev/changes/{change}/ticket/01-<ticket-name>.md`
- **总体 Map：** `specdev/changes/{change}/tickets-map.md`
- **上游 Spec：** `specdev/changes/{change}/spec.md`
- **完成 Evidence：** `specdev/changes/{change}/evidence/T-01.md`

## 1. 战略与来源

- **目标：** 做什么、为什么、基于什么现有能力。
- **可观察产出：** 完成后用户、调用者或系统外部可以观察到什么。
- **来源：** `US-###`、`AC-###`、`ADR-###`、`USER-DECISION`、`CODE`、`RESEARCH` 或 `DIAG-###`。
- **当前事实：** 相关现状与目标差距；项目文件使用项目根相对路径，例如 `src/example.ts`。
- **Planning Depth 原因：** 说明为什么是 Lite、Standard 或 Deep。

## 2. 决策状态

### 已锁定决策

- ...

### 已采用的低影响假设

- 无。

### 未决问题

无。

存在会改变行为、接口、数据、兼容、安全、范围、迁移或验收的问题时，frontmatter 中 `ready` 必须为 `false`。

## 3. 范围边界

| IN（本 Ticket 构建） | REUSE（复用且不改变契约） | OUT（明确不做） |
|---|---|---|
| ... | ... | ... |

## 4. 要构建什么

从用户或调用者视角描述一条完整行为路径：入口、动作、可观察结果、失败行为和边界。不要按数据库、后端、前端、测试等技术层分段罗列。

## 5. 实现契约

<!-- Lite 可压缩为适用条目；Standard 和 Deep 必填。 -->

- **入口或接缝：**
- **输入与输出：**
- **公共接口变化：** 无 / ...
- **不变量：**
- **状态或数据流：**
- **错误与失败行为：**
- **兼容要求：**
- **安全与隐私要求：** 不适用：原因 / ...

## 6. 执行路线

<!-- Lite 通常 1–3 步；Standard 和 Deep 通常 3–7 步。描述行为顺序、安全落点和验证时机，不写逐行代码。 -->

1. 建立或确认验证接缝，使目标行为或关键风险按预期失败。
2. ...
3. 形成保持仓库可验证的安全落点。
4. 运行定向验证和适用回归。

## 7. 路径访问契约

- **预计修改点：** 与 `expected_changes` 对齐，仅作导航。
- **可写范围：** 与 `writable_paths` 对齐；越界前必须停止。
- **只读上下文：** 与 `read_only_paths` 对齐。
- **共享路径：** 与 `shared_paths` 对齐；每项在 `shared_path_owners` 指定唯一 owner。
- **保留或不动：** 无 / ...

项目路径必须写成项目根相对路径。SpecDev 工件必须使用本文约定的逻辑路径。

## 8. 验证矩阵

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 正常路径 | ... | ... | ... | `specdev/changes/{change}/evidence/T-01.md` |
| 失败路径 | ... | ... | ... | `specdev/changes/{change}/evidence/T-01.md` |
| 回归 | ... | ... | ... | `specdev/changes/{change}/evidence/T-01.md` |

不适用的关键风险类别必须写“不适用：原因”。

仅当用户界面交互受影响时增加 E2E 行并指定当前执行 owner。若后续 Goal Plan 含委派附录，再由该计划显式转交 Lead；Ticket 不预设 Lead/Worker 角色。

## 9. 发布、迁移与恢复

<!-- Deep 必填；其他深度仅在适用时保留。 -->

- **迁移顺序：** 不适用：原因 / ...
- **兼容窗口：** 不适用：原因 / ...
- **监控信号：** 不适用：原因 / ...
- **回滚或前向恢复：**
- **不可逆操作与批准点：** 无 / ...
- **收缩条件：** 不适用：原因 / 旧调用点、旧数据或旧协议使用量为零并有 Evidence。

## 10. 验收标准

- [ ] `AC-001`：<可判定结果>。
- [ ] 验证矩阵全部执行并记录到 `specdev/changes/{change}/evidence/T-01.md`。
- [ ] 实际项目修改未超出 `writable_paths`，shared path 由指定 owner 修改。
- [ ] 未发生未批准的范围、契约或发布偏差。
- [ ] Ticket、Tickets Map 和 Evidence 状态一致。

</ticket-template>

<tickets-map-template>

## 产物 YAML 头部

生成该工件时，将以下字段写在文档开头的 YAML frontmatter 中：

```yaml
schema_version: 3
artifact: tickets-map
change: <YYYY-MM-DD-topic>
status: draft
```

# Tickets Map: <工作名称>

- **Map：** `specdev/changes/{change}/tickets-map.md`
- **Spec：** `specdev/changes/{change}/spec.md`
- **Ticket 目录：** `specdev/changes/{change}/ticket/`
- **Evidence 目录：** `specdev/changes/{change}/evidence/`
- **可选 Goal Plan：** `specdev/changes/{change}/goal-plan.md`

## 1. 目标与拆分策略

引用主要用户故事、验收合同和架构决策，说明所有 Ticket 共同交付的目标、切片原则、prefactor 和 expand-contract 选择。不要复制整个 Spec。

## 2. 执行清单

| ID | Ticket | 可观察产出 | Blocked By | Depth | Risk | Ready | Owner | Contract IDs | Wave/Gate | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| T-01 | `specdev/changes/{change}/ticket/01-<ticket-name>.md` | ... | — | standard | medium | yes | unassigned | AC-001 | — | ready |

Ticket frontmatter 是状态、依赖、深度和路径访问契约的权威；本表是同步投影，不得独立修改出另一套真相。

## 3. 依赖 DAG

```text
T-01 [READY]
  ├─→ T-02
  └─→ T-03
        └─→ T-04
```

每条边必须表示真实开始条件。标记关键汇合点、prefactor、expand、migrate、observe、contract 和集成验证点。

## 4. 合同覆盖矩阵

| Contract ID | 覆盖 Ticket | 验证接缝 | 状态 | 说明 |
|---|---|---|---|---|
| AC-001 | T-01 | ... | covered | ... |

`uncovered` 必须修复；`deferred` 必须有用户批准、原因和后续归属。

## 5. 并行与路径所有权

- 最大并发来自 `specdev/config.json`。
- shared owner 为专用 Ticket 或明确的集成 owner；只有委派 Goal Plan 才使用 Lead 角色。
- 项目路径契约以 Ticket frontmatter 为准。
- 并行写代码的 Ticket 使用独立 worktree；只读调查不需要。

| Ticket A | Ticket B | Writable 交集 | 真实依赖 | 处理 |
|---|---|---|---|---|
| T-02 | T-03 | 无 | 否 | 可并行 |

## 6. Gate、Wave 与集成点

T-tickets 可以标注候选 Wave 和行为里程碑。需要正式跨 Ticket 编排时，由 “目标规划阶段” 完成 Gate、Wave、owner、发布与恢复，并把结果投影回本 Map。

## 7. 横切契约与风险

只记录跨多个 Ticket 的数据、安全、兼容、共享接口、迁移、发布和恢复规则。单 Ticket 规则留在具体 `specdev/changes/{change}/ticket/NN-<ticket-name>.md`。

## 8. 同步规则

- Ticket 状态变化后同步执行清单；
- Ticket ID、路径、依赖或 frontmatter 不一致时，以 Ticket 文件为权威并修复本 Map；
- Goal Plan 存在时，Wave、Gate 和 owner 以 `specdev/changes/{change}/goal-plan.md` 为编排权威；
- 依赖、合同覆盖或路径所有权变化后运行 Speculo Node 校验器；
- 内部工件使用本文约定的逻辑路径，不用 Markdown 链接充当状态引用。

</tickets-map-template>

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
| 分诊 | `specdev/changes/{change}/triage.md` | 请求类别、影响、风险、缺失输入、下一 work 和远程 reconcile 状态 | 详细实现方案或开发进度 |
| 诊断 | `specdev/changes/{change}/diagnosis.md` | 复现、证据、根因、修复不变量和回归契约 | 未经验证的修复实现 |
| 设计日志 | `specdev/changes/{change}/LOG.md` | 讨论轨迹、确认、延后、替代与废弃结论 | 当前架构权威摘要 |
| 设计树 | `specdev/changes/{change}/design-tree.json` | 决策节点、依赖、当前 frontier、轮次与共识状态 | 领域真相或架构决定正文 |
| Change 领域上下文 | `specdev/changes/{change}/CONTEXT.md` | 本 change 已确认、供下游使用的领域术语和语义 | 永久领域知识或临时会议记录 |
| Change 架构决策 | `specdev/changes/{change}/ADR.md` | 已成为本 change 下游合同的架构决策、原因、后果和替代关系 | 永久项目 ADR 或尚未决定的方案集合 |
| Spec | `specdev/changes/{change}/spec.md` | 用户问题、外部行为、范围、验收合同、非功能要求和已锁定实现约束 | 文件级施工步骤 |
| Ticket | `specdev/changes/{change}/ticket/NN-<ticket-name>.md` | 单一垂直切片的行为、决策、范围、路径所有权、执行路线和验证证据 | 跨 Ticket 里程碑治理 |
| Tickets Map | `specdev/changes/{change}/tickets-map.md` | 依赖 DAG、合同覆盖、Ready 投影、并行候选和路径冲突 | 单 Ticket 的完整实现契约 |
| Goal Plan | `specdev/changes/{change}/goal-plan.md` | 跨 Ticket 调度、Gate、共享所有权、迁移顺序、集成和偏差治理 | 复制 Ticket 全文 |
| Evidence | `specdev/changes/{change}/evidence/T-NN.md` | 实际修改、命令、结果、验收映射、偏差、风险和提交引用 | 新的产品或架构决策 |
| 代码审查 | `specdev/changes/{change}/reviews/CR-###.md` | 固定点、标准轴和规范轴 finding | 实施修复或合并两轴排名 |
| 原型记录 | `specdev/changes/{change}/prototypes/{prototype-id}/record.md` | 一个问题、分支、资产、答案、promotion 和清理 | 生产实现或多个问题的计划 |
| Stakeholder 问卷 | `specdev/changes/{change}/questionnaires/{slug}.md` | 第三方原始回答和恢复条件 | 未经转录确认的产品/架构决定 |
| Wayfinder 地图 | `specdev/changes/{change}/wayfinder-map.md` | 目的地、说明、已关闭决策索引、战争迷雾和范围之外 | 开放 Ticket 正文或答案详情 |
| Wayfinder Ticket | `specdev/changes/{change}/investigation/{investigation-id}.md` | 一个可精确陈述的问题、类型、阻塞和关闭状态 | 解决方案评论或交付目标 |
| Wayfinder solution comment | `specdev/changes/{change}/investigation/comments/{investigation-id}/NN-solution.md` | Ticket 的答案、结果事实和资产指针 | 地图索引或产品实现 |
| 架构审查 | `specdev/changes/{change}/architecture-review.md` 与 `specdev/changes/{change}/architecture-review.html` | 深化候选、证据、可视化、选择和访谈状态 | 未经用户选择的执行契约 |

Change CONTEXT/ADR 是 active change 内的执行权威，不是 workflow 级永久知识。G 和其他设计/执行 Works 只读 `specdev/context/` 与 `specdev/adr/`；只有 A 在 change 完成、实现证据验证、毕业评估和用户确认后才能写入永久 namespace。未毕业内容随归档 change 保留，不能从 change 工件消失。

## 2. 权威顺序

同一事项冲突时按下列顺序裁决：

1. 用户最新明确决定；
2. 当前 change 已接受的架构决策：`specdev/changes/{change}/ADR.md`；
3. 永久 ADR 与领域上下文：`specdev/adr/`、`specdev/context/`；
4. 当前外部行为权威：`specdev/changes/{change}/spec.md`；
5. 当前 Ticket 契约：`specdev/changes/{change}/ticket/NN-<ticket-name>.md`；
6. 当前跨 Ticket 编排：`specdev/changes/{change}/goal-plan.md`；
7. 当前代码与运行事实；
8. 旧计划、旧日志和未经确认的推断。

当前 change 决定与永久知识冲突时，必须在 LOG/ADR 中显式说明替代关系；它只约束当前 change，直到 A 决定是否提升并更新永久版本。

`specdev/changes/{change}/source.md` 只对“原始输入是什么”具有权威；后续用户决定、ADR 和 Spec 可以显式演进该意图。远程来源在摄入后发生变化不会自动改写本地合同，必须重新 Triage。

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

详细检查位于 下方 `<ticket-readiness>` 标签。

## 3. Spec Readiness

`specdev/changes/{change}/spec.md` 只有在外部行为、范围、公共接口、数据、安全、兼容、迁移和验收合同不存在高影响未知项时，才可设置 `ready_for_tickets: true`。

## 4. 假设规则

- 低影响、可逆的默认值可以作为显式假设继续；
- 高影响假设不得用于强行通过 Ready；
- 实现者发现假设不成立时，按 下方 `<deviation-control>` 标签 处理；
- 假设必须有适用范围和验证方式。

</readiness-and-depth>

<path-ownership>

# 路径所有权与并发规则

路径所有权是并行执行的硬边界，不是文件预测清单。

## 1. 四类路径

- `expected_changes`：预计修改的项目路径，仅用于导航；每项写成项目根相对路径。
- `writable_paths`：实现者获准修改的项目路径或 glob，是硬约束。
- `read_only_paths`：建立上下文但不得修改的项目路径。
- `shared_paths`：多个 Ticket 可能需要修改的项目路径，必须指定唯一 owner。

示例：

```yaml
expected_changes: ["src/auth/session.ts"]
writable_paths: ["src/auth/**"]
read_only_paths: ["src/users/**"]
shared_paths: ["package.json"]
```

## 2. 所有权规则

1. 可能并行的 Ticket，其 `writable_paths` 不得相交。
2. glob 与具体路径按覆盖关系判断，不得只比较字符串。
3. 根依赖清单、锁文件、根导出、共享 schema、迁移索引、全局路由和跨 Ticket 合同文件默认视为 shared。
4. shared path 只能由专用 owner Ticket 或 Goal Plan 明确指定的唯一集成 owner 修改；消费者 Ticket 只读。委派 Goal Plan 可以把该 owner 指定为 Lead，但普通计划不预设角色。
5. 需要越界时先停止，按 下方 `<deviation-control>` 标签 提出 ownership change；不得先改后报。
6. 前置 Ticket 改变目录结构后，后续 Ticket 开始前重新解析项目路径；若授权范围语义未改变，可只更新导航路径。
7. 不得把“最后解决合并冲突”当作所有权方案。

## 3. Worktree 与分支

需要并行或临时隔离项目写入时使用独立 worktree；只读调查和顺序执行默认共用当前工作区。Worktree 防止工作区污染，路径所有权防止逻辑冲突，两者不能互相替代。

生命周期由调用方明确的 workspace owner 按 下方 `<dev-worktree>` 标签 管理。普通 Goal Plan 由当前执行或集成 owner 负责；委派 Goal Plan 才把 workspace owner 映射为 Lead。编排规则位于 “目标规划阶段的核心编排规则”。

</path-ownership>

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

E2E 仅在变更影响用户界面交互时加入验证矩阵。普通执行由当前实现或集成 owner 运行；委派执行中 Worker 只记录场景、预期结果和待执行状态，由 Lead 在集成阶段运行。API、CLI、后端、库或数据变更默认使用其稳定接缝，不追加 E2E。

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
- 偏差影响普通并行执行时，当前集成 owner 必须暂停受影响 Wave，重新计算路径所有权、依赖和 Gate；委派执行由 Lead 承担同一责任。

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

<dev-worktree>

# SpecDev Dev Worktree

## 适用范围

- 用于并行写代码且路径所有权不冲突的 Ready Ticket，或明确要求临时隔离的一次性原型。
- 只读调查和顺序执行默认共用当前工作区。
- 调用方必须明确 workspace owner、implementation owner、固定基线、工作项 ID、持久化 owner 和允许的结束动作。
- 普通执行不建立额外角色；委派 Goal Plan 才把 workspace owner/implementation owner 分别映射为 Lead/Worker。
- 平台原生 worktree 优先；不可用时使用 Git worktree。

## 生命周期

1. 创建或恢复时加载 下方 `<dev-worktree-create>` 标签。
2. implementation owner 完成后返回工作项状态、Evidence/record 路径、`workspace_ref`、checkpoint、commit 或 PR 引用和未验证项；Ticket worktree 从 `active` 更新为 `review`。
3. workspace owner 集成或清理时加载 下方 `<dev-worktree-finalize>` 标签；一次性原型只评估和清理，不合入生产分支。

Ticket worktree 状态依次为 `planned → active → review → integrated → removed`；失败进入 `blocked`，记录写入 `specdev/changes/{change}/.status.json` 的 `worktrees`。原型的 branch、`workspace_ref` 和清理结果只写入 `specdev/changes/{change}/prototypes/{prototype-id}/record.md`，不伪造 Ticket worktree 记录。

## 边界

- 每个并行 Ticket 使用独立 worktree、分支和相同 `base_sha`；每个原型使用独立 worktree 和分支。
- Git provider 固定使用 `<project-root>/specdev-worktree/<work-item-id>/`，持久化 `workspace_ref: specdev-worktree/<work-item-id>`；`<project-root>` 由 `workspace.json#path_base: project-root` 解析。
- native/external provider 保留其可迁移 opaque locator；所有 provider 都不保存机器绝对路径、认证秘密或真实用户数据。
- 项目根 `.gitignore` 的 `specdev-worktree/` 条目由 `speculo init` 单一维护；缺失时创建流程阻塞并提示重新运行 init。
- E2E 仅适用于用户界面交互受影响的变更。普通执行由当前集成 owner 运行；委派执行由 Lead 在集成阶段运行。
- 合并、推送、PR、删除分支或 worktree 仍需用户授权。

</dev-worktree>

<dev-worktree-create>

# 创建或恢复工作项 Worktree

## 前置

- Ticket `ready: true` 且依赖完成，或原型问题与临时写入范围已锁定；项目写路径无冲突。
- 并行 Ticket 要求 `specdev/config.json` 中 `git.worktree_for_parallel: true`；一次性原型要求 P-prototype 已取得本次临时 worktree 授权。
- 调用方已指定 workspace owner、implementation owner、工作项 ID、持久化 owner，并固定 `base_sha`；并行 Ticket 共用同一基线。

## 创建

1. 从 Speculo 工作区声明的 `path_base: project-root` 解析 `<project-root>`。若记录的 provider 为 `git`，要求 `workspace_ref` 精确为 `specdev-worktree/<work-item-id>`，拼接后仍位于 project root，且 `specdev-worktree/` 不是逃逸到外部的符号链接。
2. 读取调用方拥有的持久化记录：Ticket 使用 `specdev/changes/{change}/.status.json` 的 `worktrees`；原型使用 `specdev/changes/{change}/prototypes/{prototype-id}/record.md`。若已有可恢复记录，Git provider 必须在 `git worktree list --porcelain` 中匹配固定路径、分支与 `base_sha`；native/external 由对应 provider 解析 opaque locator。一致则恢复，任一不一致停止。
3. 否则优先调用平台原生 worktree 能力。使用 native/external 时保存 provider 返回的可迁移 locator；不可用时进入 Git fallback。
4. Git fallback 前确认项目根 `.gitignore` 已包含 `specdev-worktree/` 或等价根模式。缺失时停止并提示重新运行当前版本 `speculo init`，不在本 Skill 内修改 `.gitignore`。
5. Git fallback 固定 `physical_path = <project-root>/specdev-worktree/<work-item-id>`、`workspace_ref = specdev-worktree/<work-item-id>`，从 `base_sha` 执行 `git worktree add -b <work-item-branch> <physical-path> <base-sha>`。已存在但未与同一记录和 Git 注册匹配的目标路径一律阻塞。
6. 分支使用 `speculo/<change>/<work-item-id>`；现有分支未能匹配记录时停止。
7. 安装项目所需依赖，运行最小基线检查。E2E 不属于 implementation owner 的创建基线。
8. Ticket 将记录写入 `worktrees`：

```json
{
  "ticket_id": "T-01",
  "owner": "<implementation-owner>",
  "provider": "git",
  "base_sha": "<sha>",
  "branch": "speculo/<change>/T-01",
  "workspace_ref": "specdev-worktree/T-01",
  "status": "active",
  "updated_at": "<ISO-8601>"
}
```

native/external provider 将示例中的 provider 与 `workspace_ref` 换为对应可迁移 locator，不套用 Git 物理路径。原型不使用本 JSON 结构，只在 record 的 Run and Assets 中记录源码 branch/commit，并在 frontmatter 写入 `workspace_ref` 与清理状态。

完成条件：工作区可定位、基线可用、调用方记录与实际 provider、分支和 checkpoint 一致；Git provider 的引用与工作项 ID 完全一致。失败时在调用方拥有的记录中设为 `blocked` 并保留现场。

</dev-worktree-create>

<dev-worktree-finalize>

# 集成与清理工作项 Worktree

## 集成

仅生产 Ticket 进入本段；一次性原型不得合入生产分支。

1. workspace owner 确认记录为 `review`，读取 implementation owner 的 Evidence，实际修改未越过路径契约。
2. 在目标集成基线上应用变更并运行受影响的定向与回归验证。
3. 仅当变更影响用户界面交互时，由当前集成 owner 运行验收所需的最小 E2E；委派执行中 implementation owner 只提供场景和预期结果，Lead 负责运行。
4. 验证通过后将记录更新为 `integrated`；冲突或失败时设为 `blocked` 并保留 worktree。

## 清理

1. 取得用户对删除 worktree 和分支的授权。
2. Git provider 从 project root 解析 `specdev-worktree/<work-item-id>`，重验无路径逃逸且与 `git worktree list --porcelain` 的记录一致，再从主工作树移除；native/external 通过对应 provider 管理入口移除。
3. 确认 worktree 不再注册且工作项目录不存在后删除对应分支。Ticket 将状态更新为 `removed`；原型把 `cleanup_status` 更新为 `clean`。保留项目根 `specdev-worktree/` 统一目录及 `.gitignore` 条目。

PR 或暂缓集成时保留 worktree。清理失败时停止；仅在用户明确要求时使用强制删除。

</dev-worktree-finalize>

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

<ticket-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:ticket:v3",
  "title": "SpecDev Ticket Frontmatter",
  "type": "object",
  "required": [
    "schema_version",
    "artifact",
    "change",
    "id",
    "title",
    "status",
    "planning_depth",
    "planning_depth_reason",
    "ready",
    "risk",
    "blocked_by",
    "contract_ids",
    "owner",
    "expected_changes",
    "writable_paths",
    "read_only_paths",
    "shared_paths",
    "shared_path_owners"
  ],
  "properties": {
    "schema_version": {
      "const": 3
    },
    "artifact": {
      "const": "ticket"
    },
    "change": {
      "type": "string",
      "minLength": 1
    },
    "id": {
      "type": "string",
      "pattern": "^T-[0-9]{2,}$"
    },
    "title": {
      "type": "string",
      "minLength": 1
    },
    "status": {
      "enum": [
        "draft",
        "ready",
        "in_progress",
        "blocked",
        "review",
        "done",
        "deviated",
        "cancelled"
      ]
    },
    "planning_depth": {
      "enum": [
        "lite",
        "standard",
        "deep"
      ]
    },
    "planning_depth_reason": {
      "type": "string",
      "minLength": 1
    },
    "ready": {
      "type": "boolean"
    },
    "risk": {
      "enum": [
        "low",
        "medium",
        "high",
        "critical"
      ]
    },
    "blocked_by": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^T-[0-9]{2,}$"
      },
      "uniqueItems": true
    },
    "contract_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "uniqueItems": true
    },
    "owner": {
      "type": "string",
      "minLength": 1
    },
    "expected_changes": {
      "$ref": "#/$defs/pathArray"
    },
    "writable_paths": {
      "$ref": "#/$defs/pathArray"
    },
    "read_only_paths": {
      "$ref": "#/$defs/pathArray"
    },
    "shared_paths": {
      "$ref": "#/$defs/pathArray"
    },
    "shared_path_owners": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^(?!/)(?![A-Za-z]:).+\\s*=>\\s*[^=].+$"
      },
      "uniqueItems": true
    }
  },
  "$defs": {
    "pathArray": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^(?!/)(?![A-Za-z]:).+$"
      },
      "uniqueItems": true
    }
  },
  "additionalProperties": true
}
```

</ticket-schema>

<tickets-map-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:tickets-map:v3",
  "title": "SpecDev Tickets Map Frontmatter",
  "type": "object",
  "required": ["schema_version", "artifact", "change", "status"],
  "properties": {
    "schema_version": {"const": 3},
    "artifact": {"const": "tickets-map"},
    "change": {"type": "string", "minLength": 1},
    "status": {"enum": ["draft", "ready", "in_progress", "completed", "blocked"]}
  },
  "additionalProperties": true
}
```

</tickets-map-schema>
