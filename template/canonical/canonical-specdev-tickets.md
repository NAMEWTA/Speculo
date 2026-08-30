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
- `deep`：公共 API/schema、数据迁移、安全/隐私/资金、不可逆操作、expand-contract、共享核心路径、多个 implementation owner 的跨 Ticket 写入协调或高事故半径。

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
- 每个 Ticket 按 Goal Plan 的 workspace 策略定义 current-workspace/direct-parent 或 source-worktree/parent-candidate 检查，以及按实际跨边界风险判定的 E2E disposition；
- 每个实现 Ticket 的 implementation commit 与对应父分支完成条件；仅 required 模式创建独立 worktree；
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
- Ticket 未声明 E2E required/not-required 及理由，或在 required 模式把 E2E 安排到 source worktree；
- 无法形成实现 commit 与 Goal Plan 所选 direct-parent/candidate-merge 父分支出口；
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

满足任一情况时建议运行 “目标规划阶段”：Ticket 数量达到或超过 10、存在多个 implementation owner 的并行写入协调、Deep Ticket、迁移、共享契约、多个 Gate 或高风险发布。只读 review/research 并行本身不触发 Goal Plan；少量线性 Ready Ticket 可直接进入 “实现阶段”。

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
- [ ] `writable_paths` 非空；纯 review/research 不伪装成 I-implement Ticket。
- [ ] 每个 shared path 在 `shared_path_owners` 中有唯一 owner。
- [ ] 正常、失败和回归至少各有一条验证，或有可信的不适用原因。
- [ ] 明确 `E2E disposition: required | not-required: reason`；required 场景、预期和接缝可执行。
- [ ] 按 Goal Plan 策略定义 current-workspace 或 source-worktree 的非 E2E 检查；E2E owner 固定为 Lead，运行环境分别为 current-workspace 或 parent-candidate。
- [ ] Ticket 完成合同包含 implementation commit、direct-parent 或 candidate-merge、父分支 result SHA 和 Lead Evidence；仅 required 模式需要独立 worktree。
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
- [ ] 跨 implementation owner 的路径所有权和所选 direct-parent/parent-candidate 集成 Gate 明确。
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

- **Workspace checks：** 按 Goal Plan 在 current workspace 或 source worktree 运行单元、组件、静态、类型、lint/build 等适用非 E2E 检查。
- **E2E disposition：** required / not-required：原因。
- **E2E owner/environment：** Lead / current-workspace 或 parent-candidate；required 时写明场景、接缝与预期。
- **Integration evidence：** implementation/source commit、parent before、适用 candidate/result SHA 和父分支包含关系。

E2E 由实际跨边界行为与风险决定，不限于 UI；required 模式不得在 Ticket source worktree 运行或声明通过。

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
- [ ] Ticket 已按 Goal Plan 策略形成非空 implementation/source commit，direct-parent 或 candidate 验证通过且父分支 result 已记录。
- [ ] E2E disposition 已执行；required 模式 E2E 在 parent-candidate、current 模式在 current workspace 由 Lead 完成。
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

- implementation subagent 上限来自 `specdev/config.json`，Goal Plan 可进一步降低且不含 Lead。
- review/research/test-observation agent 不设 SpecDev 数字上限，但保持只读。
- shared owner 为专用 Ticket；Lead 是 SpecDev 状态与父分支 integration owner。
- 项目路径契约以 Ticket frontmatter 为准。
- 每个实现 Ticket 的 workspace 由 Goal Plan 选择；current 模式串行使用当前 workspace，required 模式使用独立 worktree；只读调查不进入 I-implement Ticket。

| Ticket A | Ticket B | Writable 交集 | 真实依赖 | 处理 |
|---|---|---|---|---|
| T-02 | T-03 | 无 | 否 | 可并行 |

## 6. Gate、Wave 与集成点

T-tickets 可以标注候选 Wave、E2E disposition 和行为里程碑。需要正式跨 Ticket 编排时，由 “目标规划阶段” 完成 Gate、Wave、Lead、动态派单边界、candidate 集成顺序、发布与恢复，并把结果投影回本 Map。

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
| UI 设计包 | `specdev/changes/{change}/prototypes/{design-id}/design-system.md`、`specdev/changes/{change}/prototypes/{design-id}/comparison/` 与 `specdev/changes/{change}/prototypes/{design-id}/final/` | 项目 UI 证据、功能风格候选、逐层用户决定、设计 token、交互合同和可运行 HTML/CSS/JS 投影 | 生产 UI 实现或替用户确认高影响偏好 |
| Stakeholder 问卷 | `specdev/changes/{change}/questionnaires/{slug}.md` | 第三方原始回答和恢复条件 | 未经转录确认的产品/架构决定 |
| Wayfinder 地图 | `specdev/changes/{change}/wayfinder-map.md` | 目的地、说明、已关闭决策索引、战争迷雾和范围之外 | 开放 Ticket 正文或答案详情 |
| Wayfinder Ticket | `specdev/changes/{change}/investigation/{investigation-id}.md` | 一个可精确陈述的问题、类型、阻塞和关闭状态 | 解决方案评论或交付目标 |
| Wayfinder solution comment | `specdev/changes/{change}/investigation/comments/{investigation-id}/NN-solution.md` | Ticket 的答案、结果事实和资产指针 | 地图索引或产品实现 |
| 架构审查 | `specdev/changes/{change}/architecture-review.md` 与 `specdev/changes/{change}/architecture-review.html` | 深化候选、证据、可视化、选择和访谈状态 | 未经用户选择的执行契约 |

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
3. implementation subagent 只写其 Packet 与 Ticket 授权路径；Lead 自行实现也受同一边界约束。
4. review/research/test-observation agent 只读项目与 SpecDev 工件。
5. 越界前停止并按 deviation control 提出 ownership change；不得先改后报。
6. 上游 Ticket 改变目录/合同后，下游基于已集成父分支重新解析路径和 preflight。

## 3. Ticket workspace strategy

Goal Plan 创建时选择 Ticket workspace strategy，默认 `current`。`current` 模式的 Ticket 使用当前分支、当前 workspace 和严格串行执行；允许一个 implementation subagent 写入当前 workspace，但前一 Ticket 必须完成 commit、Lead 验收和 direct-parent 验证后才能开始下一个。`required` 模式每个 Ticket 使用唯一来源 worktree `specdev-worktree/<ticket-id>`，并通过 candidate-merge 集成。没有 Ticket 的获批 Direct Spec 继续由 current workspace 唯一 owner 执行；只读调查不创建实现 worktree。

workspace/implementation owner 可以是 Lead 或动态 implementation subagent；integration owner 固定为 Lead。current 模式 Lead 在父分支直接验收和推进，required 模式 Lead 建立 parent-candidate、运行适用 E2E 并推进父分支。required 生命周期由 下方 `<dev-worktree>` 标签 管理，current 生命周期由 I-implement 的 direct-parent 规则管理。

## 4. 并发

required 模式 implementation subagent 上限取 Goal Plan、config 和平台能力共同约束，Lead 不计入。current 模式保持单 writer 串行安全不变量，Ticket 严格串行。review/research/test-observation agent 不设置 SpecDev 数字上限，但 Lead 必须避免重复工作与可变环境争用。

**完成标准**：每个项目写入映射到唯一 Ticket、owner 和来源 worktree；shared 与父分支写入 owner 唯一。

</path-ownership>

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
- 偏差影响并行执行、source checkpoint 或 candidate 集成时，Lead 必须暂停受影响 Wave，重新计算路径所有权、依赖、Gate 与父分支顺序；任何 subagent 都不能自行改写上层合同。

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

`operation=create` 时加载 下方 `<dev-worktree-create>` 标签。Ticket 使用 `specdev-worktree/<ticket-id>`；同一 Ticket 只存在一个来源 worktree。`operation=restore` 时重读实际 Git worktree/branch/tip/dirty 状态并与调用方记录核对，漂移时停止。

**完成标准**：来源基线、branch、locator、owners 和实际 Git 状态一致；现有用户改动未被覆盖。

## 2. 来源实现门

implementation owner 只在来源 worktree 修改授权项目路径，运行 Ticket 要求的单元、组件、静态、类型、lint/build 等非 E2E 检查。进入 `review` 前，worktree 必须 clean，branch tip 必须是已授权的 `source_checkpoint` commit，实际 diff 必须符合路径合同。

**完成标准**：source checkpoint 不可变且可达；来源 worktree 没有 E2E pass 声明。

## 3. 候选合并与父分支推进

`operation=finalize` 仅由 Lead/integration owner 调用，并加载 下方 `<dev-worktree-finalize>` 标签。Lead 在独立 parent-candidate checkout 组合最新父分支与 source checkpoint，运行集成检查和适用 E2E，通过后才推进父分支。

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

</dev-worktree>

<dev-worktree-create>

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
7. Lead 写入 `specdev/changes/{change}/.status.json`，状态为 `active`。

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

</dev-worktree-create>

<dev-worktree-finalize>

# Candidate Merge And Parent Integration

仅由 Lead/integration owner 对状态为 `review` 的 Ticket 调用。

## 1. 接收 source checkpoint

1. 核对 Ticket、Goal Plan、Evidence 目标、owner 与本地 integration 授权；
2. 验证来源 worktree clean，branch tip 精确等于 `source_checkpoint`，commit 从 `base_sha` 可达；
3. 审计实际 diff 未越过 writable/shared owner 合同；
4. 确认 source-worktree 必跑非 E2E 检查已执行，且没有把 E2E 自报为通过；
5. 重读父分支 checkout clean、HEAD 与 remote/本地约定，记录 `parent_before_sha`。

失败时保持 `review`/`blocked`，不开始候选合并。

## 2. 建立 parent-candidate checkout

1. 使用 branch `speculo/integration/<change>/<ticket-id>` 和 locator `specdev-worktree/.integration/<ticket-id>`，从最新 `parent_before_sha` 建立 Lead-owned integration worktree；
2. 如果父 SHA 是 source checkpoint 的祖先，在 candidate checkout 执行 `git merge --ff-only <source_checkpoint>`，`method=fast-forward`；
3. 否则执行 `git merge --no-ff --no-commit <source_checkpoint>`；
4. 冲突按 下方 `<merge-conflict-protocol>` 标签 处理。需要新产品决定时执行 `git merge --abort`，记录 blocker 并返回来源 worktree；
5. 对分叉结果创建一次 Lead-owned candidate merge commit，`method=merge-commit`；
6. 记录 candidate branch/locator、`candidate_sha`、`source_sha`、冲突路径与 attempts，worktree 状态改为 `integrating`、integration 状态改为 `candidate`。

重试前从最新父分支重建 candidate branch/worktree；旧 candidate SHA 保存在 Evidence。候选生命周期的重建/回收包含在 local candidate integration 授权中。

## 3. 在候选父状态验证

在 candidate checkout 运行：

- Ticket 受影响集成与回归；
- 项目要求的 typecheck/lint/build 或其他父状态检查；
- 仅当 Ticket/Goal Plan `e2e.required=true` 时运行对应 E2E。

每条命令记录运行环境 `parent-candidate`、退出码与摘要。E2E required 未运行或失败时 integration `verification=failed`、`status=failed`；父分支保持 `parent_before_sha`。机械修正次数不得超过 Goal Plan 快照的 `integration_attempt_limit`；不得放宽断言、删除检查或发明行为。

## 4. 推进父分支

全部 required 检查通过后：

1. 重读父分支 HEAD；不等于 `parent_before_sha` 时将 candidate 标记 `stale`，不推进父分支并从步骤 2 重建；
2. 在父分支 checkout 执行 `git merge --ff-only <candidate_sha>`；候选 merge commit 本身已以父 SHA 为第一祖先，因此不再创建第二个 merge commit；
3. 重读父 HEAD、tree 与 ancestor 关系，确认 HEAD 精确等于 candidate SHA 且包含 source checkpoint；
4. 写入 `result_sha=candidate_sha`、`verification=passed`、E2E 最终状态和 Evidence；
5. integration/status 改为 `passed`/`integrated`，再由 Lead 标记 Ticket Done。

## 5. 失败、清理与恢复

- candidate 检查失败：父分支不动，Ticket 回 `in_progress` 或 `blocked`，来源 worktree 保留；
- 父 HEAD 漂移：旧 candidate 记 `stale`，完整重建并重跑；
- 成功后可按 candidate integration 授权回收 transient integration worktree/branch；来源 branch/worktree 不自动清理。获得独立 cleanup 授权并清理后，只将生命周期状态改为 `removed`，完整保留已经通过的集成与 E2E 证据；
- push、PR、remote merge、deploy、migration 和生产动作仍需各自授权。

**完成标准**：passed 时父 HEAD=result/candidate SHA 且包含 source commit；failed/stale 时父 HEAD 仍为开始该轮记录的父状态或更新后的外部事实，没有本轮候选污染。

</dev-worktree-finalize>

<merge-conflict-protocol>

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
- 完成/暂停可以从 Git、change status 和 Evidence 恢复。

</merge-conflict-protocol>

<config-template>

```json
{
  "schema_version": 5,
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
  }
}
```

</config-template>

<config-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:config:v5",
  "title": "SpecDev Configuration",
  "type": "object",
  "required": ["schema_version", "interaction_language", "artifact_language", "git", "execution", "verification", "planning"],
  "properties": {
    "schema_version": {"const": 5},
    "interaction_language": {"type": "string", "minLength": 1},
    "artifact_language": {"type": "string", "minLength": 1},
    "git": {
      "type": "object",
      "required": ["default_branch"],
      "properties": {
        "default_branch": {"type": ["string", "null"]}
      },
      "additionalProperties": false
    },
    "execution": {
      "type": "object",
      "required": ["max_implementation_agents", "max_integration_attempts", "deep_ticket_human_approval", "shared_path_owner"],
      "properties": {
        "max_implementation_agents": {"type": "integer", "minimum": 1},
        "max_integration_attempts": {"type": "integer", "minimum": 1},
        "deep_ticket_human_approval": {"type": "boolean"},
        "shared_path_owner": {"type": "string", "minLength": 1}
      },
      "additionalProperties": false
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
      "required": ["default_depth", "require_ready_gate", "require_evidence", "ui_design_default_candidates", "ui_design_max_candidates"],
      "properties": {
        "default_depth": {"enum": ["lite", "standard", "deep"]},
        "require_ready_gate": {"type": "boolean"},
        "require_evidence": {"type": "boolean"},
        "ui_design_default_candidates": {"type": "integer", "minimum": 2, "maximum": 4},
        "ui_design_max_candidates": {"type": "integer", "minimum": 2, "maximum": 4}
      },
      "additionalProperties": true
    }
  },
  "allOf": [{
    "$comment": "ui_design_default_candidates <= ui_design_max_candidates is enforced by validate-specdev.mjs because JSON Schema cannot compare sibling numeric values."
  }],
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
