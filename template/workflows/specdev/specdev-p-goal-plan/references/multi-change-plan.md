# 多 change Goal 规划与执行

本参考由统一 P 按模式调用。plan 只完成步骤 1–3、父总控入口和计划审查；步骤 4–5 仅在显式 run/resume 且执行授权有效时进入。verify 不重新执行已完成票。恢复由原 Implementation Map/Plan 和 README 接续点定位。


本 Work 只编排实现。它不创建或补写子 change 的 Triage、Grill、Wayfinder、Spec、Ticket 或普通 Goal Plan。父 change 创建前，每个输入 change 都必须有可核验 Spec、结构完整的 Tickets Map 与全部计划内 Ticket 身份、依赖和合同覆盖。合法 draft/deferred 消费者可保留，记录真实缺口、生产者与 DoR 重审条件；不能编造未决公共契约或为创建父图把 draft 标成 Ready。整体目标、成员身份、依赖或公共合同缺失阻塞父创建；局部执行缺口只阻塞对应节点及依赖闭包。

父 change 将所有子 Ticket 投影为 `<member-change>::<ticket-id>` 组合节点，以跨 change implementation super-DAG、成员工作区引用、serialization、票据配额与独立实现者约束和 integration queue 持续驱动 I-implement。子 Spec/Ticket/Evidence/Git 继续是行为与实现权威，父工件只拥有跨 change 实现编排。

父 change 的主产物是 `<Path>{roots.state}/specdev/changes/{change}/implementation-map.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/implementation-plan.md</Path>`；整体验证写入 `<Path>{roots.state}/specdev/changes/{change}/evidence/implementation-orchestration.md</Path>`。


## 激活输入

创建模式必须获得至少两个用户明确指定的 change。恢复模式由用户指定父 change，或从实际 changes 目录中唯一存在合法父实现产物与 active Outcome 的对象确定。

创建父 change 前必须读取并验证：

- 明确根与实际执行策略来源；已有真实 config 时核对相关上限；
- 每个成员的 `<Path>{roots.state}/specdev/changes/{member-change}/README.md</Path>`；
- 每个成员的 `<Path>{roots.state}/specdev/changes/{member-change}/spec.md</Path>`；
- 每个成员的 `<Path>{roots.state}/specdev/changes/{member-change}/tickets-map.md</Path>`；
- 每个成员的 `<Path>{roots.state}/specdev/changes/{member-change}/ticket/</Path>`：先枚举所有 Ticket frontmatter、依赖、状态和可写路径，再按 super-DAG、冲突和当前 eligible 节点回读相关正文；
- 存在时读取子 Goal Plan、ADR、CONTEXT、LOG、Diagnosis 与 Evidence；
- 当前 repository、branch、HEAD、dirty 状态、项目 Agent 指令与可用验证命令。

成员的 Spec、Tickets Map、Ticket frontmatter、状态和父级编排证据是 super-DAG 的权威输入，必须完整读取；成员的 ADR、CONTEXT、LOG、Diagnosis、Evidence、研究资料和项目 Skills 先按索引、状态和关键词定位，只读取命中的条目。恢复、冲突、漂移和集成失败时按本 Work 的证据合同扩展为全量读取。

加载 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/multi-input-readiness.md</Path>` 和 `<Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path>`。任何成员缺少父图结构所需权威输入、已归档、等于父 change、属于另一个未完成父实现 change，或本身是父实现 change 时，不创建父 change。部分 draft 节点不等于成员结构不合法，不能据此要求全员 Ready。

## 流程

### 1. 先验证全部子 Change，再创建父 Change

对每个成员穷尽检查 Ready Spec、Tickets Map、Ticket frontmatter、合同覆盖、内部 DAG、路径所有权、验证矩阵和高影响未知项。部分 Ticket 可以已经 done/cancelled；未实现节点可为合法 `status: draft`、`ready: false`，其缺口有生产者、所需证据与重审条件。只有自身 Ready、已获授权、依赖成功且资源/owner 条件满足的节点可执行，父图不能提升或代替子票 DoR。全部 Ticket 已终态且 change 已 completed 的成员只作为已结束基线，不占 eligible 执行集合；下游成功依赖仍须由 done 票的有效产物满足，cancelled 票的相关依赖由原 Lead 按真实依据重规划。

只有所有成员通过输入门后，才创建普通父 README 的 Outcome active 与目标导航，再写父 Map/Plan；身份来自稳定目录名，不注册全局状态。任何预检失败都不得留下半创建父 change。

**完成标准**：父创建是 all-or-nothing；输入成员不少于两个；没有用父 Work 修补任何上游工件，也没有把父图可创建误写为全部子票可执行。

### 2. 编译 Implementation Super-DAG

加载 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/multi-super-dag.md</Path>` 与 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/multi-conflict-and-drift.md</Path>`。

1. 将每个子 Ticket 映射为唯一组合节点；
2. 将所有子 Ticket `blocked_by` 精确提升为组合 dependency；
3. 只为真实合同/产物前置关系增加跨 change dependency；
4. 为无语义依赖但不能并发的 Ticket 增加无方向 serialization pair；
5. 比较所有待实现 Ticket 的 writable/shared paths、公共合同、repository/ref 和迁移资源；
6. 检测循环、缺失节点、重复边、无 owner overlap 和子图漂移。

使用 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/assets/implementation-map-template.md</Path>` 写父 Map。Map 是子 Ticket 图的可重算投影；子 Ticket 变化时先重读权威，再递增 Map revision。

**完成标准**：父 Map 的 members/tasks/internal edges 与全部子工件精确一致；跨 change 边有来源；DAG 无环；每个并行冲突已依赖化、串行化或阻塞。

### 3. 确定跨 change 调度

使用 <Path>{roots.workflows}/specdev/specdev-p-goal-plan/assets/implementation-plan-template.md</Path> 写父 Plan；schema_version: 3、orchestration: lead-directed、唯一 lead、ticket_execution: auto|serial|parallel、integration_attempt_limit 和 ready_for_execution；有明确票据上限才记录 max_parallel_tickets，显式实现者上限用 concurrent_implementation_limit。实际来源写 Execution Policy Source，不把人数、票数、workspace 数量互相换算。

按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 引用各成员 README 的 Execution Context。成员可分别使用 current 或自己的 change worktree；父计划不覆盖已有选择、不因派单新建 worktree。一个需求内所有票据及协作者复用其选定工作区。

父约束与子计划共同作用于票据 DAG、资源和 Gate；serial 全局逐票完成，auto/parallel 选择无冲突 Ready 集合。主 Agent 根据真实任务收益、用户/项目/Work 要求和能力决定自行完成或委派，不按节点数量固定执行者。相同 Git index/ref 或测试资源的动作串行协调；跨分支合并仅在明确交付约定与授权下执行。

**完成标准**：票据调度、成员工作区引用、跨 change Gate、原 owner 和恢复边界均可回读。

随后用 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/goal-tickets-map-template.md</Path>` 写父无状态总控入口，并执行 `<Path>{roots.workflows}/specdev/common/skills/plan-quality-review/SKILL.md</Path>`。plan 到此返回计划、门禁和缺失授权；不得自行进入执行循环。

### 4. 在一个会话中持续执行

加载 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/multi-execution-loop.md</Path>`。父 Lead 自动循环，不要求用户逐个激活子 change：

1. 重读父 Map/Plan、所有子 Ticket/README/Evidence 和 Git；
2. 分别列出 eligible、conflicts 与 suggested_batch；draft 不进入 eligible，done 上游也不自动提升下游 Ready；
3. 从 eligible 按 ticket_execution、父子票据上限与 conflicts/路径/资源选择本轮合法组合；suggested_batch 不是唯一执行顺序，不从 workspace 类型决定串并行；
4. 由父 Plan 记录实际执行安排与 owner，按组合 ID 调用 I-implement；直接执行不伪造 Dispatch，正式委派按恢复需要持久交接；
5. 实现者只写成员选定工作区的授权路径，Lead 核验实际 checkpoint/快照、diff 与 Evidence；
6. 在稳定输入上验收；Git index/ref 操作和共享验证资源串行协调，只有明确要求才执行跨分支集成；
7. 先写回子 Ticket/Evidence 的负责事实，再更新父 Plan 导航/集成 Gate；
8. 父 HEAD、Map revision 或子合同变化后使旧 dispatch/candidate stale，并重新 preflight；
9. 仍有合法可执行组合时进入下一轮，否则按真实完成状态关闭或持久化 blocker。

I-implement 是实际实现 owner；父 Work 不复制 TDD、代码审查、Evidence 或 worktree 逻辑。用户只在合同冲突、高影响偏差、缺失授权、不可逆动作或没有合法可执行组合且无法自行消除 blocker 时被打断。

**完成标准**：单次父激活可以连续完成多个子 Ticket；没有第二个 SpecDev 状态 writer、超限票据或实现者、并发 parent integration 或绕过子 I-implement 完成门。

### 5. 关闭子 Changes 与父 Change

一个成员的全部计划内 Ticket 已 done，或因权威事实无需改动而有依据地 cancelled，且相关依赖已处置、Goal/Evidence/Git 门通过时，父 Lead 按 change completion 关闭该子 change；不等待其他成员才关闭，也不自动归档。单票取消不是依赖交付，也不等于整个 change 被取消；整体取消仍由原 owner 核对真实用户决定与处置证据。

全部成员 completed 后，Lead 运行跨 change aggregate test/typecheck/lint/build 与适用 E2E，核对跨 change 合同、依赖顺序、共享路径、迁移/恢复和最终 Git checkpoint，并使用 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/assets/implementation-evidence-template.md</Path>` 写整体验证。

只有父 Map/Plan completed、全部成员 completed、无 blocker/deviation/active dispatch/candidate/lock 且整体验证通过时，才由原父 Lead 更新 README 的唯一 Outcome completed 并链接 aggregate Evidence。归档、push、PR、remote merge、deploy 和生产迁移保持独立授权。

运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage goal-plan \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

## 完成标准

- 父 change 接受结构、范围、身份与依赖完整的成员；允许合法 draft 消费者，只执行自身 Ready 的节点；
- Implementation Map/Plan 可恢复完整组合 DAG、全局策略、eligible/conflicts/建议批次与 integration queue；
- 子工件保持权威，父投影与子 Ticket 精确一致；
- serial 全局逐票完成；auto/parallel 只推进无冲突票，各成员保留自己的唯一工作区；
- I-implement 自动回到父循环，全部子 change 和父 change completed；
- aggregate Evidence 与 validator 通过；
- 无未经授权的归档、远程 Git、部署或生产副作用。

## 子文件引用

- 输入就绪门：`<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/multi-input-readiness.md</Path>`
- Super-DAG：`<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/multi-super-dag.md</Path>`
- 执行循环：`<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/multi-execution-loop.md</Path>`
- 冲突与漂移：`<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/multi-conflict-and-drift.md</Path>`
- Map 模板：`<Path>{roots.workflows}/specdev/specdev-p-goal-plan/assets/implementation-map-template.md</Path>`
- Plan 模板：`<Path>{roots.workflows}/specdev/specdev-p-goal-plan/assets/implementation-plan-template.md</Path>`
- Evidence 模板：`<Path>{roots.workflows}/specdev/specdev-p-goal-plan/assets/implementation-evidence-template.md</Path>`
- 共享规则：`<Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path>`
