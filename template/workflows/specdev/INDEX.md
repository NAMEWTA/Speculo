---
id: specdev
type: workflow
workflow: specdev
name: SpecDev Workflow
description: 以本地工件为唯一开发权威，从来源冻结、诊断、设计、原型、规格、Ticket、编排和审查推进到证据驱动实现、远程 reconcile 与知识归档。
keywords: [specdev, local-first, 规格驱动开发, decision-complete, prototype, code-review, TDD, 证据]
---

# SpecDev Workflow

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

核心状态工件：

- `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/design-tree.json</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/investigation/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/reviews/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/prototypes/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/questionnaires/</Path>`

工件职责和冲突裁决位于 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>`。

## 持久化约定

`speculo init` 创建固定状态骨架：

- 全局状态：`<Path>{roots.state}/specdev/status.json</Path>`
- 活跃 change：`<Path>{roots.state}/specdev/changes/</Path>`
- 历史归档：`<Path>{roots.state}/specdev/archive/</Path>`

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
- `<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/investigation/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/investigation/comments/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/architecture-review.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/architecture-review.html</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/reviews/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/prototypes/</Path>`
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

## 启动协议

1. 解析 workflow 和 state roots。
2. 读取 `<Path>{roots.state}/specdev/config.json</Path>`；不存在时运行 `<Path>{roots.workflows}/specdev/I-init-setup/I-init-setup.md</Path>`。
3. 读取 `<Path>{roots.state}/specdev/status.json</Path>`：用户指定 change 优先；唯一活跃 change 直接使用；无活跃时创建；多个候选时请求消歧。
4. 若当前 change 已有非空 `current_work`，先恢复或显式结束该 Work；否则将 `current_work` 设置为本次 work id。
5. 只加载当前步骤需要的 work 子文件和共享规则。
6. 完成后写入产物、运行适用校验、更新状态和 `works_run`。

Change 从 active/blocked 转为 completed 时加载 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>`：Goal Plan 含完整委派附录时由 Lead 拥有转换；普通 Goal Plan 或无 Goal Plan 的实现由最后一个 I 拥有；非实现型终点由最终验收工件 owner 拥有。Archive 不补造 completed。

## 状态字段

`<Path>{roots.state}/specdev/status.json</Path>` 使用全局 schema v4；Spec、Ticket 和 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 等领域工件仍使用各自现有 schema：

- `schema_version`（数字）：全局状态 schema 版本，固定为 `4`。
- `workflow`（字符串）：workflow 标识，固定为 `"specdev"`。
- `active`（对象数组）：当前活跃 change；每项包含：
  - `change`（字符串）：change 目录名，格式 `"YYYY-MM-DD-<kebab-topic>"`。
  - `current_work`（字符串或 null）：当前 work id，如 `"specdev/implement"`；无运行中 work 时为 null。
  - `works_run`（去重字符串数组）：已成功完成的 work id；重复运行同一 work 不追加副本。
  - `claimed_investigations`（对象数组，可选）：并行调查领取记录；每项包含 `id`、`owner`、可选 `session` 和 `claimed_at`。
- `archived`（去重字符串数组）：已归档 change 名称。详细归档时间、路径和 promotion 摘要只存在于 `<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/.status.json</Path>`。

`active[].change` 必须唯一，且不得同时出现在 `archived`。开始 Work 时设置 `current_work`；暂停或可恢复阻塞时保留；成功完成时加入 `works_run` 并清空；取消时清空但不加入。逐次时间、结果和审计证据由 change 自有状态、Work 主产物、Evidence 或 LOG 承载，不写入全局索引。

`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `worktrees` 保存 Ticket 级 `base_sha`、分支、可迁移 `workspace_ref` 和生命周期状态。

领域状态枚举：

- change：`active | blocked | completed | archived`
- Ticket：`draft | ready | in_progress | blocked | review | done | deviated | cancelled`
- Investigation status：`open | closed`
- Investigation resolution：`answered | out-of-scope | superseded | cancelled | null`
- Planning Depth：`lite | standard | deep`
- Worktree：`planned | active | review | integrated | removed | blocked`

## 路径分配

1. workflow 运行状态写入 `<Path>{roots.state}/specdev/</Path>`。
2. change 产物写入 `<Path>{roots.state}/specdev/changes/{change}/</Path>`。
3. 项目代码、测试和用户要求的项目文档写入项目路径；Evidence 仅保存项目相对指针。
4. 长期知识候选先在 change 内形成；只有 A 在完成证据、毕业评估和用户确认全部通过后，才提升到对应永久 namespace。

## 副作用边界

未经用户明确授权不得提交、推送、合并、删除分支或 worktree、部署、发布、移动归档、写入/关闭远程 Issue 或执行不可逆迁移。只读探索、生成 change 工件和已授权验证可以进行。远程开发投影仅由 Triage reconcile 执行；Retro command 的 Speculo 反馈 Issue 是独立 command 边界。敏感值不得写入 `<Path>{roots.state}/specdev/</Path>`。

## 场景路由

| 场景 | 入口 | 正常出口 |
|---|---|---|
| 远程 Issue、URL、文件或对话摄入 | T-triage intake | D / G / W / P / S / C / T |
| 本地 change 完成且来源可关闭 | T-triage reconcile | A |
| 疑难 bug 或性能回归 | D-diagnose-bugs | S / T / I / R / W |
| 模糊但可通过决策访谈收敛 | G-grill-with-docs | P / S / T / W |
| 路径超出单次上下文 | W-wayfinder | G / P / D / S / T |
| 需要用代码回答逻辑/UI 问题 | P-prototype | G / S / T / I |
| 固定点 diff、branch 或 PR review | C-code-review | completed / T / S / G |
| 外部行为已清楚 | S-spec | T-tickets |
| Ready Spec 需要垂直切片 | T-tickets | P-goal-plan / I |
| 多 Ticket 协调 | P-goal-plan | I / Triage / A |
| Ready 执行 | I-implement | Triage / A / blocked / deviation |
| 架构健康扫描 | R-review-architecture | G / T |

同 change 下一阶段需要当前一手推理且上下文健康时继续；切换 repo/person/harness 或旁路时使用 `<Path>{roots.commands}/handoff.md</Path>`；严格限定且可独立派单时使用 Dispatch Packet；其他长上下文以权威工件路径恢复。平台不支持 clear/compact 时不虚构操作。

## Work 条目

<!-- AUTO-INDEX-START -->

- **A-archive-and-consolidate** — 归档与沉淀：校验本地完成与远程 reconcile 门，复用全局归档能力移动 completed change 并提升当前知识，或从代码访谈形成可归档知识 change。
- **C-code-review** — 代码审查：将 commit、branch、tag、merge-base 或 PR 解析为本地不可变固定点，执行隔离的标准轴与规范轴审查并持久化可恢复报告。
- **D-diagnose-bugs** — 诊断 Bug：先建立会在精确症状上变红的紧凑反馈回路，再通过最小化、排名假设和单变量探针确认根因，输出修复契约而不实施生产修复。
- **E-engineering-cognitive-mentor** — 工程认知导师：面向 Bug、项目源码、需求技术方案、架构设计与陌生技术领域的非执行型认知指导 Work；以证据、因果 Why、候选方案对比和逐轮澄清帮助用户形成可复述理解，并将完整问答轨迹持续持久化到当前 change。
- **G-grill-with-docs** — 设计访谈（带文档）：以完整 frontier 逐轮推进设计树，直到每个决策分支都已关闭并获得用户共识，同时持续维护当前 change 的设计树、日志、领域上下文和架构决策。
- **I-implement** — 实现：基于 Ready Ticket 或获批的小型 Spec 执行设计检查、TDD 红绿循环、持续验证、双轴审查、证据回写和提交。
- **I-init-setup** — 初始化设置：初始化 SpecDev 的语言、配置、全局状态、本地 change 追踪、领域知识布局、验证命令和并发治理。
- **P-goal-plan** — 目标规划：在协调复杂度需要时，将 Ready Spec、Tickets、架构决策与外部约束综合为决策完备的跨 Ticket 计划，并仅在用户选择时加入严格角色委派。
- **P-prototype** — 原型：在获授权的临时 branch/worktree 中构建一次性 Logic 或 UI 原型，回答一个明确设计问题并持久化答案、资产定位和清理状态。
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
  --stage <triage|diagnosis|grill|spec|tickets|goal-plan|implement|review|prototype|wayfinder|complete> \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

校验工作流包：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --self-check
```
