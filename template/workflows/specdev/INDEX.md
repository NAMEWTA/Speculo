---
id: specdev
type: workflow
workflow: specdev
name: SpecDev Workflow
description: 从请求摄入、诊断、设计、规格、决策完备 Ticket、跨 Ticket 编排，到证据驱动实现、架构审查与知识归档的完整研发治理工作流。
keywords: [specdev, 规格驱动开发, decision-complete, ticket, goal-plan, TDD, 证据, 治理]
---

# SpecDev Workflow

SpecDev 将“理解、决定、规划、执行、验证、沉淀”拆成职责清晰的工件链。目标不是让文档尽可能长，而是让每一层拥有明确权威，并让后续模型无需重新决定前一层已经锁定的事项。

## 运行时根

- 工作流根：`<Path>{roots.workflows}/specdev/</Path>`
- 状态根：`<Path>{roots.state}/specdev/</Path>`

任何具体文件或目录引用必须遵守 `<Path>{roots.workflows}/specdev/common/rules/path-reference-contract.md</Path>`。禁止内部相对链接、裸文件名和机器绝对路径。

## 工件链

```text
外部请求、Issue 或对话
        ↓
Triage / Diagnose / Grill / Wayfinder / Architecture Review
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
Archive          归档历史并将经验证知识提升为当前长期知识
```

核心状态工件：

- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`

工件职责和冲突裁决位于 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>`。

## 持久化约定

`speculo init` 创建固定状态骨架：

- 全局状态：`<Path>{roots.state}/specdev/status.json</Path>`
- 活跃 change：`<Path>{roots.state}/specdev/changes/</Path>`
- 历史归档：`<Path>{roots.state}/specdev/archive/</Path>`

初始化设置 work 首次运行时生成：

- 全局配置：`<Path>{roots.state}/specdev/config.json</Path>`
- 追踪规则：`<Path>{roots.state}/specdev/.config/tracking.md</Path>`
- 领域布局：`<Path>{roots.state}/specdev/.config/domain-layout.md</Path>`
- 状态标签：`<Path>{roots.state}/specdev/.config/status-labels.md</Path>`

经 change 产物确认后按需创建：

- 永久 ADR：`<Path>{roots.state}/specdev/adr/</Path>`
- 永久领域上下文：`<Path>{roots.state}/specdev/context/</Path>`
- 永久研究：`<Path>{roots.state}/specdev/research/</Path>`

单个 change 可以包含：

- `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/source-issue.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/investigation/</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/architecture-review.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/architecture-review.html</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`

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
10. **恢复依赖权威工件**：跨 Work 或 Agent 边界时同步 `current_work` 与 `work_history`，返回下一 Work 和权威工件的完整路径。

共享规则：

- `<Path>{roots.workflows}/specdev/common/rules/planning-principles.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/readiness-and-depth.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/path-ownership.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/evidence-and-verification.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/path-reference-contract.md</Path>`

## 启动协议

1. 解析 workflow 和 state roots。
2. 读取 `<Path>{roots.state}/specdev/config.json</Path>`；不存在时运行 `<Path>{roots.workflows}/specdev/I-init-setup/I-init-setup.md</Path>`。
3. 读取 `<Path>{roots.state}/specdev/status.json</Path>`：用户指定 change 优先；唯一活跃 change 直接使用；无活跃时创建；多个候选时请求消歧。
4. 在 `<Path>{roots.state}/specdev/status.json</Path>` 写入 work 开始记录，并更新当前 change 的 `current_work`。
5. 只加载当前步骤需要的 work 子文件和共享规则。
6. 完成后写入产物、运行适用校验、更新状态和 `works_run`。

## 状态字段

`<Path>{roots.state}/specdev/status.json</Path>` 使用 schema v3：

- `schema_version`（数字）：状态 schema 版本，固定为 `3`。
- `workflow`（字符串）：workflow 标识，固定为 `"specdev"`。
- `active`（对象数组）：当前活跃 change；每项包含：
  - `change`（字符串）：change 目录名，格式 `"YYYY-MM-DD-<kebab-topic>"`。
  - `current_work`（字符串或 null）：当前 work id，如 `"specdev/implement"`；无运行中 work 时为 null。
  - `works_run`（字符串数组）：已运行的 work id。
  - `result`（字符串或 null）：整体结果；进行中为 null，结束时记录 `"completed"`、`"blocked"` 或 `"cancelled"`。
  - `claimed_investigations`（对象数组，可选）：并行调查领取记录；每项包含 `id`、`owner`、可选 `session` 和 `claimed_at`。
- `work_history`（对象数组）：work 调用记录；每项包含 `change`、`work_id`、`started_at`、`completed_at` 和 `result`。
- `completed`（对象数组）：已归档 change；每项包含 `change`、`archived_at` 和 `archive_path`。

`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `worktrees` 保存 Ticket 级 `base_sha`、分支、可迁移 `workspace_ref` 和生命周期状态。

领域状态枚举：

- change：`active | blocked | completed | archived`
- Ticket：`draft | ready | in_progress | blocked | review | done | deviated | cancelled`
- Investigation：`open | claimed | confirmed | disproved | decision-needed | unresolved | superseded | cancelled`
- Planning Depth：`lite | standard | deep`
- Worktree：`planned | active | review | integrated | removed | blocked`

## 路径分配

1. workflow 运行状态写入 `<Path>{roots.state}/specdev/</Path>`。
2. change 产物写入 `<Path>{roots.state}/specdev/changes/{change}/</Path>`。
3. 项目代码、测试和用户要求的项目文档写入项目路径；Evidence 仅保存项目相对指针。
4. 长期知识先在 change 内形成，经确认后提升到对应永久 namespace。

## 副作用边界

未经用户明确授权不得提交、推送、合并、删除分支或 worktree、部署、发布、移动归档或执行不可逆迁移。只读探索、生成 change 工件和已授权验证可以进行。敏感值不得写入 `<Path>{roots.state}/specdev/</Path>`。

## Work 条目

<!-- AUTO-INDEX-START -->

- **A-archive-and-consolidate** — 归档与沉淀：在验证完成和用户授权后归档 change，并以证据判断哪些架构决策、术语和研究应创建、合并、替代、废弃或不提升。
- **D-diagnose-bugs** — 诊断 Bug：通过复现、反馈回路、可证伪假设与最小插桩定位根因，输出修复契约而不是猜测性补丁。
- **E-engineering-cognitive-mentor** — 工程认知导师：面向 Bug、项目源码、需求技术方案、架构设计与陌生技术领域的非执行型认知指导 Work；以证据、因果 Why、候选方案对比和逐轮澄清帮助用户形成可复述理解，并将完整问答轨迹持续持久化到当前 change。
- **G-grill-with-docs** — 设计访谈（带文档）：通过一次一问的设计访谈打磨方案，同时持续维护设计日志、领域上下文和架构决策。
- **I-implement** — 实现：基于 Ready Ticket 或获批的小型 Spec 执行设计检查、TDD 红绿循环、持续验证、双轴审查、证据回写和提交。
- **I-init-setup** — 初始化设置：初始化 SpecDev 的语言、配置、全局状态、追踪约定、领域知识布局、验证命令和并发治理。
- **P-goal-plan** — 目标规划：在协调复杂度需要时，将 Ready Spec、Tickets、架构决策与外部约束综合为决策完备的跨 Ticket 编排计划。
- **R-review-architecture** — 架构审查：扫描与目标相关的代码区域，识别浅模块、接缝泄漏和局部性问题，以可视化报告呈现候选方案，并通过逐项访谈转化为可执行决策。
- **S-spec** — 编写 Spec：综合已知事实、设计决定、诊断与代码现状，产出以外部行为和验收合同为权威的 Ready Spec。
- **T-tickets** — 拆分 Tickets：将 Spec、计划或已确认对话拆成曳光弹式垂直切片；每个 Ticket 决策完备、可独立验证、适配单一上下文，并建立阻塞 DAG、路径所有权和执行就绪门禁。
- **T-triage** — 请求分诊：完整摄入外部请求，判断问题类型、影响、风险、缺失信息和下一 work，不在分诊阶段过早设计或实现。
- **W-wayfinder** — 寻路：为路径未知、跨域或超出单次上下文的工作建立共享调查地图，通过可领取的研究与决策 Ticket 关闭未知项并收敛到可执行路线。

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
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

校验工作流包：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --self-check
```
