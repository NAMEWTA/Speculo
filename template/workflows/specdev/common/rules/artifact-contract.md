# 工件职责与权威裁决

SpecDev 通过分层工件避免同一决策被多个模型反复重做。每个工件只承担自己的权威边界。

## 1. 工件职责

| 工件 | 具体位置 | 必须决定 | 不应决定 |
|---|---|---|---|
| 来源快照 | `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>` | 原始请求、捕获时间、locator、hash 和关闭能力 | 当前产品合同或实现状态 |
| 分诊 | `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>` | 请求类别、影响、风险、缺失输入、下一 work 和远程 reconcile 状态 | 详细实现方案或开发进度 |
| 诊断 | `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>` | 复现、证据、根因、修复不变量和回归契约 | 未经验证的修复实现 |
| 设计日志 | `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` | 讨论轨迹、确认、延后、替代与废弃结论 | 当前架构权威摘要 |
| 设计树 | `<Path>{roots.state}/specdev/changes/{change}/design-tree.json</Path>` | 决策节点、依赖、当前 frontier、轮次与共识状态 | 领域真相或架构决定正文 |
| Change 领域上下文 | `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` | 本 change 已确认、供下游使用的领域术语和语义 | 永久领域知识或临时会议记录 |
| Change 架构决策 | `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` | 已成为本 change 下游合同的架构决策、原因、后果和替代关系 | 永久项目 ADR 或尚未决定的方案集合 |
| Spec | `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` | 用户问题、外部行为、范围、验收合同、非功能要求和已锁定实现约束 | 文件级施工步骤 |
| Ticket | `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>` | 单一垂直切片的行为、决策、范围、路径所有权、执行路线和验证证据 | 跨 Ticket 里程碑治理 |
| Tickets Map | `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` | 依赖 DAG、合同覆盖、Ready 投影、并行候选和路径冲突 | 单 Ticket 的完整实现契约 |
| Goal Plan | `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` | 跨 Ticket 调度、Gate、共享所有权、迁移顺序、集成和偏差治理 | 复制 Ticket 全文 |
| Evidence | `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>` | 实际修改、命令、结果、验收映射、偏差、风险和提交引用 | 新的产品或架构决策 |
| 代码审查 | `<Path>{roots.state}/specdev/changes/{change}/reviews/CR-###.md</Path>` | 固定点、标准轴和规范轴 finding | 实施修复或合并两轴排名 |
| 原型记录 | `<Path>{roots.state}/specdev/changes/{change}/prototypes/{prototype-id}/record.md</Path>` | 一个问题、分支、资产、答案、promotion 和清理 | 生产实现或多个问题的计划 |
| 零基础新生图解 | `<Path>{roots.state}/specdev/changes/{change}/eli_index.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/<number>_<topic>.md</Path>` | 面向刚上大一、没有专业背景读者的 Markdown 与 ASCII 图解；索引按序号持续追加 | 产品决定、架构决定或实现授权 |
| Stakeholder 问卷 | `<Path>{roots.state}/specdev/changes/{change}/questionnaires/{slug}.md</Path>` | 第三方原始回答和恢复条件 | 未经转录确认的产品/架构决定 |
| Wayfinder 地图 | `<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>` | 目的地、说明、已关闭决策索引、战争迷雾和范围之外 | 开放 Ticket 正文或答案详情 |
| Wayfinder Ticket | `<Path>{roots.state}/specdev/changes/{change}/investigation/{investigation-id}.md</Path>` | 一个可精确陈述的问题、类型、阻塞和关闭状态 | 解决方案评论或交付目标 |
| Wayfinder solution comment | `<Path>{roots.state}/specdev/changes/{change}/investigation/comments/{investigation-id}/NN-solution.md</Path>` | Ticket 的答案、结果事实和资产指针 | 地图索引或产品实现 |
| 架构审查 | `<Path>{roots.state}/specdev/changes/{change}/architecture-review.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/architecture-review.html</Path>` | 深化候选、证据、可视化、选择和访谈状态 | 未经用户选择的执行契约 |

Change CONTEXT/ADR 是 active change 内的执行权威，不是 workflow 级永久知识。G 和其他设计/执行 Works 只读 `<Path>{roots.state}/specdev/context/</Path>` 与 `<Path>{roots.state}/specdev/adr/</Path>`；只有 A 在 change 完成、实现证据验证、毕业评估和用户确认后才能写入永久 namespace。未毕业内容随归档 change 保留，不能从 change 工件消失。

## 2. 权威顺序

同一事项冲突时按下列顺序裁决：

1. 用户最新明确决定；
2. 当前 change 已接受的架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`；
3. 永久 ADR 与领域上下文：`<Path>{roots.state}/specdev/adr/</Path>`、`<Path>{roots.state}/specdev/context/</Path>`；
4. 当前外部行为权威：`<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`；
5. 当前 Ticket 契约：`<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`；
6. 当前跨 Ticket 编排：`<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`；
7. 当前代码与运行事实；
8. 旧计划、旧日志和未经确认的推断。

当前 change 决定与永久知识冲突时，必须在 LOG/ADR 中显式说明替代关系；它只约束当前 change，直到 A 决定是否提升并更新永久版本。

`<Path>{roots.state}/specdev/changes/{change}/source.md</Path>` 只对“原始输入是什么”具有权威；后续用户决定、ADR 和 Spec 可以显式演进该意图。远程来源在摄入后发生变化不会自动改写本地合同，必须重新 Triage。

代码事实可以证明计划已过时，但不能静默改写用户目标或已接受契约。出现这种情况时，按 `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>` 退回相应工件修订。

## 3. 来源追踪

高影响条目应带来源标识：

- `USER-DECISION:<date-or-summary>`；
- `ADR-###`；
- `US-###` 或 `AC-###`；
- `CODE:<Path>project/relative/path</Path>`；
- `RESEARCH:<Url>https://example.com/source</Url>`；
- `DIAG-###`。

来源追踪解释“为什么这样决定”，不要求为普通描述逐句加标签。

## 4. 冲突处理

1. 指明冲突事项和双方来源；
2. 判断冲突属于事实过时、产品取舍、架构取舍、Ticket 范围还是调度问题；
3. 按本规则的权威顺序提出裁决；
4. 若改变外部行为、公共契约、数据、安全、范围、迁移或验收，必须获得用户或指定批准人决定；
5. 更新真正拥有该决策的工件；
6. 在 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` 保留被替代结论和原因；
7. 重新运行 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>`。

不得仅在下游工件中覆盖上游权威。
