# SpecDev Common

`<Path>{roots.workflows}/specdev/common/</Path>` 是 SpecDev 的共享治理层。所有 work 复用这里的规则、Schema、工具和 Skill，不在各自目录复制冲突版本。

## 目录

- 共享规则：`<Path>{roots.workflows}/specdev/common/rules/</Path>`
- 工件 Schema：`<Path>{roots.workflows}/specdev/common/schemas/</Path>`
- 自动化工具：`<Path>{roots.workflows}/specdev/common/tools/</Path>`
- 可复用 Skill：`<Path>{roots.workflows}/specdev/common/skills/</Path>`

## 规则权威

- 激活与记忆读取、事务门：`<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`；它定义 locate-before-read 和写入前 owner/gateway 检查，其他规则只声明领域专属约束。
- 工件职责与冲突裁决：`<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>`
- 规划原则：`<Path>{roots.workflows}/specdev/common/rules/planning-principles.md</Path>`
- 规划深度与就绪：`<Path>{roots.workflows}/specdev/common/rules/readiness-and-depth.md</Path>`
- 路径所有权：`<Path>{roots.workflows}/specdev/common/rules/path-ownership.md</Path>`
- 证据与验证：`<Path>{roots.workflows}/specdev/common/rules/evidence-and-verification.md</Path>`
- 偏差控制：`<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>`
- 路径引用：`<Path>{roots.workflows}/specdev/common/rules/path-reference-contract.md</Path>`
- Change 完成：`<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>`
- 代码注释：`<Path>{roots.workflows}/specdev/common/rules/code-commenting-rule.md</Path>`
- 代码库设计：`<Path>{roots.workflows}/specdev/common/rules/codebase-design.md</Path>`
- 父实现编排：`<Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path>`

## 按风险加载工程标准

- 设计或执行失败、重试、取消、未知结果时读取 <Path>{roots.workflows}/specdev/common/rules/error-handling.md</Path>。
- 异步、并发资源、CI flake 或删除替换测试时读取 <Path>{roots.workflows}/specdev/common/rules/test-reliability.md</Path>。
- 项目文档的当前事实、归属、升级说明和语义保真使用 <Path>{roots.workflows}/specdev/common/rules/documentation-standard.md</Path>，注释仍由原注释规则负责。
- 工具定义、prompt、Work/Skill 或上下文加载变化时读取 <Path>{roots.workflows}/specdev/common/rules/agent-experience.md</Path>。
- 仅新专业分支记录 <Path>{roots.workflows}/specdev/common/rules/engineering-evidence.md</Path>；它是原报告中的观察，不是新的任务状态。

## 结构化工件 Schema

- 全局配置：`<Path>{roots.workflows}/specdev/common/schemas/config.schema.json</Path>`
- 业务工件生命周期：<Path>{roots.workflows}/specdev/common/rules/workflow-state-and-lifecycle.md</Path>；整体 Outcome、Goal 与 Ticket 各在自己的 Markdown 原件中持有唯一状态。
- 工作区上下文：<Path>{roots.workflows}/specdev/common/schemas/execution-context.schema.json</Path>
- 实际执行证据：<Path>{roots.workflows}/specdev/common/schemas/execution-record.schema.json</Path>
- Spec：`<Path>{roots.workflows}/specdev/common/schemas/spec.schema.json</Path>`
- Ticket：`<Path>{roots.workflows}/specdev/common/schemas/ticket.schema.json</Path>`
- Tickets Map：`<Path>{roots.workflows}/specdev/common/schemas/tickets-map.schema.json</Path>`
- Goal Plan：`<Path>{roots.workflows}/specdev/common/schemas/goal-plan.schema.json</Path>`
- Implementation Map：`<Path>{roots.workflows}/specdev/common/schemas/implementation-map.schema.json</Path>`
- Implementation Plan：`<Path>{roots.workflows}/specdev/common/schemas/implementation-plan.schema.json</Path>`
- 设计树：`<Path>{roots.workflows}/specdev/common/schemas/design-tree.schema.json</Path>`
- Wayfinder Ticket：`<Path>{roots.workflows}/specdev/common/schemas/wayfinder-ticket.schema.json</Path>`
- 来源快照：`<Path>{roots.workflows}/specdev/common/schemas/source.schema.json</Path>`
- 分诊：`<Path>{roots.workflows}/specdev/common/schemas/triage.schema.json</Path>`
- 发布账本：`<Path>{roots.workflows}/specdev/common/schemas/publish.schema.json</Path>`
- 捕获账本：`<Path>{roots.workflows}/specdev/common/schemas/capture.schema.json</Path>`
- 诊断：`<Path>{roots.workflows}/specdev/common/schemas/diagnosis.schema.json</Path>`
- 代码审查：`<Path>{roots.workflows}/specdev/common/schemas/code-review.schema.json</Path>`
- UI 设计包：`<Path>{roots.workflows}/specdev/specdev-p-prototype/assets/design-package.schema.json</Path>`

## 工具与 Skill

- 包与 change 校验器：`<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>`
- 校验器说明：`<Path>{roots.workflows}/specdev/common/tools/README.md</Path>`
- 外部技术研究 Skill：`<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`
- Change worktree Skill：<Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>；创建/复用一个 change 工作区，所有票据和协作者共用，串并行不增加 worktree。
- 动态 Agent 交付合同 Skill：`<Path>{roots.references}/coordination/task-brief.md</Path>`；P-goal-plan 可建立子 change Lead 合同，I-implement 在执行期派单与验收，Goal 编排的全局门约束
- 双轴代码审查 Skill：`<Path>{roots.workflows}/specdev/common/skills/code-review/SKILL.md</Path>`

## 加载原则

1. 入口 work 只加载当前步骤需要的共享文件。
2. 共享规则是规范性要求；work 子文件只能细化，不得降低。
3. Schema 检查结构，不替代事实核验、设计判断和用户批准。
4. 工具只自动判断可判定条件；校验成功不代表需求、设计或实现正确。
5. Skill 提供横跨 work 的可复用能力，不应把专属 work 职责吸收到公共层。
6. 所有具体文件与目录引用都必须遵守 `<Path>{roots.workflows}/specdev/common/rules/path-reference-contract.md</Path>`。
