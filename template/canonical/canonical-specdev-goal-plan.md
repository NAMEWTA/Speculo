# 目标规划

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

Goal Plan 只解决单个 Ticket 无法独立决定的事情：跨 Ticket 顺序、并发、共享所有权、里程碑 Gate、集成验证、迁移与发布顺序、偏差升级和恢复。它不是 Ticket 的放大版，也不按固定章节数量衡量质量。

产物写入 `specdev/changes/{change}/goal-plan.md`。

## 何时运行

满足任一条件时运行：

- 多个 Ticket 可以或需要并行；
- 存在 shared path、共享合同、集中 owner 或 Lead/Subagent；
- 存在 Deep Ticket、expand-contract、数据迁移、兼容窗口或不可逆步骤；
- 存在多个里程碑、外部审批、发布窗口、参考符合性或高事故半径；
- Ticket DAG 虽不大，但关键路径、汇合点或恢复策略不能仅由 `specdev/changes/{change}/tickets-map.md` 安全表达；
- 用户明确要求正式跨 Ticket Plan。

少量、线性、低风险且路径不冲突的 Ready Tickets 可以跳过本 work，直接由 “实现阶段” 按 Tickets Map 执行。

## 输入

必须读取：

- `specdev/changes/{change}/spec.md`
- `specdev/changes/{change}/tickets-map.md`
- `specdev/changes/{change}/ticket/`
- `specdev/config.json`

按存在情况读取：

- `specdev/changes/{change}/ADR.md`
- `specdev/changes/{change}/CONTEXT.md`
- `specdev/changes/{change}/LOG.md`
- `specdev/adr/`
- `specdev/context/`
- 用户提供的合同、标准、参考实现、环境限制、发布窗口与批准策略。

Spec 或 Tickets Map 不存在时，返回 “编写 Spec 阶段” 或 “拆分 Tickets 阶段”，不得在 Goal Plan 中临时补造上游工件。

## 流程

### 1. 验证上游与选择规划模式

加载 下方 `<planning-modes>` 标签：

1. 验证 Spec Ready、Ticket Ready、合同覆盖、DAG、路径所有权和 Deep Ticket 完整性；
2. 只读探索会影响调度的代码事实和项目约束；
3. 识别 coordination、migration、high-assurance、reference-conformance 等可组合模式；
4. 只对无法发现且会改变 Gate、Wave、owner、迁移或批准点的问题向用户提问；
5. 不熟悉的外部标准或依赖使用 下方 `<research>` 标签。

任何硬停止问题都必须退回拥有该决策的上游工件，不得用 Goal Plan 覆盖。

### 2. 构建跨 Ticket 执行模型

加载 下方 `<orchestration-protocol>` 标签：

1. 从 Ticket frontmatter 构建 DAG 和关键路径；
2. 将 Ready 且项目写路径不相交的 Ticket 分配到 Wave；
3. 为 shared path、共享合同和集中变更指定唯一 owner；
4. 为行为闭环、合同稳定、迁移完成、发布就绪等关键状态定义 Gate；
5. 明确 expand → migrate → contract、Evidence 返回和集成规则；并行写代码时使用 下方 `<dev-worktree>` 标签；
6. 将每个 Ticket 需要的执行上下文压缩成派单载荷，不复制整个历史对话。

### 3. 定义整体完成、证据与恢复

加载 下方 `<completion-control>` 标签：

1. 将整体目标、非目标和权威来源压缩为一个可审查摘要；
2. 定义整体 Definition of Done 和每个 Gate 的关闭证据；
3. 固化跨 Ticket 不可协商约束；
4. 定义偏差等级、暂停范围、批准人和恢复动作；
5. 定义进度回报、Evidence 汇总、残余风险和回滚要求。

### 4. 写入自适应 Goal Plan

使用 下方 `<goal-plan-template>` 标签 写入 `specdev/changes/{change}/goal-plan.md`。

模板包含六个职责区，但只保留适用内容：

1. Outcome and Authority；
2. Execution Graph；
3. Gates and Completion Evidence；
4. Execution and Integration Protocol；
5. Constraints, Risk and Recovery；
6. Progress and Decisions。

Ticket 较多时在 Execution Graph 内增加速查表；不创建独立的第二套状态来源。

### 5. 同步与验证

1. 将 Wave、Gate 和 owner 投影同步到 `specdev/changes/{change}/tickets-map.md`；
2. 对照 下方 `<goal-plan-schema>` 标签；
3. 运行：

> **结构校验：** 本地项目若已安装 Speculo，使用其 Node 校验器检查当前 change；
> 纯网页环境逐项核对本文内联的 schema、Ready 清单和完成标准，并记录自动校验未运行。

4. 更新 `specdev/status.json` 与 `specdev/changes/{change}/.status.json`；
5. 向用户汇报模式、关键路径、Wave、Gate、shared owner、迁移策略、主要风险和 Ready 状态；
6. 未经用户要求，不自动进入实现。

## 决策完备标准

Goal Plan 必须让执行 Lead 或实现者无需重新决定：

- 跨 Ticket 先后、并发 Wave 和关键汇合点；
- shared path 与共享合同的 owner；
- Gate 开启、关闭和证据；
- 迁移、兼容、收缩、发布和回滚顺序；
- Agent 派单上下文、Evidence 返回和集成规则；
- 偏差等级、暂停范围和批准路径。

Goal Plan 不应重复：

- Ticket 的完整局部执行路线；
- 每个 Ticket 的全部文件预测；
- 每条局部验收 checklist；
- Spec 中的完整用户故事和产品背景。

## 完成标准

- `specdev/changes/{change}/goal-plan.md` 已写入且只包含适用内容；
- 所有计划内 Ticket Ready，DAG 无环，合同覆盖明确；
- Wave、Gate、owner、集成、偏差和恢复可执行；
- Tickets Map 投影已同步；
- 无未批准高影响假设或硬停止问题；
- 结构校验无 error；纯网页环境的人工核对结果已记录；
- 用户收到摘要和下一步选择。

## 子文件引用

- 规划模式与输入门禁：下方 `<planning-modes>` 标签
- DAG、Wave、Gate 与 Lead 编排：下方 `<orchestration-protocol>` 标签
- 完成、证据、偏差与恢复：下方 `<completion-control>` 标签
- Goal Plan 模板：下方 `<goal-plan-template>` 标签
- 并行 Ticket worktree：下方 `<dev-worktree>` 标签

---

## 参考内容

以下内容均已内联。主流程提到标签时，直接使用对应标签中的完整规则、模板或 schema。

<planning-modes>

# Goal Plan 规划模式与输入门禁

本文件由 “目标规划阶段” 在上游验证和模式选择时加载。

## 1. 必需输入门禁

- [ ] `specdev/changes/{change}/spec.md` 设置 `ready_for_tickets: true`，或存在用户明确批准的等价权威目标。
- [ ] `specdev/changes/{change}/tickets-map.md` 与全部 Ticket 一致。
- [ ] 所有计划执行的 Ticket 设置 `ready: true`。
- [ ] Ticket ID、具体 `specdev/changes/{change}/ticket/NN-<ticket-name>.md` 和 Map 行一致。
- [ ] `blocked_by` 引用存在，DAG 无环。
- [ ] Spec 验收合同全部 covered，或 deferred 项有批准、原因和后续归属。
- [ ] 可能并行的 Ticket 项目写路径不相交，或已有 shared owner 与排序方案。
- [ ] Deep Ticket 具备迁移、兼容、监控、回滚、收缩条件和批准点。
- [ ] Ticket 与 Spec、ADR、代码事实不存在未处理冲突。

## 2. 硬停止

出现以下任一情况时停止：

- 任一计划内 Ticket 未 Ready；
- DAG 有环、缺失引用或依赖仅代表偏好；
- 合同 uncovered 且未批准 deferred；
- 并行候选写路径相交且无 owner 或顺序；
- Ticket 改写了 Spec 的外部行为、范围或验收；
- Ticket 与 `specdev/changes/{change}/ADR.md` 的已接受决策冲突；
- Deep Ticket 缺少关键迁移或恢复信息；
- 当前代码事实使 Ticket 的核心行为、接口或验证不可执行；
- 必需外部合同或参考权威不可获得。

按 下方 `<artifact-contract>` 标签 和 下方 `<deviation-control>` 标签 返回真正拥有该决策的工件。

## 3. 可组合模式

### coordination

适用于多 Wave、扇出/汇合、shared path 或 Lead/Subagent。重点是 DAG、owner、Evidence 返回、集成和状态同步。

### migration

适用于 expand-contract、数据迁移、协议迁移或兼容窗口。重点是扩展、分批迁移、收缩条件、数据核对、监控和回滚。

### high-assurance

适用于安全、隐私、资金、数据完整性、法规或不可逆操作。重点是独立审查、人工批准、Evidence 完整性和失败恢复。

### reference-conformance

适用于外部合同、标准、官方实现或指定兼容行为。重点是来源版本、符合性矩阵和冲突裁决。

### release-coordination

适用于发布窗口、跨团队依赖、部署顺序或运营交接。重点是环境前置条件、Gate、观察期和回退。

模式可以组合。仅有线性低风险 Ticket 时不应为了形式生成重型 Goal Plan。

## 4. 模式摘要

写入 `specdev/changes/{change}/goal-plan.md` 前形成：

```text
modes=<mode-list>
tickets=<count>
critical_path=<ticket-list>
parallel_capacity=<n>
shared_owners=<owner-map>
gates=<gate-list>
hard_stops=<none-or-list>
adopted_assumptions=<low-impact-only>
```

</planning-modes>

<orchestration-protocol>

# Goal Plan 编排协议

本文件定义 DAG、Wave、Gate、路径所有权、Lead/Subagent、worktree、Evidence 返回和集成规则。

## 1. DAG 与关键路径

- 依赖权威来自 `specdev/changes/{change}/ticket/NN-<ticket-name>.md` frontmatter 的 `blocked_by`；
- `specdev/changes/{change}/tickets-map.md` 是投影，不是第二套依赖真相；
- 计算根节点、扇出、汇合点、关键路径、共享合同 owner 和最终收缩点；
- 依赖只表示真实开始条件，不表示偏好、人员交接或“最好先做”；
- 无法独立保持可验证状态的迁移批次必须有隔离集成策略和最终集成 Gate。

## 2. Wave

Wave 内 Ticket 必须同时满足：

- `ready: true`；
- 所有依赖已完成并有 Evidence；
- 项目写路径不相交；
- shared path 已由 owner 稳定；
- 适用 Gate 已打开；
- 基线和外部合同版本一致。

最大并发从 `specdev/config.json` 读取。并发上限是资源约束，不是强制填满的目标。

## 3. Gate

Gate 由可验证状态定义，不用“完成若干 Ticket”作为唯一条件。每个 Gate 必须写明：

- 业务或工程状态；
- 开启条件；
- 关闭证据；
- 阻塞范围；
- owner 与批准人；
- 失败时恢复动作。

常见 Gate 包括共享合同稳定、首条垂直路径通过、迁移完成、旧调用点归零、发布就绪和观察期结束。名称按项目语义自定义。

## 4. Shared path 与共享合同

规则遵循 下方 `<path-ownership>` 标签：

1. 由专用 owner Ticket 或 Lead 修改共享路径；
2. 形成可验证稳定基线；
3. 下游消费者在新基线上重新运行 preflight；
4. 才允许扇出并行；
5. 共享契约需要变化时暂停消费者并修订上游，不通过多个 Agent 同时修改解决。

## 5. Expand-contract

标准顺序：

1. **expand**：新旧形式并存，既有调用者继续工作；
2. **migrate**：按可独立验证的影响范围分批迁移；
3. **observe**：扫描旧调用点、旧数据或旧协议使用量；
4. **contract**：收缩条件有证据后删除旧形式；
5. **verify**：运行兼容、数据、回归、监控和回滚检查。

收缩不得仅以“所有迁移 Ticket 已完成”为依据。

## 6. Lead/Subagent

Lead 负责基线、DAG、Wave、shared owner、Gate、Evidence 汇总和集成；不抢做已派发 Ticket 的实现。

并行写代码且配置允许时，Lead 为每个 Ticket 调用 下方 `<dev-worktree>` 标签：

- 所有并行 Ticket 固定同一 `base_sha`，每个 Ticket 使用独立分支和 `workspace_ref`；
- Lead 创建、恢复、集成和清理；Worker 只把状态推进到 `review`；
- 只读调查和顺序执行不为形式创建 worktree。

每个 Agent 的最小读取顺序：

1. “实现阶段”；
2. `specdev/changes/{change}/ticket/NN-<ticket-name>.md`；
3. `specdev/changes/{change}/goal-plan.md` 中适用的 Wave、Gate 和硬约束；
4. `specdev/changes/{change}/spec.md` 中相关合同；
5. `specdev/changes/{change}/ADR.md` 和 `specdev/changes/{change}/CONTEXT.md` 中相关条目；
6. 项目级 Agent 指令和当前代码事实。

不把完整历史对话、全部 Ticket 或无关研究塞入 Agent 上下文。

## 7. 派单载荷

派单必须包含：

- Ticket ID 与 `specdev/changes/{change}/ticket/NN-<ticket-name>.md`；
- 基线 SHA、分支和 `workspace_ref`；
- 项目写、只读和 shared 路径；
- 已完成依赖及其 Evidence；
- 合同 ID；
- 适用 Wave、Gate 和跨 Ticket 约束；
- 必须执行的验证矩阵；
- 偏差升级方式和禁止修改事项。

## 8. Evidence 返回与集成

Agent 完成或阻塞时：

1. 写入 `specdev/changes/{change}/evidence/T-NN.md`；
2. 同步 Ticket、Tickets Map、Goal Plan 和 change 状态；
3. 向 Lead 返回 Ticket ID 与状态、Evidence 完整路径、`workspace_ref`、commit 或 PR 引用，以及仅在用户界面交互受影响时由 Lead 执行的待办 E2E。

Lead 集成时：

1. 读取 Ticket、Evidence、Goal Plan 和对应代码引用；
2. 检查路径授权；
3. 复跑定向验证；
4. 合并或应用变更；
5. 运行受影响回归；
6. 仅当用户界面交互受影响时，由 Lead 运行最小 E2E；
7. 按 dev-worktree Skill 更新或清理 worktree；
8. 同步 Ticket、Map、Evidence 和 Goal Plan；
9. 检查 Gate 是否可关闭。

逻辑冲突返回契约和 owner 解决，不机械选择某一侧版本。

</orchestration-protocol>

<completion-control>

# Goal Plan 完成、证据与恢复控制

## 1. Outcome and Authority

Goal Plan 用紧凑摘要表达：

- 业务或用户目标；
- 目标受众或运营角色；
- 所有计划 Ticket 完成后的可观察终态；
- 关键约束；
- 明确非目标；
- 权威来源和冲突规则。

不复制 `specdev/changes/{change}/spec.md` 的完整用户故事。

## 2. 整体 Definition of Done

整体完成至少覆盖：

- 所有计划内 Ticket 完成，cancelled 或 deferred 项有批准；
- 所有 Spec 验收合同和外部符合性要求有 Evidence；
- 项目类型检查、静态检查、测试、lint、构建和适用 CI 完成；仅 UI 交互受影响时由 Lead 完成 E2E；
- 迁移、兼容、调用点清零、监控、回滚和不可逆批准完成；
- 无未批准偏差和未处置高风险残余问题；
- Ticket、Map、Goal Plan、Evidence 和状态一致。

## 3. Gate 关闭仪式

每个 Gate 关闭时：

1. 汇总覆盖的 `specdev/changes/{change}/evidence/T-NN.md`；
2. 检查对应合同和参考符合性；
3. 检查共享接口、数据、兼容、迁移和调用点；
4. 运行里程碑级验证；仅 UI 交互受影响时由 Lead 运行最小 E2E；
5. 审查失败分类、偏差、残余风险和恢复能力；
6. 获取适用人工批准；
7. 同步 `specdev/changes/{change}/goal-plan.md`、`specdev/changes/{change}/tickets-map.md` 和状态工件。

## 4. 不可协商约束

只记录跨多个 Ticket 且不可由实现者改变的规则，例如数据完整性、wire format 兼容、旧协议收缩条件、shared owner、安全要求、发布窗口、回滚演练和批准点。

来源必须指向：

- `specdev/changes/{change}/spec.md`；
- `specdev/changes/{change}/ADR.md`；
- 具体 `specdev/changes/{change}/ticket/NN-<ticket-name>.md`；
- 外部 Url 标签；
- `specdev/config.json`。

## 5. 偏差与暂停

偏差等级和处理遵循 下方 `<deviation-control>` 标签。

跨 Ticket 偏差还必须明确：

- 暂停哪些 Wave 或 Ticket；
- 哪个 Gate 重新打开；
- 哪些 Agent 需要重新基线；
- 哪些 Evidence 失效；
- 重新开始的条件。

## 6. 风险与恢复

每个高风险项写明：触发信号、事故半径、预防措施、检测方式、恢复动作、owner 和批准点。迁移或发布计划必须给出回滚不可行时的前向恢复方案。

## 7. 进度与决策回报

使用可核验状态，不使用主观百分比：

```text
WAVE_STATUS wave=<n> ready=<ids> active=<ids> done=<ids> blocked=<ids>
GATE_STATUS gate=<name> state=open|closed evidence=<paths> risks=<summary>
TICKET_STATUS id=<id> state=<state> evidence=<path> deviation=<none|id>
BLOCKER id=<id> owner=<owner> needed=<decision-or-input> impact=<scope>
DECISION id=<id> owner=<owner> status=pending|approved|rejected impact=<scope>
```

具体路径必须以本文约定的逻辑路径形式填写。

</completion-control>

<goal-plan-template>

## 产物 YAML 头部

生成该工件时，将以下字段写在文档开头的 YAML frontmatter 中：

```yaml
schema_version: 3
artifact: goal-plan
change: <YYYY-MM-DD-topic>
status: draft
modes: [coordination]
ready_for_execution: false
```

# Goal Plan: <标题>

- **Goal Plan：** `specdev/changes/{change}/goal-plan.md`
- **Spec：** `specdev/changes/{change}/spec.md`
- **Tickets Map：** `specdev/changes/{change}/tickets-map.md`
- **Ticket 目录：** `specdev/changes/{change}/ticket/`
- **Evidence 目录：** `specdev/changes/{change}/evidence/`

## 1. Outcome and Authority

### Outcome

### Non-goals

### Authoritative Inputs

| 优先级 | 来源 | 负责内容 | 冲突处理 |
|---|---|---|---|
| 1 | 用户最新明确决定 | 产品取舍与批准 | 更新真正拥有该决策的工件 |
| 2 | `specdev/changes/{change}/ADR.md` | 已接受架构决策 | 通过新决策替代 |
| 3 | `specdev/changes/{change}/spec.md` | 外部行为、范围与验收 | 下游不得改写 |
| 4 | `specdev/changes/{change}/ticket/NN-<ticket-name>.md` | 单 Ticket 契约 | Goal Plan 只编排 |
| 5 | 当前代码事实 | 现状与可行性 | 冲突时触发偏差 |

## 2. Execution Graph

### DAG and Critical Path

```text
...
```

### Waves and Ownership

| Wave | Ticket | 前置条件 | 项目写路径 | Shared owner | 集成点 |
|---|---|---|---|---|---|

### Ticket Quick Reference

<!-- Ticket 较多或执行者需要时添加；数据从 Ticket 与 Tickets Map 提取。 -->

| ID | Ticket | 行为产出 | Depth/Risk | Dependencies | Wave/Gate | Owner | Evidence |
|---|---|---|---|---|---|---|---|
| T-01 | `specdev/changes/{change}/ticket/01-<name>.md` | ... | standard/medium | — | W0/G0 | lead | `specdev/changes/{change}/evidence/T-01.md` |

## 3. Gates and Completion Evidence

### Overall Definition of Done

### Gates

| Gate | 开启条件 | 关闭证据 | 阻塞范围 | Owner/批准人 | 失败恢复 |
|---|---|---|---|---|---|

### Contract and Reference Coverage

| 合同或参考要求 | 覆盖 Ticket | 验证接缝 | Evidence | 状态 |
|---|---|---|---|---|

## 4. Execution and Integration Protocol

### Dispatch Payload

并行写代码时记录统一 `base_sha`，并为每个 Ticket 指定分支、`workspace_ref` 和 worktree owner。

### Ticket Execution

引用 “实现阶段” 和对应 `specdev/changes/{change}/ticket/NN-<ticket-name>.md`，不复制 Ticket 全文。

### Evidence Return and Integration

Worker 将 Ticket 推进到 `review`，返回 Ticket ID 与状态、Evidence 路径、`workspace_ref`、commit 或 PR 引用，以及条件性 Lead E2E；Lead 负责集成、回归和 worktree 收尾。

## 5. Constraints, Risk and Recovery

### Non-negotiable Constraints

### Migration or Release Sequence

### Risks, Monitoring and Recovery

### Deviation Control

遵循 下方 `<deviation-control>` 标签。

## 6. Progress and Decisions

### Current Status

### Pending Decisions and Blockers

### Reporting Format

## Assumptions

仅记录低影响、可逆且有验证方式的假设。高影响假设存在时，`ready_for_execution` 必须为 `false`。

</goal-plan-template>

<artifact-contract>

# 工件职责与权威裁决

SpecDev 通过分层工件避免同一决策被多个模型反复重做。每个工件只承担自己的权威边界。

## 1. 工件职责

| 工件 | 具体位置 | 必须决定 | 不应决定 |
|---|---|---|---|
| 分诊 | `specdev/changes/{change}/triage.md` | 请求类别、影响、风险、缺失输入和下一 work | 详细实现方案 |
| 诊断 | `specdev/changes/{change}/diagnosis.md` | 复现、证据、根因、修复不变量和回归契约 | 未经验证的修复实现 |
| 设计日志 | `specdev/changes/{change}/LOG.md` | 讨论轨迹、确认、延后、替代与废弃结论 | 当前架构权威摘要 |
| 领域上下文 | `specdev/changes/{change}/CONTEXT.md` | 当前领域术语、语义和稳定不变量 | 临时会议记录 |
| 架构决策 | `specdev/changes/{change}/ADR.md` | 已接受架构决策、原因、后果和替代关系 | 尚未决定的方案集合 |
| Spec | `specdev/changes/{change}/spec.md` | 用户问题、外部行为、范围、验收合同、非功能要求和已锁定实现约束 | 文件级施工步骤 |
| Ticket | `specdev/changes/{change}/ticket/NN-<ticket-name>.md` | 单一垂直切片的行为、决策、范围、路径所有权、执行路线和验证证据 | 跨 Ticket 里程碑治理 |
| Tickets Map | `specdev/changes/{change}/tickets-map.md` | 依赖 DAG、合同覆盖、Ready 投影、并行候选和路径冲突 | 单 Ticket 的完整实现契约 |
| Goal Plan | `specdev/changes/{change}/goal-plan.md` | 跨 Ticket 调度、Gate、共享所有权、迁移顺序、集成和偏差治理 | 复制 Ticket 全文 |
| Evidence | `specdev/changes/{change}/evidence/T-NN.md` | 实际修改、命令、结果、验收映射、偏差、风险和提交引用 | 新的产品或架构决策 |

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
4. shared path 只能由 Lead 或专用 owner Ticket 修改；消费者 Ticket 只读。
5. 需要越界时先停止，按 下方 `<deviation-control>` 标签 提出 ownership change；不得先改后报。
6. 前置 Ticket 改变目录结构后，后续 Ticket 开始前重新解析项目路径；若授权范围语义未改变，可只更新导航路径。
7. 不得把“最后解决合并冲突”当作所有权方案。

## 3. Worktree 与分支

并行写代码的 Ready Ticket 使用隔离 worktree；只读调查和顺序执行默认共用当前工作区。Worktree 防止工作区污染，路径所有权防止逻辑冲突，两者不能互相替代。

生命周期由 Lead 按 下方 `<dev-worktree>` 标签 管理，编排规则位于 下方 `<orchestration-protocol>` 标签。

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

<dev-worktree>

# SpecDev Dev Worktree

## 适用范围

- 仅用于并行写代码且路径所有权不冲突的 Ready Ticket。
- 只读调查和顺序执行默认共用当前工作区。
- Lead 管理创建、集成和清理；Worker 只实现、验证并返回 Evidence。
- 平台原生 worktree 优先；不可用时使用 Git worktree。

## 生命周期

1. 创建或恢复时加载 下方 `<dev-worktree-create>` 标签。
2. Worker 完成后将记录从 `active` 更新为 `review`，返回 Ticket 状态、Evidence 路径、`workspace_ref`、commit 或 PR 引用，以及条件性 Lead E2E。
3. Lead 集成或清理时加载 下方 `<dev-worktree-finalize>` 标签。

状态依次为 `planned → active → review → integrated → removed`；失败进入 `blocked`。记录写入 `specdev/changes/{change}/.status.json` 的 `worktrees`。

## 边界

- 每个并行 Ticket 使用独立 worktree、分支和相同 `base_sha`。
- 持久状态只保存 `workspace_ref`，不保存机器绝对路径。
- E2E 仅由 Lead 在集成阶段执行，且仅适用于用户界面交互受影响的变更。
- 合并、推送、PR、删除分支或 worktree 仍需用户授权。

</dev-worktree>

<dev-worktree-create>

# 创建或恢复 Ticket Worktree

## 前置

- Ticket `ready: true`，依赖完成，写路径无冲突。
- `specdev/config.json` 中 `git.worktree_for_parallel: true`。
- Lead 已固定所有并行 Ticket 共用的 `base_sha`。

## 创建

1. 若 `specdev/changes/{change}/.status.json` 的 `worktrees` 已有该 Ticket 的 `active` 或 `review` 记录，解析 `workspace_ref` 并验证分支、`base_sha` 和工作区状态；一致则恢复。
2. 否则优先调用平台原生 worktree 能力；不可用时从 `base_sha` 执行 `git worktree add -b <ticket-branch> <physical-path> <base-sha>`。物理路径必须位于主工作树之外。
3. 分支使用 `speculo/<change>/<ticket-id>`；现有分支或目标路径未能匹配记录时停止。
4. 安装项目所需依赖，运行最小基线检查。E2E 不属于 Worker 基线。
5. 写入 `worktrees`：

```json
{
  "ticket_id": "T-01",
  "owner": "<worker>",
  "provider": "native",
  "base_sha": "<sha>",
  "branch": "speculo/<change>/T-01",
  "workspace_ref": "<provider-opaque-or-project-relative-ref>",
  "status": "active",
  "updated_at": "<ISO-8601>"
}
```

完成条件：工作区可定位、基线可用、状态记录与实际分支一致。失败时设为 `blocked` 并保留现场。

</dev-worktree-create>

<dev-worktree-finalize>

# 集成与清理 Ticket Worktree

## Lead 集成

1. 确认记录为 `review`，读取 Worker Evidence，实际修改未越过路径契约。
2. 在目标集成基线上应用变更并运行受影响的定向与回归验证。
3. 仅当变更影响用户界面交互时，由 Lead 运行验收所需的最小 E2E；Worker 只提供场景和预期结果。
4. 验证通过后将记录更新为 `integrated`；冲突或失败时设为 `blocked` 并保留 worktree。

## 清理

1. 取得用户对删除 worktree 和分支的授权。
2. 从主工作树或平台管理入口移除已集成 worktree。
3. 确认 worktree 不再注册后删除对应分支，并将状态更新为 `removed`。

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

<goal-plan-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:goal-plan:v3",
  "title": "SpecDev Goal Plan Frontmatter",
  "type": "object",
  "required": ["schema_version", "artifact", "change", "status", "modes", "ready_for_execution"],
  "properties": {
    "schema_version": {"const": 3},
    "artifact": {"const": "goal-plan"},
    "change": {"type": "string", "minLength": 1},
    "status": {"enum": ["draft", "ready", "in_progress", "completed", "blocked"]},
    "modes": {
      "type": "array",
      "items": {"enum": ["coordination", "migration", "high-assurance", "reference-conformance", "release-coordination"]},
      "minItems": 1,
      "uniqueItems": true
    },
    "ready_for_execution": {"type": "boolean"}
  },
  "additionalProperties": true
}
```

</goal-plan-schema>
