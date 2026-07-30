# 工件职责与权威裁决

SpecDev 通过分层工件避免同一决策被多个模型反复重做。每个工件只承担自己的权威边界。

## 1. 工件职责

| 工件 | 具体位置 | 必须决定 | 不应决定 |
|---|---|---|---|
| 分诊 | `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>` | 请求类别、影响、风险、缺失输入和下一 work | 详细实现方案 |
| 诊断 | `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>` | 复现、证据、根因、修复不变量和回归契约 | 未经验证的修复实现 |
| 设计日志 | `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` | 讨论轨迹、确认、延后、替代与废弃结论 | 当前架构权威摘要 |
| 领域上下文 | `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` | 当前领域术语、语义和稳定不变量 | 临时会议记录 |
| 架构决策 | `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` | 已接受架构决策、原因、后果和替代关系 | 尚未决定的方案集合 |
| Spec | `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` | 用户问题、外部行为、范围、验收合同、非功能要求和已锁定实现约束 | 文件级施工步骤 |
| Ticket | `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>` | 单一垂直切片的行为、决策、范围、路径所有权、执行路线和验证证据 | 跨 Ticket 里程碑治理 |
| Tickets Map | `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` | 依赖 DAG、合同覆盖、Ready 投影、并行候选和路径冲突 | 单 Ticket 的完整实现契约 |
| Goal Plan | `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` | 跨 Ticket 调度、Gate、共享所有权、迁移顺序、集成和偏差治理 | 复制 Ticket 全文 |
| Evidence | `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>` | 实际修改、命令、结果、验收映射、偏差、风险和提交引用 | 新的产品或架构决策 |

## 2. 权威顺序

同一事项冲突时按下列顺序裁决：

1. 用户最新明确决定；
2. 当前已接受架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`；
3. 当前外部行为权威：`<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`；
4. 当前 Ticket 契约：`<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`；
5. 当前跨 Ticket 编排：`<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`；
6. 当前代码与运行事实；
7. 旧计划、旧日志和未经确认的推断。

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
