# SpecDev Activation Contract

本合同只在用户明确激活 SpecDev Work 后读取。它定义所有 Works 共享的启动、恢复、状态、所有权、路由和验证规则；具体 Work 仍只加载当前步骤需要的分支文件与共享规则。

SpecDev 将“理解、决定、规划、执行、验证、沉淀”拆成职责清晰的工件链。目标不是让文档尽可能长，而是让每一层拥有明确权威，并让后续模型无需重新决定前一层已经锁定的事项。

## 运行时根

- 工作流根：`<Path>{roots.workflows}/specdev/</Path>`
- 状态根：`<Path>{roots.state}/specdev/</Path>`

任何具体文件或目录引用必须遵守 `<Path>{roots.workflows}/specdev/common/rules/path-reference-contract.md</Path>`。禁止内部相对链接、裸文件名和机器绝对路径。

## 工件链

```text
远程 Issue、指定内容或对话
        ↓
Triage 冻结为本地 Source
        ↓
Diagnose / Grill / Wayfinder / Prototype / Code Review / Architecture Review
        ↓
Spec             外部行为、范围、验收合同与关键约束
        ↓
Ticket           单一垂直切片的决策完备微计划
        ↓
Tickets Map      DAG、合同覆盖、Ready 与并行投影
        ↓
Goal Plan        仅在需要时编排跨 Ticket Gate、Wave、owner 与恢复
        ↓
Implement        在既定契约内设计、TDD、审查、验证和交接
        ↓
Evidence         实际修改、命令、结果、偏差和残余风险
        ↓
Triage           本地完成后按确认回写/关闭支持的远程 Issue
        ↓
Archive          归档历史并将经验证知识提升为当前长期知识
```

多个已经完成 Ready Spec 与 Ready Tickets 的 change 需要在一个会话持续实现时，O-orchestrate-implementation 额外创建一个父实现 change；父 Implementation Map/Plan 位于上述单 change 链之外，只编排实现，不参与或替代任何子 change 的需求澄清、Spec 或 Ticket 生产。

核心状态工件：

- `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/implementation-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/implementation-plan.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/design-tree.json</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/investigation/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/reviews/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/comparison/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/final/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/questionnaires/</Path>`

`{design-id}` 由 P-prototype 在当前 change 内分配为最小未占用的 `UI-NNN`；设计系统文档是设计权威，comparison 与 final 是其可运行投影。

工件职责和冲突裁决位于 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>`。

## 持久化约定

`speculo init` 创建固定状态骨架：

- 全局状态：`<Path>{roots.state}/specdev/status.json</Path>`
- 活跃 change：`<Path>{roots.state}/specdev/changes/</Path>`
- 历史归档：`<Path>{roots.state}/specdev/archive/</Path>`

刷新时 CLI 依据 `<Path>{roots.workflows}/specdev/runtime-contract.json</Path>` 处理持久化数据：配置使用 baseline 三方合并，登记的状态 schema 使用显式 migrator，其他 runtime 文件按字节保留。只有字段删除或结构迁移时才在 `<Path>{roots.state}/back/</Path>` 写入 targeted backup；冲突在替换 active 安装前阻塞。`<Path>{roots.state}/back/</Path>`、`<Path>{roots.state}/install.json</Path>`、`<Path>{roots.state}/managed.json</Path>` 与 `<Path>{roots.state}/baselines/</Path>` 均不属于 SpecDev 写入 namespace。

初始化设置 work 首次运行时生成配置并创建空的永久 namespace：

- 全局配置：`<Path>{roots.state}/specdev/config.json</Path>`
- 追踪规则：`<Path>{roots.state}/specdev/.config/tracking.md</Path>`
- 领域布局：`<Path>{roots.state}/specdev/.config/domain-layout.md</Path>`
- 永久 ADR：`<Path>{roots.state}/specdev/adr/</Path>`
- 永久领域上下文：`<Path>{roots.state}/specdev/context/</Path>`
- 永久研究：`<Path>{roots.state}/specdev/research/</Path>`

初始化只保证永久目录存在，不写知识内容。只有 A-archive-and-consolidate 在 change 完成、实现证据验证、毕业评估和用户确认后，才能创建、合并或改写这些永久 namespace 中的内容；其他 Works 只读。

单个 change 可以包含：

- `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/diagnostics/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/design-tree.json</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/implementation-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/implementation-plan.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/investigation/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/investigation/comments/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/architecture-review.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/architecture-review.html</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/reviews/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/comparison/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/final/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/questionnaires/</Path>`

## 全局治理原则

1. **先发现、后询问**：仓库、配置、schema、测试和文档能回答的事实先探索；只询问真正影响行为、架构、风险、范围、迁移或验收的偏好。
2. **规划深度随风险增长**：Lite、Standard、Deep 由复杂度和事故半径决定，不由文档长度决定。
3. **Ticket 是微型计划**：每个 Ready Ticket 决策完备，但不展开逐行代码。
4. **Goal Plan 按需出现**：只在跨 Ticket 编排复杂度需要时生成，不以固定章节数量作为质量标准。
5. **证据优先**：每个验收合同、Ticket 和 Gate 都必须有可重复验证与 Evidence。
6. **路径所有权**：并发实现者只能修改授权项目路径；shared path 有唯一 owner。
7. **偏差显式化**：计划与事实冲突时停止、记录、修订，不静默扩大范围或改写契约。
8. **状态单一来源**：Ticket frontmatter 是单 Ticket 状态权威；Map 和 Goal Plan 是投影与编排。
9. **知识以当前真相为目标**：归档保留历史，永久知识只保留仍真实且经实现验证的结论。
10. **恢复依赖权威工件**：跨 Work 或 Agent 边界时同步 active change 的 `current_work`，成功完成后去重更新 `works_run`，返回下一 Work 和权威工件的完整路径。
11. **本地执行权威**：远程 Issue/PR/URL 只作为来源或完成投影；Spec、Ticket、Map、Goal Plan、Evidence 和状态始终以本地工件为准。
12. **完成与归档分离**：本地完成按 change completion 合同决定；远程 close 失败不回滚完成，但必须 reconcile 或 waive 后才归档。
13. **Lead 与隔离正交**：Lead 固定拥有 SpecDev 状态、Evidence 与父分支；是否派遣 subagent 由 Lead 动态决定。Goal Plan 创建时询问 Ticket 是否开启 worktree，默认不开启；选择只作用于当前 Goal Plan。
14. **策略化验收**：current 模式使用当前 workspace 严格串行、direct-parent 验证；required 模式使用 source worktree 与 parent-candidate。只有 required 模式创建独立 Ticket worktree。
15. **父子权威隔离**：父实现 change 只拥有 Ready 子 change 的组合 Ticket DAG、serialization、全局 workspace/资源和实现进度投影；子 change 继续拥有全部行为与实现合同。一个未完成子 change 只能属于一个未完成父实现 change。

共享规则：

- `<Path>{roots.workflows}/specdev/common/rules/planning-principles.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/readiness-and-depth.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/path-ownership.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/evidence-and-verification.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/path-reference-contract.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/codebase-design.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path>`

## 启动协议

1. 解析 workflow 和 state roots。
2. 读取 `<Path>{roots.state}/specdev/config.json</Path>`；不存在时运行 `<Path>{roots.workflows}/specdev/I-init-setup/I-init-setup.md</Path>`。
3. 读取 `<Path>{roots.state}/specdev/status.json</Path>`：用户指定 change 优先；唯一活跃 change 直接使用；无活跃时创建；多个候选时请求消歧。
4. 读取当前 change 的 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`。若当前 change 是未完成父 Implementation Map 的成员，同时读取父 Map/Plan；父 O Work 自身恢复时以父产物为入口，不逐个手工激活成员。
5. 若当前 change 已有非空 `current_work`，先恢复或显式结束该 Work；否则将 `current_work` 设置为本次 work id。
6. 只加载当前步骤需要的 work 子文件和共享规则。
7. 完成后写入产物、运行适用校验、更新 change 状态和 `works_run`；全局状态只更新 active/archived 索引。

Change 从 active/blocked 转为 completed 时加载 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>`：有 Goal Plan 时由其中唯一 Lead 拥有转换；无 Goal Plan 的 Ticket/Direct Spec 由当前 I owner 拥有；非实现型终点由最终验收工件 owner 拥有。Archive 不补造 completed。

## 状态字段

`<Path>{roots.state}/specdev/status.json</Path>` 使用全局 schema v5；Spec/Ticket/Tickets Map 继续使用各自 schema v3，config 使用 schema v5，Goal Plan 使用 schema v6，Implementation Map/Plan 使用 schema v1，`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 使用 schema v6：

- `schema_version`（数字）：全局状态 schema 版本，固定为 `5`。
- `workflow`（字符串）：workflow 标识，固定为 `"specdev"`。
- `active`（对象数组）：当前活跃 change 的严格索引；每项只能包含 `change`，格式 `"YYYY-MM-DD-<kebab-topic>"`。
- `archived`（去重字符串数组）：已归档 change 名称。详细归档时间、路径和 promotion 摘要只存在于 `<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/.status.json</Path>`。

`active[].change` 必须唯一，且不得同时出现在 `archived`。`current_work`、`works_run` 和 `claimed_investigations` 只存在于 change 自有 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`：开始 Work 时设置 `current_work`；暂停或可恢复阻塞时保留；成功完成时加入 `works_run` 并清空；取消时清空但不加入。逐次时间、结果和审计证据由 change 自有状态、Work 主产物、Evidence 或 LOG 承载，不写入全局索引。

`<Path>{roots.state}/specdev/config.json</Path>` 的 `execution.max_implementation_agents`、`max_integration_attempts` 和 planning UI 设计候选字段均为可配置正整数；候选默认值与上限必须落在 2-4 且默认值不大于上限。仅 implementation subagent 受前者约束且不含 Lead，current workspace 仍保持单 writer 串行安全不变量；只读 review/research/test-observation agent 不设 SpecDev 数字上限。

`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `worktrees` 保存 Ticket 级 `base_sha`、父分支、workspace/implementation/integration owner、workspace locator、implementation/source checkpoint、适用 candidate/result SHA、验证、E2E disposition 与生命周期状态。current 记录使用 `workspace_ref=current` 和 direct-parent；required 记录使用 source/parent-candidate。每个实现 Ticket 都有一条记录；父分支只有在对应策略的验证通过后推进。`removed` 是 required 集成后来源 branch/worktree 完成清理的终态，必须保留全部集成与 E2E 证据。

领域状态枚举：

- change：`active | blocked | completed | archived`
- Ticket：`draft | ready | in_progress | blocked | review | done | deviated | cancelled`
- Investigation status：`open | closed`
- Investigation resolution：`answered | out-of-scope | superseded | cancelled | null`
- Planning Depth：`lite | standard | deep`
- Worktree：`planned | active | review | integrating | integrated | removed | blocked`

## 路径分配

1. workflow 运行状态写入 `<Path>{roots.state}/specdev/</Path>`。
2. change 产物写入 `<Path>{roots.state}/specdev/changes/{change}/</Path>`。
3. 项目代码、测试和用户要求的项目文档写入项目路径；Evidence 仅保存项目相对指针。
4. 长期知识候选先在 change 内形成；只有 A 在完成证据、毕业评估和用户确认全部通过后，才提升到对应永久 namespace。

## 副作用边界

未经用户明确授权不得提交、推送、合并、删除来源 branch/worktree、部署、发布、移动归档、写入/关闭远程 Issue 或执行不可逆迁移。Ready Goal Plan/Ticket 执行必须明确取得 implementation commit 与所选 direct-parent/candidate integration/父分支更新授权；required 模式该授权包含 transient candidate checkout/branch 生命周期，不扩展到来源 cleanup、远端或生产动作。只读探索、change 工件生成和已授权验证可以进行。远程开发投影仅由 Triage reconcile 执行；Retro command 的 Speculo 反馈 Issue 是独立 command 边界。敏感值不得写入 `<Path>{roots.state}/specdev/</Path>`。

## 场景路由

| 场景 | 入口 | 正常出口 |
|---|---|---|
| 远程 Issue、URL、文件或对话摄入 | T-triage intake | D / G / W / P / S / C / T |
| 本地 change 完成且来源可关闭 | T-triage reconcile | A |
| 疑难 bug 或性能回归 | D-diagnose-bugs | S / T / I / R / W |
| 模糊但可通过决策访谈收敛 | G-grill-with-docs | P / S / T / W |
| 路径超出单次上下文 | W-wayfinder | G / P / D / S / T |
| 需要检测项目 UI、选择设计方向并生成可运行设计包 | P-prototype | G / S / T / I |
| 固定点 diff、branch 或 PR review | C-code-review | completed / T / S / G |
| 外部行为已清楚 | S-spec | T-tickets |
| Ready Spec 需要垂直切片 | T-tickets | P-goal-plan / I |
| 多 Ticket 协调 | P-goal-plan | I / Triage / A |
| 多个 Ready change 的持续实现 | O-orchestrate-implementation | I-implement 循环 / completed / blocked |
| Ready 执行 | I-implement | Triage / A / blocked / deviation |
| 架构健康扫描 | R-review-architecture | G / T |

同 change 下一阶段需要当前一手推理且上下文健康时继续；切换 repo/person/harness 或旁路时使用 `<Path>{roots.commands}/handoff.md</Path>`；严格限定且可独立派单时使用 Dispatch Packet；其他长上下文以权威工件路径恢复。平台不支持 clear/compact 时不虚构操作。

## Work 条目

<!-- AUTO-INDEX-START -->

- **A-archive-and-consolidate** — 归档与沉淀：校验本地完成与远程 reconcile 门，复用全局归档能力移动 completed change 并提升当前知识，或从代码访谈形成可归档知识 change。
- **C-code-review** — 代码审查：将 commit、branch、tag、merge-base 或 PR 解析为本地不可变固定点，执行隔离的标准轴与规范轴审查并持久化可恢复报告。
- **D-diagnose-bugs** — 诊断 Bug：先建立会在精确症状上变红的紧凑反馈回路，再通过最小化、排名假设和单变量探针确认根因，输出修复契约而不实施生产修复。
- **G-grill-with-docs** — 设计访谈（带文档）：以完整 frontier 逐轮推进设计树，直到每个决策分支都已关闭并获得用户共识，同时持续维护当前 change 的设计树、日志、领域上下文和架构决策。
- **I-implement** — 实现：基于 Ready Ticket 或获批小型 Spec 执行设计检查、TDD、动态派单、双轴审查、按 Goal Plan 选择的 current workspace 或 Ticket worktree 提交、直接父分支或候选合并验证和 Lead Evidence 回写。
- **I-init-setup** — 初始化设置：初始化 SpecDev 的语言、配置、全局状态、本地 change 追踪、领域知识布局、验证命令和并发治理。
- **O-orchestrate-implementation** — 编排实现：将两个或以上已完成 Ready Spec 与 Ready Tickets 的 change 编译为跨 change implementation super-DAG，并由单一 Lead 在一个会话中持续调度实现、验证和集成。
- **P-goal-plan** — 目标规划：在跨 Ticket 协调复杂度需要时，以固定 Lead、动态派单、DAG/Gate 和候选合并门禁生成决策完备且可恢复的执行计划。
- **P-prototype** — UI 设计原型：检测现有项目的 UI 事实，按产品任务推荐并逐步选择设计风格，生成持久化设计系统文档、多风格 HTML 对照和可运行 HTML/CSS/JS 原型。
- **R-review-architecture** — 架构审查：从用户指定范围或 Git 热点扫描代码库的深化机会，以持久化可视化 HTML 呈现候选，并对用户选择的一个方案运行设计树访谈。
- **S-spec** — 编写 Spec：综合已知事实、设计决定、诊断与代码现状，产出以外部行为和验收合同为权威的 Ready Spec。
- **T-tickets** — 拆分 Tickets：将 Spec、计划或已确认对话拆成曳光弹式垂直切片；每个 Ticket 决策完备、可独立验证、适配单一上下文，并建立阻塞 DAG、路径所有权和执行就绪门禁。
- **T-triage** — 请求分诊：把远程 Issue、URL、文件或对话冻结为本地来源工件，完成风险分诊与路由，并在本地 change 完成后受控回写和关闭支持的远程 Issue。
- **W-wayfinder** — 寻路：为超出单次会话且路径尚不可见的工作建立本地共享地图，逐个解决 research、prototype、grilling 或 task Ticket，直到目的地路线决策完备。

<!-- AUTO-INDEX-END -->

## Common 目录

- 总览：`<Path>{roots.workflows}/specdev/common/README.md</Path>`
- Rules：`<Path>{roots.workflows}/specdev/common/rules/</Path>`
- Schemas：`<Path>{roots.workflows}/specdev/common/schemas/</Path>`
- Tools：`<Path>{roots.workflows}/specdev/common/tools/</Path>`
- Skills：`<Path>{roots.workflows}/specdev/common/skills/</Path>`

## 自动校验

校验一个 change：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage <triage|diagnosis|grill|eli5|spec|tickets|goal-plan|implement|review|prototype|wayfinder|complete> \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

校验工作流包：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --self-check
```
