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

Goal Plan 只拥有单个 Ticket 无法独立决定的事情：整体 Outcome、跨 Ticket 顺序与并发、共享所有权、里程碑 Gate、动态派单边界、父分支集成、迁移/发布顺序、偏差升级和恢复。Ticket 继续拥有局部实现合同。

每次 Goal Plan 都采用 `lead-directed`：当前主会话是唯一 Lead，负责计划、SpecDev 状态、Evidence、派单、验收、父分支推进和最终回复。形成 Goal Plan 时必须询问是否开启 worktree 开发，默认不开启；选择写入当前 Goal Plan，不修改全局配置。不开启时 Ticket 严格串行，允许动态派遣 implementation subagent，但同一时间只有一个 implementation owner 可写当前 workspace；开启时沿用每 Ticket 独立 worktree 与 candidate-merge。

产物写入 `specdev/changes/{change}/goal-plan.md`。

## 何时运行

满足任一条件时运行：

- 多个 Ticket 可以或需要并行；
- 存在 shared path、共享合同或集中 owner；
- 存在 Deep Ticket、expand-contract、迁移、兼容窗口或不可逆步骤；
- 存在多个 Gate、外部审批、发布窗口或高事故半径；
- Ticket DAG 的关键路径、汇合点或恢复策略无法由 Tickets Map 安全表达；
- 用户明确要求正式跨 Ticket Plan。

少量、线性、低风险的 Ready Tickets 可以跳过本 work，由 I-implement 按当前 Goal Plan 的 workspace 策略执行。没有 Ticket 的获批小型 Direct Spec 不受 Ticket workspace 合同约束；一旦需要切片，先运行 T-tickets。

## 输入

必须读取：

- `specdev/changes/{change}/spec.md`
- `specdev/changes/{change}/tickets-map.md`
- `specdev/changes/{change}/ticket/`
- `specdev/config.json`

按存在情况读取：

- 当前 change 架构决策：`specdev/changes/{change}/ADR.md`
- 当前 change 领域上下文：`specdev/changes/{change}/CONTEXT.md`
- 当前 change 设计日志：`specdev/changes/{change}/LOG.md`
- 当前 change 诊断：`specdev/changes/{change}/diagnosis.md`
- 永久架构决策：`specdev/adr/`
- 永久领域上下文：`specdev/context/`
- 用户提供的合同、标准、参考实现、环境限制、发布窗口和批准策略。

永久目录可以为空，静默继续。缺少 Spec 或 Tickets Map 时返回 “编写 Spec 阶段” 或 “拆分 Tickets 阶段”；当前 ADR/CONTEXT 缺失且规划依赖对应决定时返回 “设计访谈能力”，不在 Goal Plan 中补造上游权威。

## 流程

### 1. 验证上游与执行边界

加载 下方 `<planning-modes>` 标签：

1. 验证 Spec、Tickets、合同覆盖、DAG、路径所有权和 Deep Ticket 完整性；
2. 只读探索影响调度的代码与项目事实；
3. 识别 migration、high-assurance、reference-conformance、release-coordination 等适用模式；
4. 从 config 读取 `max_implementation_agents` 与 `max_integration_attempts`，将实际值快照到 `implementation_agent_limit` 与 `integration_attempt_limit`；本计划可以降低但不得超过 config 或平台能力，Lead 不计入；
5. 根据 workspace 策略确认实现 commit 与 direct-parent/candidate integration 已获授权；缺一项则计划保持 blocked；
6. 只询问无法发现且会改变 Gate、Wave、owner、迁移、批准或验收的问题。

**完成标准**：所有计划内 Ticket Ready；Lead、授权、实现并发上限和父分支可判定；没有用 Goal Plan 掩盖上游缺口。

### 2. 构建 Outcome、DAG、Wave 与 Gate

加载 下方 `<orchestration-protocol>` 标签：

1. 压缩 Outcome、成功/伪完成、非目标和权威来源；
2. 从 Ticket frontmatter 构建 DAG、关键路径、扇出与汇合点；
3. 为 shared path、共享合同和集中修改指定唯一 owner；
4. 将依赖满足且项目写路径不相交的 Ticket 分入 Wave；current 模式仍按依赖顺序串行执行，不得把 Wave 当作并发授权；
5. 为合同稳定、垂直路径、迁移完成、发布就绪等状态定义 Gate；
6. 为每个 Ticket 记录开始条件、workspace 策略、验证层级、Evidence 目标、集成顺序和失败恢复。

**完成标准**：DAG、Wave、Gate 与 Tickets Map 一致；每个 Ticket 有唯一项目写 owner、worktree 合同和可验证集成出口。

### 3. 固定 Lead 编排与动态派单合同

加载 下方 `<lead-orchestration>` 标签，并以 `operation=plan` 调用 下方 `<subagent-delivery>` 标签：

1. 固定 Lead 的可恢复 owner/session locator；
2. 声明 implementation subagent 的 config/平台约束上限，Lead 不计入；
3. 不为只读 review/research/test-observation agent 写 SpecDev 数字上限；
4. current 模式固定只有一个 implementation writer 写项目路径，Lead 仍是唯一 SpecDev 工件与状态写入者；required 模式 implementation owner 写自己的 Ticket worktree；
5. 定义执行期动态 Dispatch Packet、候选返回和 Lead 验收；
6. provider、模型和具体派单在 Ticket 开始时按事实选择，不在 Goal Plan 中预分配。

**完成标准**：Lead 可以在恢复后重建派单边界；任何 subagent 都不能成为第二个 SpecDev 状态写入者或父分支 integration owner。

### 4. 定义完成、证据与恢复

加载 下方 `<completion-control>` 标签：

1. 定义整体 Definition of Done 和每个 Gate 的关闭证据；
2. 固化不可协商约束与允许的局部实现自由；
3. 按 workspace 策略为每个 Ticket 明确 current-workspace/direct-parent 检查或 source-worktree/parent-candidate 检查；
4. E2E 按 Ticket 实际跨边界风险标记 required 或 not-required；
5. 定义 direct-parent 验证失败、candidate 冲突/失败、父 HEAD 漂移、偏差、暂停、批准和恢复动作；
6. 定义 change 完成、远程 reconcile、残余风险和回滚要求。

**完成标准**：每个完成声明映射到不可变 commit、候选/父分支 SHA、命令、Evidence 或人工批准。

### 5. 写入、同步与验证

使用 下方 `<goal-plan-template>` 标签 写入 Goal Plan：

1. 只保留适用 planning modes，不创建条件性 topology addendum；
2. 将 Wave、Gate 和 owner 投影同步到 Tickets Map；
3. 对照 下方 `<goal-plan-schema>` 标签；
4. 运行：

```bash
node Speculo Node 校验器 \
  --stage goal-plan \
  specdev/changes/{change}
```

5. 原子更新 Goal Plan、Tickets Map、全局/current change 状态并重新读取；
6. 向用户报告 Outcome、关键路径、Wave/Gate、Lead、实现 agent 上限、shared owner、E2E disposition、迁移与主要风险；
7. 未经用户要求，不自动进入实现。

## 决策完备标准

每份 Goal Plan 必须让 Lead 无需重新决定：

- Outcome、权威来源和整体完成；
- 跨 Ticket 先后、Wave、Gate 和关键汇合点；
- shared path 与共享合同 owner；
- implementation subagent 上限及动态派单边界；
- 每 Ticket workspace、implementation commit、对应验证和父分支推进规则；
- E2E disposition、偏差、暂停、批准和恢复路径。

Goal Plan 不复制 Ticket 的局部施工路线、全部文件预测或逐项验收清单。

## 完成标准

- Goal Plan schema v6 且 `ready_for_execution` 与状态一致；
- Lead 唯一，implementation subagent 上限来自 config/平台能力，review/research agent 不受 SpecDev 数字限制；
- 每个实现 Ticket 都有 workspace、commit、对应 integration gate 和 Evidence 出口；
- current 模式不创建 source/candidate worktree，适用 E2E 由 Lead 在 current workspace 运行；required 模式保持 source/parent-candidate 边界；
- 计划只保留当前固定 Lead 与选定 workspace/integration 合同；
- validator 无 error，Tickets Map 投影同步，用户收到下一步选择。

## 子文件引用

- 规划模式与输入门禁：下方 `<planning-modes>` 标签
- DAG、Wave、Gate 与集成队列：下方 `<orchestration-protocol>` 标签
- Lead 与动态派单：下方 `<lead-orchestration>` 标签
- 完成、证据与恢复：下方 `<completion-control>` 标签
- Goal Plan 模板：下方 `<goal-plan-template>` 标签
- Agent 交付合同：下方 `<subagent-delivery>` 标签

---

## 参考内容

以下内容均已内联。主流程提到标签时，直接使用对应标签中的完整规则、模板或 schema。

<planning-modes>

# Goal Plan 规划模式与输入门禁

规划模式描述 Goal Plan 需要额外解决的工程问题。Goal Plan 创建时单独询问 Ticket 是否开启 worktree，默认使用当前 workspace；worktree 与 direct-parent/candidate-merge 由该次 Goal Plan 固定。

## 1. 输入门禁

开始规划前穷尽检查：

- Spec `ready_for_tickets: true`，或上游工件已等价覆盖范围、合同与验收；
- Tickets Map 与全部 Ticket 存在、Ready、DAG 无环；
- 每个验收合同被 Ticket 覆盖；
- writable/shared path 有唯一 owner，Wave 候选无写冲突；
- config schema v5，`max_implementation_agents` 与 `max_integration_attempts` 为正整数；原型变体范围读取 planning 配置；
- 父分支可定位，implementation commit 与本地 integration 已获授权；
- Deep Ticket 的迁移、兼容、监控、恢复和不可逆批准点完整。
- Ticket 与 `specdev/changes/{change}/spec.md`、`specdev/changes/{change}/ADR.md`、`specdev/adr/`、`specdev/context/` 和当前代码事实不存在未处理冲突；
- 项目声明的验证命令真实存在，并能观察目标行为；不可运行项有替代证据或明确 blocker；
- 当前源码基线、父分支、工作区状态和现有用户改动已经实测；
- 外部合同、标准、参考实现或依赖版本已经固定，不使用浮动的“最新”描述。

缺失上游事实返回其 owner；非 v5 Goal Plan 必须按当前合同重新规划，不能只修改版本号。

## 2. 可组合模式

- `migration`：存在 expand-contract、数据/协议迁移、兼容窗口或收缩条件；
- `high-assurance`：涉及安全、隐私、资金、数据完整性、法规、关键基础设施、不可逆操作或高事故半径；
- `reference-conformance`：必须逐项符合外部标准、协议、设计或参考实现；
- `release-coordination`：存在发布窗口、跨团队依赖、外部批准、阶段部署、观察期、运营交接或远程 reconcile。

没有适用模式时 `modes: []`。模式只增加对应 Gate、证据和恢复，不改变 Lead、worktree 或集成基本合同。

## 3. Goal Plan 工作区选择

- 创建 Goal Plan 时询问“是否开启 worktree 开发？”，默认 `否`；
- 用户选择 `否` 时写入 `ticket_workspace_policy: current` 与 `integration_gate: direct-parent`；
- 用户选择 `是` 时写入 `ticket_workspace_policy: required` 与 `integration_gate: candidate-merge`；
- 该选择只作用于当前 Goal Plan，不读取或修改全局配置；
- `current` 模式下所有 Ticket 必须串行，并持有唯一 implementation writer 锁；
- `required` 模式继续使用每 Ticket source worktree 和 Lead-owned candidate integration；
- `orchestration` 固定为 `lead-directed`；implementation agent 与 integration attempt 上限读取 config，并可在本计划中进一步降低。

## 4. Ready 停止条件

存在以下任一情况时 `ready_for_execution: false`：

- Goal Plan 工作区选择未记录；
- `current` 模式下 Ticket 无法串行排序或当前 workspace 不是唯一项目写入 owner；
- `required` 模式下 Ticket 无法建立独立 worktree 或父分支不明确；
- 当前模式所需的 implementation commit 或 direct-parent/candidate integration 授权缺失；
- shared path 没有唯一 owner；
- E2E 是否需要会改变验收结论但尚未确定；
- 项目验证命令不能执行或无法观察目标行为，且没有批准的替代证据；
- 当前源码/工作区基线未实测，或外部合同版本仍然浮动；
- Ticket 与 Spec、ADR、`specdev/adr/`、`specdev/context/` 或代码事实存在未处理冲突；
- 迁移、发布、不可逆动作或恢复存在高影响未知项；
- 实现 agent 或 integration attempt 上限超过 config 或平台能力。

## 5. 固定执行拓扑

- `orchestration: lead-directed`；
- `ticket_workspace_policy: current | required`；
- `integration_gate: direct-parent | candidate-merge`；
- `current` 与 `direct-parent` 必须成对；`required` 与 `candidate-merge` 必须成对；
- `implementation_agent_limit` 不大于 config 与平台能力；`integration_attempt_limit` 不大于 config；current 模式保持单 writer 串行安全不变量；
- Lead 不计入 implementation subagent 数量；
- review/research/test-observation agent 无 SpecDev 固定数字上限，但必须保持只读且不竞争同一可变环境；
- provider 与派单在执行期决定，不成为 Goal Plan 的静态枚举。

**完成标准**：所有固定字段、适用模式、授权、Lead、父分支和阻塞均可验证；没有替代编排模型或空占位。

</planning-modes>

<orchestration-protocol>

# Goal Plan 核心编排协议

本文件定义 DAG、Wave、Gate、路径所有权、Ticket workspace 策略、Evidence 返回和父分支集成队列。

## 1. DAG 与关键路径

- 依赖权威来自 Ticket frontmatter 的 `blocked_by`；Tickets Map 是投影；
- 计算根节点、扇出、汇合点、关键路径、共享合同 owner 和最终收缩点；
- 依赖只表示真实开始条件，不表达偏好、Agent 交接或“最好先做”；
- 无法独立保持可验证状态的迁移批次必须有明确 Gate 和恢复策略。

## 2. Wave 与实现并发

required 模式的 Wave 内 Ticket 必须 Ready、依赖 Evidence 完整、项目写路径不相交、shared owner 已稳定、适用 Gate 已打开且基线一致。current 模式即使 DAG 存在可并行节点，也强制一次只执行一个 Ticket。

Lead 根据当前事实决定自行实现或派单。required 模式同时活跃的 implementation subagent 不得超过 Goal Plan、config 与平台能力的共同上限；current 模式保持单 writer 串行安全不变量。Lead 不计入。Wave 是可并发性，不是必须填满的目标。只读 review/research/test-observation agent 不写固定数字上限，但不得写项目或 SpecDev 状态，也不得争用同一可变测试环境。

## 3. Gate

Gate 用可验证状态定义，必须写明：工程/业务状态、开启条件、关闭证据、阻塞范围、Lead/批准人和失败恢复。常见 Gate 包括共享合同稳定、首条垂直路径、迁移完成、旧调用点归零、候选合并通过、发布就绪和观察期结束。

## 4. Shared path 与合同

遵循 下方 `<path-ownership>` 标签：

1. 专用 owner Ticket 修改共享路径；
2. required 模式在其 source worktree 形成 commit 与非 E2E 证据；current 模式在当前 workspace 形成 commit 与证据；
3. required 模式通过 Lead candidate-merge 进入父分支；current 模式由 Lead 在父分支 direct-parent 验证并推进；
4. required 模式下游 Ticket 基于新的父分支 checkpoint 创建或刷新 worktree；current 模式仅在前一 Ticket 完成后开始下一个；
5. 共享合同变化时暂停消费者并修订上游，不让多个执行者竞争写入。

## 5. 每 Ticket workspace 记录

每个进入 I-implement 的 Ticket 建立唯一记录。current 模式使用 `workspace_ref=current`、`branch=parent_branch`，记录 implementation/source/result SHA 与 direct-parent 验证；required 模式使用唯一 `specdev-worktree/<ticket-id>`，记录 source/candidate/result SHA 与验证状态。Lead 自行实现或派 subagent 不改变所选策略。

required 模式同一 Ticket 在 candidate 验证失败后保留来源 worktree 并继续修正。新的 source commit 替换当前 `source_checkpoint`，旧 commit 继续由 Git/Evidence 可追溯。成功集成不自动清理 branch/worktree。

## 6. 父分支集成队列

required 模式 Lead 串行集成 Ready 候选：

1. 冻结最新 `parent_before_sha`；
2. 在 Lead-owned parent integration checkout 组合父分支与 `source_checkpoint`；
3. 生成可定位的 `candidate_sha`；
4. 在 candidate 状态运行集成检查和适用 E2E；
5. 重读父 HEAD；若变化，将候选标记 `stale` 并重建；
6. 检查通过且父 HEAD 未变时，父分支 fast-forward 到 candidate；
7. 重读父 HEAD/tree，写入 `result_sha` 后才允许 Ticket Done。

父分支是 source checkpoint 的祖先时 candidate/result 可等于 source SHA，方法为 `fast-forward`；否则 candidate 必须是独立 merge commit。候选失败时父分支保持不变，Ticket 回到 `in_progress` 或 `blocked`。current 模式跳过候选 checkout，Lead 在 current workspace 核对 implementation commit、运行集成检查并记录 `method=direct-parent`；失败时父 HEAD 不推进。

## 7. Expand-contract

标准顺序为 expand → migrate → observe → contract → verify。每批迁移独立 commit、按所选策略验证和父分支集成；收缩依据旧调用/数据/协议归零证据，不依据 Ticket 数量推断。

**完成标准**：每个 Ticket 从父基线、implementation/source commit、对应 integration 到 result 都可恢复；父分支只包含已通过所选门禁的 Ticket。

</orchestration-protocol>

<lead-orchestration>

# Lead 编排与动态派单协议

## 1. 唯一 Lead

Lead 是主会话中的唯一编排 owner，保留需求解释、DAG/Wave/Gate、路径分配、权限、SpecDev 状态、Evidence、候选验收、父分支集成和最终回复责任。恢复时以 Goal Plan 的 `lead` locator 和权威工件继续；更换会话只转移 Lead 身份，不产生第二写入者。

## 2. 派单类型

- **implementation**：写入 Goal Plan 选择的 current workspace 或 Ticket worktree 的授权项目路径，运行非 E2E 检查并返回 implementation/source commit；
- **review**：只读审查固定 checkpoint，返回 findings；
- **research**：只读收集代码或外部事实，返回来源与结论；
- **test-observation**：只读运行或观察已授权检查，返回命令与结果，不拥有 E2E Gate。

Lead 在 Ticket 可以独立执行、写路径不冲突、上下文足够且平台支持时派单。派单是执行期决定，不写回 Goal Plan 作为固定拓扑。

## 3. 并发

required 模式 implementation subagent 上限取 Goal Plan、config 与平台能力的最小值；current 模式保持单 writer 串行安全不变量；Lead 不计入。review/research/test-observation agent 不设置 SpecDev 数字上限，但 Lead 必须避免测试资源冲突、重复工作和上下文失控。

## 4. 写入边界

implementation subagent 只写分配的 current workspace 或 worktree 中的项目路径和其 Git commit，不写 Ticket、Map、Goal Plan、Evidence、change status 或父分支。current 模式 commit 直接落在 parent branch；required 模式 commit 落在 source branch。其他 subagent 全部只读。Lead 接收返回后独立核对，再写所有 SpecDev 状态。

## 5. 动态 Dispatch Packet

每次派单必须绑定 Ticket、Goal Plan、依赖 Evidence、不可变 `base_sha`、branch/workspace locator、workspace strategy、writable/read-only/shared paths、provider、允许动作、非 E2E 验证、停止条件和返回格式。provider 或模型按当次能力与授权选择；外部 provider 需要独立的数据发送授权。

implementation 返回至少包含：Ticket ID、workspace locator、最终 commit、dirty 状态、修改路径、检查命令/结果、未验证项、冲突与阻塞。review/research 返回固定输入、findings、来源和未验证声明。

## 6. Lead 验收

Lead 核对基线、路径、commit、dirty 状态、项目事实与非 E2E 结果；不接受 subagent 自报的 Evidence 或 E2E pass。required implementation 候选进入 dev-worktree candidate-merge；current implementation 由 Lead 在同一 parent branch/current workspace 做 direct-parent 验证。read-only 结果由 Lead 复核后写入对应权威工件。失败返回同一 workspace/worktree 修正或标记 blocked。

**完成标准**：每次写入只有一个 Ticket/owner/worktree；所有 SpecDev 状态由 Lead 落盘；派单和返回可从 Evidence 恢复。

</lead-orchestration>

<completion-control>

# Goal Plan 完成、证据与恢复

## 1. 整体 Definition of Done

至少要求：

- Spec 验收合同全部有通过 Evidence 或明确批准的 deferred；
- current 模式的非 cancelled Ticket 都有 implementation commit、通过的 direct-parent 验证和父分支 result SHA；required 模式都有 source commit、通过的 candidate 和父分支 result SHA；
- shared path、接口、数据、兼容、迁移、调用点与回滚合同闭合；
- 项目定向检查、受影响回归、类型检查、lint/build 和适用 E2E 无未经批准退化；
- change 状态、Ticket、Map、Goal Plan、Evidence 与实际 Git 状态一致；
- 没有未集成 implementation/source checkpoint、活动 integration candidate 或未决高影响偏差。

无需改动的 Ticket 必须转为 `cancelled` 并记录来源事实；不得用 Evidence-only Done 或 empty commit 关闭。

## 2. 两层验证

- `current-workspace`：current 模式 implementation owner 运行 Ticket 要求的检查，Lead 在同一 workspace 运行受影响集成/回归和适用 E2E；
- `source-worktree`/`parent-candidate`：required 模式由 implementation owner 和 Lead 分别运行非 E2E 与集成/E2E 检查。

Evidence 必须记录命令运行环境。required 模式任何在 source worktree 声称的 E2E pass 都无效；subagent 返回的测试结果在 Lead 核对前保持候选状态。

## 3. Gate 关闭

Lead 在每个 Gate 汇总覆盖 Evidence、接口/数据/兼容状态、candidate/result SHA、适用 E2E、反向验证、偏差、风险和批准。Gate 不以“完成若干 Ticket”作为唯一关闭条件。

## 4. 失败与恢复

- current/source 检查失败：保留当前 workspace 或 source worktree，继续当前 Ticket；
- direct-parent/candidate 冲突或检查失败：父分支不动，integration 记 `failed`，Ticket 回到 `in_progress`/`blocked`；
- 父 HEAD 漂移：integration 记 `stale`，从最新父分支重建并重跑；
- E2E required 失败：父分支不动，保留失败命令、适用 checkpoint 和恢复条件；
- 命中当次 Dispatch Packet/候选协议的停止条件、继续修正已无合理收益或需要新产品决定：停止受影响 Wave，按 deviation control 返回契约 owner；
- Lead 会话变化：读取 Goal Plan、Ticket、change worktree 状态与最新 Evidence，从最后不可变 checkpoint 恢复。

## 5. Change 完成 owner

Lead 是 Goal Plan change 的唯一完成 owner。没有 Goal Plan 的单 Ticket/Direct Spec 由当前 I-implement owner 按 change completion 规则完成。Archive 不补造完成证据。

**完成标准**：所有通过、阻塞、取消和未验证声明均定位到权威工件、命令与 Git checkpoint；失败不会推进父分支或 Done。

</completion-control>

<goal-plan-template>

## 产物 YAML 头部

生成该工件时，将以下字段写在文档开头的 YAML frontmatter 中：

```yaml
schema_version: 6
artifact: goal-plan
change: <YYYY-MM-DD-topic>
status: draft
modes: []
orchestration: lead-directed
lead: <owner-or-session-locator>
implementation_agent_limit: 3
integration_attempt_limit: 3
ticket_workspace_policy: current
integration_gate: direct-parent
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

### Success and False Completion

### Non-goals

### Authoritative Inputs

| 优先级 | 来源 | 负责内容 | 冲突处理 |
|---|---|---|---|
| 1 | 用户最新明确决定 | 产品取舍与批准 | 更新真正拥有该决策的工件 |
| 2 | `specdev/changes/{change}/ADR.md` 与 `specdev/changes/{change}/CONTEXT.md` | 当前 change 架构决定与领域语义 | 返回 “设计访谈能力” 更新真正 owner |
| 3 | `specdev/adr/` 与 `specdev/context/` | 已毕业的永久决定与领域知识 | 当前 change 替代时在 `specdev/changes/{change}/ADR.md` 与 `specdev/changes/{change}/LOG.md` 明示 |
| 4 | `specdev/changes/{change}/spec.md` | 外部行为、范围与验收 | 下游不得改写 |
| 5 | `specdev/changes/{change}/ticket/` | 单 Ticket 契约 | Goal Plan 只编排 |
| 6 | `specdev/changes/{change}/diagnosis.md` 与当前代码/运行事实 | 已验证根因、现状与可行性 | 冲突时触发偏差并返回真正 owner |

## 2. Execution Graph

### DAG and Critical Path

```text
...
```

### Waves and Ownership

| Wave | Ticket | 前置条件 | 项目写路径 | Shared owner | Gate/集成序号 |
|---|---|---|---|---|---|

### Ticket Quick Reference

| ID | 可观察产出 | Dependencies | Workspace | Implementation owner | E2E disposition | Evidence |
|---|---|---|---|---|---|---|
| T-01 | ... | — | `current`（required 模式为 `specdev-worktree/<change>/T-01`） | Lead / dynamic dispatch | required / not-required: reason | `specdev/changes/{change}/evidence/T-01.md` |

## 3. Gates and Completion Evidence

### Overall Definition of Done

### Gates

| Gate | 开启条件 | 关闭证据 | 阻塞范围 | Lead/批准人 | 失败恢复 |
|---|---|---|---|---|---|

### Contract and Reference Coverage

| 合同或参考要求 | 覆盖 Ticket | 验证接缝 | Evidence | 状态 |
|---|---|---|---|---|

## 4. Execution and Integration Protocol

### Lead Orchestration

| 项目 | 决定 | 事实依据 |
|---|---|---|
| Lead | `<owner-or-session-locator>` | 唯一 SpecDev 状态、Evidence 与父分支 owner |
| Implementation subagents | `<implementation_agent_limit>`，Lead 不计入 | Goal Plan 快照、依赖和平台能力的最小值 |
| Integration attempts | `<integration_attempt_limit>` | Goal Plan 创建时从 config 快照 |
| Read-only agents | 无 SpecDev 数字上限 | review/research/test-observation，不写状态 |
| Dispatch | execution-time dynamic | provider/模型/派单按 Ticket 事实选择 |

### Ticket Workspace and Integration

| Ticket | Parent/base | Workspace/branch | Source checks | Implementation commit | Integration checks/E2E | Parent result |
|---|---|---|---|---|---|---|

当 `ticket_workspace_policy: current` 时，Ticket 必须严格串行。Lead 每次只允许一个 implementation owner 写入当前 workspace；完成非 E2E 检查并形成 commit 后，Lead 在同一父分支/current workspace 运行适用集成检查和 E2E，验证通过后将该 Ticket 的 `result_sha` 记录为其 implementation commit，再开始下一个 Ticket。不得创建 source/candidate worktree。

当 `ticket_workspace_policy: required` 时，Ticket 使用独立 source worktree；source worktree 不运行 E2E，Lead 在最新父分支的 candidate 状态运行集成检查和适用 E2E，通过且父 HEAD 未漂移后才推进父分支。

### Authorization Matrix

| 动作 | 状态 | 目标与条件 |
|---|---|---|
| Current workspace Ticket changes | allowed / not-authorized | 仅 current 模式；严格串行，单一 implementation writer |
| Ticket worktree local changes | allowed / not-authorized | 仅 required 模式；限 writable/shared owner 合同 |
| Implementation commit | allowed / not-authorized | 每 Ticket 必需；缺失则 Plan blocked |
| Local direct-parent verification and parent update | allowed / not-authorized | 仅 current 模式；Lead 核对 Ticket commit 后继续 |
| Local candidate integration and parent update | allowed / not-authorized | 仅 required 模式；Lead-only；缺失则 Plan blocked |
| Push / PR / remote merge | allowed / not-authorized | 不从本计划本地授权继承 |
| Branch/worktree cleanup | allowed / not-authorized | 成功集成不自动继承 |
| Deploy / migration / production actions | allowed / not-authorized | 逐动作、目标和条件 |

### Evidence Return

subagent 只返回候选事实与 commit；Lead 独立核对并写 Evidence、状态和最终验收。

## 5. Constraints, Risk and Recovery

### Non-negotiable Constraints

### Verification Integrity

记录判卷接缝、基线、禁止的伪绿色方式，以及 current/direct-parent 或 source/candidate 两层验证边界。

### Migration or Release Sequence

### Risks, Monitoring and Recovery

### Deviation Control

遵循 下方 `<deviation-control>` 标签。

## 6. Progress and Decisions

### Current Status

记录 Wave/Gate、Ticket、implementation/source、适用 candidate 和 result SHA、最近验证和未验证项；不使用主观百分比。

### Pending Decisions and Blockers

### Resume Protocol

恢复时读取 Goal Plan、当前 Ticket、change workspace 状态和最新 Evidence；从最后通过的父分支 result 或待修正 implementation/source checkpoint 继续。

## Assumptions

只记录低影响且可验证的假设。存在高影响假设时 `ready_for_execution` 必须为 `false`。

</goal-plan-template>

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

<change-completion>

# Change Completion

本规则是 change 从 active/blocked 转为 completed 的唯一合同。

## 完成门

一个 change 只有同时满足以下条件才能 completed：

1. 所有计划内 Ticket 为 done，或因权威事实无需改动而记录为 cancelled；Direct Spec/非实现流程有等价验收。
2. required Ticket 有 source commit、passed candidate、父分支 result SHA，且父分支包含 source commit；current Ticket 有 implementation commit、passed direct-parent 验证和父分支 result SHA；对应 workspace 记录均为完成状态。
3. 每个行为有 Lead Evidence，全部 Spec 合同与 Goal Gate 可定位。
4. current Ticket 的 current-workspace 检查/回归和适用 E2E，或 required Ticket 的 source-worktree 非 E2E 检查、parent-candidate 集成/回归和 required E2E 已通过；not-required 有理由。
5. 迁移、发布、监控、恢复和不可逆批准已完成或明确不适用。
6. 没有未批准 deviation、blocker、unverified、活动 candidate 或未集成 source checkpoint。
7. Ticket、Map、Goal Plan、Evidence、change status 与实际 Git 一致。

Evidence-only Done 和 empty commit 不满足完成门。

## 转换 Owner

- 有 Goal Plan：其唯一 Lead 在关闭最后 Gate 后拥有转换；
- 无 Goal Plan 的 Ticket/Direct Spec：当前 I-implement 主会话 owner 拥有转换；
- 非实现型终点：最终验收工件 owner 使用本规则。

Owner 原子更新 `specdev/changes/{change}/.status.json` 的 `change_status`、`completed_at`、`updated_at` 和 `current_work`，然后重读。全局 status 只维护 active/archived 索引。

## 远程来源与归档

远程动作不参与本地完成判定。Triage 为 `pending-close`/`close-failed` 时先 reconcile；`closed`、`waived` 或 `not-applicable` 才允许 Archive。归档后工件只读。

**完成标准**：完成声明可由本地工件、Git 与验证重建；只有一个 owner 命中；失败 candidate 不污染父分支。

</change-completion>

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

本 Skill 由 T-tickets/P-goal-plan/I-implement 和 P-prototype 复用。`purpose=ticket` 仅在 Goal Plan 选择 `required` 时使用完整 source → candidate → parent 状态机；`current` Ticket 不调用本 Skill。`purpose=prototype` 只使用调用方批准的临时生命周期。

## 输入

- `operation=create | restore | finalize | remove`；
- `purpose=ticket | prototype`；
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

`operation=remove` 先验证 Ticket 已 `integrated` 或 prototype 已结束、目标 worktree clean、checkpoint 可恢复且删除目标精确。只有明确 cleanup 授权时删除来源 branch/worktree；强制删除需要单独确认。删除后重读 `git worktree list` 与 refs，并只把调用方生命周期状态更新为 `removed`；`base_sha`、source checkpoint、candidate/result、验证、E2E 与 Evidence 字段必须原样保留。

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

Prototype 只要求调用方已记录本次临时 branch/worktree 授权、问题、owner、locator 和清理策略；它不写 Ticket worktree 状态。

## 创建 Ticket 来源 worktree

1. 重读父分支 HEAD、工作树、现有 worktrees 与 refs；父 HEAD 与计划基线不一致时由 Lead决定更新 `base_sha` 或阻塞；
2. 固定 branch `speculo/<change>/<ticket-id>` 与 locator `specdev-worktree/<ticket-id>`；
3. 确认目标 branch/path 不存在，或其实际记录精确匹配当前 Ticket；
4. 从 `base_sha` 创建 Git worktree，不复用其他 Ticket/原型目录；
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

<subagent-delivery>

# Subagent Delivery

本 Skill 被 P-goal-plan 与 I-implement 调用。它不选择是否使用 Lead 模式：Lead 是固定外层 owner；本 Skill 只保证每次动态派单可恢复、可验收且不产生第二个 SpecDev 状态写入者。

## 输入

所有调用都必须提供 `operation=plan | dispatch | accept` 与 Lead owner/session locator。其余输入按 operation 判定，不得把后续阶段事实反向要求给 `plan`：

- `operation=plan`：提供允许的 `task_kind` 集合、implementation subagent 上限、Lead/SpecDev/父分支/E2E 所有权和通用授权边界；Goal Plan 此时可以尚未写入，不要求 Ticket、provider、checkpoint 或 workspace；
- `operation=dispatch`：提供 `task_kind=implementation | review | research | test-observation`、已存在 Goal Plan（若有）、Ticket/固定审查目标、依赖 Evidence、适用合同、repository、不可变 checkpoint、项目 Agent 指令、workspace/session locator、provider、允许动作、路径边界、检查、停止条件与返回格式；
- `operation=accept`：提供原 Dispatch Packet、subagent 返回、当前 repository/workspace、预期与实际 checkpoint，以及 Lead 可用于独立核对的 Git/命令事实。

`operation=dispatch` 且 `task_kind=implementation` 时，必须提供 Goal Plan 的 workspace strategy、branch、`base_sha`、writable/shared owner、implementation commit 授权与对应检查。`required` 必须提供独立 Ticket worktree 和 source-worktree 非 E2E 检查；`current` 必须提供 `workspace_ref=current`、parent branch 和 current-workspace 串行锁。缺失时返回 blocked，不推断策略或并发权限。

## 1. 固定 Lead 与任务类型

Lead 保留需求解释、DAG/Wave/Gate、shared owner、权限、SpecDev 工件、Evidence、candidate-merge、父分支和最终回复。subagent 不写 Ticket、Map、Goal Plan、Evidence、change status 或父分支。

- implementation 可以在 required 模式写唯一 Ticket worktree，或在 current 模式按串行锁写当前 workspace，并在授权时创建实现 commit；
- review/research/test-observation 只读，返回 findings、来源或命令观察；
- E2E Gate 永远由 Lead 拥有，不能派给 implementation 或只读 agent；required Ticket E2E 在 parent-candidate 状态执行，current Ticket 和 Direct Spec E2E 在 Lead-owned current workspace 执行。

**完成标准**：Lead、task kind、写入边界和 E2E owner 唯一。

## 2. 锁定基线、provider 与授权

记录 repository、branch、`base_sha`/固定审查 SHA、workspace/session locator 和 provider。GitHub 是源码事实来源时加载 下方 `<subagent-delivery-github-checkpoints>` 标签；需要向外部 provider 发送附件或私有上下文时，取得发送授权后加载 下方 `<subagent-delivery-source-package>` 标签。

授权逐动作记录：worktree local changes、implementation commit、外部内容发送、push、PR、remote merge、deploy、migration 和 production actions。Goal Plan 的本地 commit/integration 授权不扩展到远端、清理或生产动作。

**完成标准**：每个可变输入绑定 checkpoint；provider 只接收已授权范围；未授权动作不可执行。

## 3. 生成动态 Dispatch Packet

`operation=plan` 时只返回通用 Lead delivery contract，不读取尚未生成的 Goal Plan，也不为 Ticket 预分配 agent/provider。

`operation=dispatch` 时为单次任务生成 Packet：目标、IN/OUT、已锁定决定、固定输入、workspace、writable/read-only/shared paths、允许动作、必跑检查、禁止在 source worktree 运行 E2E、停止条件和返回字段。

- 原生 Agent：加载 下方 `<subagent-delivery-native>` 标签；
- 外部网页 Agent：加载 下方 `<subagent-delivery-external-web>` 标签。

implementation Packet 必须适合一个上下文独立完成；required 模式多个 implementation subagent 由 Lead 控制在 Goal Plan、config 与平台能力共同上限内，current 模式保持单 writer 串行。只读 agent 不设置 SpecDev 数字上限，但不得争用可变环境。

**完成标准**：Packet 可独立投递；目标、checkpoint、路径、权限、检查和返回均可判定。

## 4. 接收与验收候选

`operation=accept` 时，Lead 核对 Packet、当前父/来源基线、实际路径、dirty 状态、commit 可达性、命令输出和未验证项。外部声明、截图、provider 自报测试和推断保持 `unverified`，直到 Lead 在本地复核。

implementation 返回必须包含 Ticket ID、workspace locator、最终 commit、dirty 状态、修改路径、非 E2E 检查、失败/未运行项和恢复条件。review/research/test-observation 返回固定输入、findings、来源、命令与未验证声明。Lead 把验收结果写入调用方拥有的 Evidence/状态。

**完成标准**：每个 pass 有 Lead 可复查事实；candidate 未被误写为 Done 或父分支结果。

## 5. 修正与恢复

修正继续使用同一 Ticket 与 worktree，基于最后 source checkpoint 生成新 commit。基线或父分支漂移时由 Lead 暂停派单、重算影响并更新 Packet；契约冲突返回拥有该决定的工件。Lead 可以按当次风险在 Dispatch Packet 中定义停止条件，但 SpecDev 不推断全局修正次数；继续修正已无合理收益或需要上游决定时，返回 blocked、最后可信 checkpoint、失败命令和恢复条件。

**完成标准**：恢复不重新决定已锁定事项；每次候选都有唯一 checkpoint 和明确 owner。

</subagent-delivery>

<subagent-delivery-native>

# Native Subagent

Lead 可以直接创建和管理隔离 Agent 时加载。

## 派单

Lead 为每个 Agent 发送一个完整 Dispatch Packet。implementation Agent 只进入 Goal Plan 指定的 current workspace 或 Ticket worktree；review/research/test-observation Agent 只读取固定输入。并行前核对 Ticket 依赖与 writable/shared path，不以“不同 Agent”代替路径隔离。

Packet 对 implementation 明确：

- Ticket、Goal Plan、依赖 Evidence 与 `base_sha`；
- branch、portable `workspace_ref`、writable/read-only/shared paths；
- 允许当前策略下的 workspace changes 与 implementation commit；
- 单元、组件、静态、类型、lint/build 等适用非 E2E 检查；
- E2E 由 Lead 在 current workspace 或 parent-candidate 状态执行；
- 越界、合同冲突、基线漂移和无法提交时立即停止。

## 返回

implementation Agent 返回 Ticket ID、workspace locator、最终 commit、`git status`、修改路径、命令/结果、未运行项、冲突和恢复条件，不写 SpecDev Evidence。只读 Agent 返回固定 checkpoint、findings、来源、命令观察和未验证项。

Lead 重读 workspace、验证 commit 可达且 tip 一致、检查实际 diff 与路径合同，再决定接受、修正或 blocked。接受的 implementation 结果按 Goal Plan 进入 direct-parent 或 candidate-merge；只读结论由 Lead 写入对应权威工件。

**完成标准**：原生 Agent 的写入与返回均绑定一个 Packet；Lead 可以独立复现其事实声明。

</subagent-delivery-native>

<subagent-delivery-external-web>

# External Web Subagent

用户已授权目标 provider 与发送内容范围，且外部网页模型能为当前任务提供实际价值时加载。外部会话永远返回候选，不拥有本地 worktree、commit、SpecDev 状态或 E2E Gate。

## 能力与数据门

先确认 provider 能接收的文件、大小、会话恢复、输出格式和数据保留边界。需要源码包时加载 source-package reference，排除凭据、真实用户数据、运行时状态和无关代码；记录 locator、hash 与 checkpoint。能力或授权不足时改用原生/Lead 执行，不降低合同。

## 投递与返回

Packet 固定目标、范围、合同、checkpoint、路径边界、非 E2E 验证要求和停止条件。外部 provider 返回 patch/文件、修改清单、推理摘要、模拟或自报测试、未验证项和会话 locator。

Lead 在 Goal Plan 指定的 current workspace 或 Ticket worktree 中核对附件 hash、应用候选、检查 diff、依赖与锁文件、运行本地非 E2E 检查并创建 implementation commit。外部自报结果、截图或模拟保持 `unverified`；适用 E2E 由 Lead 在 current workspace 或 parent-candidate 状态运行。

## 修正与恢复

修正轮绑定新的源码 checkpoint 或 candidate hash，不覆盖旧附件。会话无法恢复、输出越界或 contract 冲突时停止并保留最后可信包、失败证据和恢复条件。

**完成标准**：发送范围有授权且可审计；本地 commit 与验收完全由 Lead 拥有；外部声明不被当作通过证据。

</subagent-delivery-external-web>

<subagent-delivery-github-checkpoints>

# GitHub Checkpoint

GitHub 仓库、Issue、PR 或分支是源码事实来源时加载。所有派单、源码包、修正和验收绑定精确 commit SHA，不使用浮动的“最新代码”。

## 建立基线

1. 解析 repository、目标 branch、remote、访问身份和获授权写入目标；
2. 使用非 shallow clone，或证明现有 clone 具备任务所需历史；
3. 读取项目 Agent 指令、构建清单、锁文件、CI 和相关源码/测试；
4. 记录 local HEAD、tracking ref、远程 SHA 和工作区状态；
5. 工作区有受保护改动时使用独立 worktree 或经批准的 checkpoint，不覆盖现有改动。

```text
REPO_CHECKPOINT repository=<owner/repo> branch=<branch>
local_head=<sha> tracking_head=<sha> remote_head=<sha>
working_tree=<clean|protected-changes> kind=<baseline|local|pushed|verified>
```

## 漂移与远程动作

远程推进后先比较旧、新 SHA 的改动路径和影响，再决定重放、重派或拒绝旧交付。commit、push、PR、merge 各自只在授权矩阵允许时执行；远程写入后重新读取远程 SHA，并在本地与远程一致时建立下一 checkpoint。

**完成标准**：每轮交付对应唯一 SHA；远程漂移和受保护改动不会静默改变基线。

</subagent-delivery-github-checkpoints>

<subagent-delivery-source-package>

# Source Package

外部 Agent 需要固定附件、私有上下文或受保护的未提交改动，且用户已授权目标 provider 与内容范围时加载。包位于调用方授权的临时位置；SpecDev 只在 Goal Plan 或 Evidence 记录可迁移 locator、manifest 摘要和 hash。

## 范围与排除

包应包含理解、修改和验证 Ticket 所需的最小完整源码、直接依赖、构建配置、锁文件、schema、测试、项目 Agent 指令，以及 Spec/Ticket/ADR/CONTEXT 的相关摘录。

排除版本控制内部数据、依赖缓存、构建产物、日志、数据库、转储、浏览器状态、真实用户数据、环境文件、token、cookie、私钥、证书私钥、验证码和恢复码。环境说明只保留无真实值的示例。

## 生成与核对

优先从已提交 checkpoint 生成；包含受保护工作区改动时，manifest 必须列出基线和差异范围。使用仓库已有或可用的密钥扫描器，随后验证包可解压、文件清单、字节数和 SHA-256。

Manifest 至少记录 repository、branch、checkpoint、工作区状态、包 locator、size、SHA-256、secret scan、included、excluded 和 workspace diff。源码变化后生成新 locator 和 hash，不覆盖旧包或沿用旧 manifest。

**完成标准**：包可完整读取，来源与范围可复现，不包含凭据、运行状态或真实用户数据。

</subagent-delivery-source-package>

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
    "ui_prototype_default_variants": 3,
    "ui_prototype_max_variants": 5
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
      "required": ["default_depth", "require_ready_gate", "require_evidence", "ui_prototype_default_variants", "ui_prototype_max_variants"],
      "properties": {
        "default_depth": {"enum": ["lite", "standard", "deep"]},
        "require_ready_gate": {"type": "boolean"},
        "require_evidence": {"type": "boolean"},
        "ui_prototype_default_variants": {"type": "integer", "minimum": 1},
        "ui_prototype_max_variants": {"type": "integer", "minimum": 1}
      },
      "additionalProperties": true
    }
  },
  "allOf": [{
    "$comment": "ui_prototype_default_variants <= ui_prototype_max_variants is enforced by validate-specdev.mjs because JSON Schema cannot compare sibling numeric values."
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

<goal-plan-schema>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:speculo:specdev:goal-plan:v6",
  "title": "SpecDev Goal Plan Frontmatter",
  "type": "object",
  "required": [
    "schema_version", "artifact", "change", "status", "modes", "orchestration",
    "lead", "implementation_agent_limit", "integration_attempt_limit", "ticket_workspace_policy", "integration_gate",
    "ready_for_execution"
  ],
  "properties": {
    "schema_version": {"const": 6},
    "artifact": {"const": "goal-plan"},
    "change": {"type": "string", "minLength": 1},
    "status": {"enum": ["draft", "ready", "in_progress", "completed", "blocked"]},
    "modes": {
      "type": "array",
      "items": {"enum": ["migration", "high-assurance", "reference-conformance", "release-coordination"]},
      "uniqueItems": true
    },
    "orchestration": {"const": "lead-directed"},
    "lead": {"type": "string", "minLength": 1},
    "implementation_agent_limit": {"type": "integer", "minimum": 1},
    "integration_attempt_limit": {"type": "integer", "minimum": 1},
    "ticket_workspace_policy": {"enum": ["current", "required"]},
    "integration_gate": {"enum": ["direct-parent", "candidate-merge"]},
    "ready_for_execution": {"type": "boolean"}
  },
  "allOf": [
    {
      "if": {"properties": {"ticket_workspace_policy": {"const": "current"}}, "required": ["ticket_workspace_policy"]},
      "then": {"properties": {"integration_gate": {"const": "direct-parent"}}}
    },
    {
      "if": {"properties": {"ticket_workspace_policy": {"const": "required"}}, "required": ["ticket_workspace_policy"]},
      "then": {"properties": {"integration_gate": {"const": "candidate-merge"}}}
    },
    {
      "if": {"properties": {"status": {"enum": ["draft", "blocked", "completed"]}}, "required": ["status"]},
      "then": {"properties": {"ready_for_execution": {"const": false}}}
    },
    {
      "if": {"properties": {"status": {"enum": ["ready", "in_progress"]}}, "required": ["status"]},
      "then": {"properties": {"ready_for_execution": {"const": true}}}
    }
  ],
  "additionalProperties": false
}
```

</goal-plan-schema>
