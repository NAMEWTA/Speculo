# 工件职责与权威裁决

SpecDev 通过分层工件避免同一决策被多个模型反复重做。每个工件只承担自己的权威边界。

## 轻量输入与唯一事实

整体结论仅在 change README 顶层唯一 `Outcome: active | completed | cancelled` 行；简单任务的范围、可判定 AC、当前清单、真实验证与下一步也由 README 负责。被工具引用的章节使用唯一显式 `<a id="scope"></a>`、`<a id="acceptance"></a>`、`<a id="verification"></a>` 锚点。无 Ticket 的 Goal 只在原计划维护清单；有独立 Ticket 的进度在票及 Evidence，README/Goal/Map 不复制状态。

工具用临时 `{path, section?}` 定位原文，不创建登记表。存在独立 Spec 默认读取它；仅当前合同允许且 README 等价章节完整时读取 README。两份都自称规格权威时停止裁决，不按时间挑一份。跨 change 集成、Deep、真实并行或复杂设计依赖使用完整工件，迁出位置改成导航；用户明确要求 Spec/Ticket/Goal 时照办。UI 小任务同样保留 DESIGN、具体批准及真实浏览器；LOGIC-only 保留独立验证。无需独立调度或追踪的任务不制造 Ticket/Map；完整获批 Spec 可直接实现，轻量 README 替代规格仍遵守原边界。执行策略见 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path>。

## 1. 工件职责

| 工件 | 具体位置 | 必须决定 | 不应决定 |
|---|---|---|---|
| 来源快照 | `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>` | 原始请求、捕获时间、locator、hash 和关闭能力 | 当前产品合同或实现状态 |
| 分诊 | `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>` | 请求是否成立、核验结果、实施简报、风险、缺失输入、下一 Work 和打标回执 | 开发进度、实施授权或交付状态 |
| 交付 | `<Path>{roots.state}/specdev/changes/{change}/delivery.md</Path>` | 来源 Issue 的 external_action 与 publish 账本指针 | 重复发布进度、本地完成判定或实施简报 |
| 发布账本 | `<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>` | 票级 GitHub 投影的编号、标签、marker、state、publish_action 和发布计数 | Ticket 契约、Evidence 原文或源 Issue 关闭 |
| 捕获账本 | `<Path>{roots.state}/specdev/capture.md</Path>` | 尚未成 Change 的记事项、GitHub inbox 编号、标签、marker 和 inbox 计数；缺失合法 | Change、Ticket、Evidence 或已完成票的发布投影 |
| 诊断 | `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>` | 复现、证据、根因、修复不变量和回归契约 | 未经验证的修复实现 |
| 设计日志 | `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` | 讨论轨迹、确认、延后、替代与废弃结论 | 当前架构权威摘要 |
| 设计树 | `<Path>{roots.state}/specdev/changes/{change}/design-tree.json</Path>` | 决策节点、依赖、当前 frontier、轮次与共识状态 | 领域真相或架构决定正文 |
| Change 领域上下文 | `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` | 本 change 已确认、供下游使用的领域术语和语义 | 永久领域知识或临时会议记录 |
| Change 架构决策 | `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` | 已成为本 change 下游合同的架构决策、原因、后果和替代关系 | 永久项目 ADR 或尚未决定的方案集合 |
| Spec | `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` | 用户问题、外部行为、范围、验收合同、非功能要求和已锁定实现约束 | 文件级施工步骤 |
| Ticket | `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>` | 单一垂直切片的行为、决策、范围、路径所有权、执行路线和验证证据 | 跨 Ticket 里程碑治理或远程 Issue 编号 |
| Tickets Map | `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` | 总体实施背景、项目 Skill 最低调用路由、依赖 DAG、合同覆盖、Gate 导航、并行候选和路径冲突 | 单 Ticket 的完整实现契约、Ready、状态或执行 owner 副本 |
| Goal Plan | `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` | 跨 Ticket 调度、Gate、共享所有权、迁移顺序、集成和偏差治理 | 复制 Ticket 全文 |
| Implementation Map | `<Path>{roots.state}/specdev/changes/{change}/implementation-map.md</Path>` | Ready 成员、组合 Ticket inventory、跨 change dependency/serialization 与 revision | 创建或改写子 Spec、Ticket 或实现细节 |
| Implementation Plan | `<Path>{roots.state}/specdev/changes/{change}/implementation-plan.md</Path>` | 父 Lead、全局 workspace/实现上限、frontier/Wave/locks/integration queue 和可恢复进度投影 | 改写子 change 权威或伪造完成 |
| Implementation Orchestration Evidence | `<Path>{roots.state}/specdev/changes/{change}/evidence/implementation-orchestration.md</Path>` | 成员完成、组合 Ticket 顺序/锁、repository integration、整体验证、漂移和残余风险 | 新产品/架构决定或单 Ticket Evidence 替代品 |
| Evidence | `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>` | 实际修改、命令、结果、验收映射、偏差、风险和提交引用 | 新的产品或架构决策或远程 Issue 正文 |
| 学习图解 | `<Path>{roots.state}/specdev/changes/{change}/learning/index.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/learning/{number}_{topic}.md</Path>` | L 负责需求参考、项目代码、已有 change 或外部资料的讲解，区分事实、观点与推断；索引按序号持续追加，未指定 change 时新建学习载体 | 产品决定、架构决定、实现授权、用户掌握结论或 Learning workflow 知识 |
| 代码审查 | `<Path>{roots.state}/specdev/changes/{change}/reviews/CR-###.md</Path>` | 固定点、标准轴和规范轴 finding | 实施修复或合并两轴排名 |
| 项目设计基线 | <Path>{roots.state}/specdev/design/DESIGN.md</Path> | 跨 change 的语义 token、组件/交互规范、版本及来源；A 唯一正式写入 | 单次页面设计或未批准提案 |
| Change 设计合同 | <Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path> | 本 change 已批准的页面、状态、视觉/交互、基线版本和例外；P 拥有 | 改写永久基线或替代 Spec/ADR |
| UI 设计包 | `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/comparison/</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/final/</Path>` | 项目 UI 检测、模板组合、集中批准证据、可运行 HTML/CSS/JS 源码与浏览器证据 | 生产 UI 实现或替用户确认高影响偏好 |
| Stakeholder 问卷 | `<Path>{roots.state}/specdev/changes/{change}/questionnaires/{slug}.md</Path>` | 第三方原始回答和恢复条件 | 未经转录确认的产品/架构决定 |
| Wayfinder 地图 | `<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>` | 目的地、说明、已关闭决策索引、战争迷雾和范围之外 | 开放 Ticket 正文或答案详情 |
| Wayfinder Ticket | `<Path>{roots.state}/specdev/changes/{change}/investigation/{investigation-id}.md</Path>` | 一个可精确陈述的问题、类型、阻塞和关闭状态 | 解决方案评论或交付目标 |
| Wayfinder solution comment | `<Path>{roots.state}/specdev/changes/{change}/investigation/comments/{investigation-id}/NN-solution.md</Path>` | Ticket 的答案、结果事实和资产指针 | 地图索引或产品实现 |
| 架构审查 | `<Path>{roots.state}/specdev/changes/{change}/architecture-review.md</Path>` | 结构性候选、code-judo 机会、证据、选择和访谈状态 | 未经用户选择的执行契约 |

UI 设计包中的 `{design-id}` 由 P-prototype 分配为当前 change 内最小未占用的 `UI-NNN`；design-system.md 保留文件名但只拥有源码与证据，change DESIGN 是当前设计合同；comparison 与 final 不建立第二套规则。UI 分支按 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path> 处理继承、确认、失效与下游硬引用。

Change CONTEXT/ADR/DESIGN 是 active change 内各自领域的执行权威，不是 workflow 级永久知识。G 和其他设计/执行 Works 只读 `<Path>{roots.state}/specdev/context/</Path>` 与 `<Path>{roots.state}/specdev/adr/</Path>`；ADR/context 的正式写入只有 A 在适用证据、价值评估和具体授权通过后执行；独立维护无需虚构 change，research/非标准 store 仍按实际声明及原 owner 判断，不能自动纳管；design 的首次批准意图发布与归档提升均只经 A 设计网关，按 design-contract 执行。未毕业内容随归档 change 保留，不能从 change 工件消失。

## 2. 权威顺序

先确定问题类型，不以一个万能优先级覆盖全部事实：

- 原始请求由 source 负责；产品目标和真实授权来自用户决定，当前 Spec/README 负责已确认外部行为。
- 当前实现是什么，以真实源码、运行与验证为证；代码不静默授权修改已批准目标。
- 长期取舍由 ADR 负责，领域含义和兼容范围由 context 负责；当前工程用法由负责 docs/源码维护，不复制决策全文。
- 当前 change 的已接受 ADR 约束本次架构；与永久知识冲突必须显式记录替代范围，未通过 A 网关不改永久版本。
- Ticket 拥有本票范围/依赖/写集/实现证据；Goal 和父 Implementation Map/Plan 拥有各自的 Gate、组合依赖、workspace 与集成安排，不能覆盖子行为合同。
- 日志与历史解释出处，未确认推断不能提升为当前事实。

视觉/交互事项先读取已批准 change DESIGN 和其引用的项目设计 revision；它不能覆盖 Spec 的外部行为或 ADR 的架构决定。缺少确认、内容漂移或规则冲突时返回 P，不由下游重新选择设计。

当前 change 决定与永久知识冲突时，必须在 LOG/ADR（设计事项为 DESIGN overrides）中显式说明替代关系；它只约束当前 change，直到 A 决定是否提升并更新永久版本。

`<Path>{roots.state}/specdev/changes/{change}/source.md</Path>` 只对“原始输入是什么”具有权威；后续用户决定、ADR 和 Spec 可以显式演进该意图。远程来源在摄入后发生变化不会自动改写本地合同，必须重新 Triage。GitHub 上由 publish 投影出的 Issue 不是开发权威；发布计数以 `<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>` 为准。GitHub 上由 capture 记下的 inbox Issue 也不是开发权威；inbox 计数以 `<Path>{roots.state}/specdev/capture.md</Path>` 为准，缺失该文件视为空 inbox。

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

## 5. Initiative 与计划调用扩展

W 的 `<Path>{roots.state}/specdev/changes/{change}/initiative.json</Path>` 只拥有候选 change 的边界、未知、依赖和目标指针；每个物化 child 的 Grill、Spec、Ticket 和状态仍独立。候选图不是实施 DAG，也不是共享可写设计树。

新 Ticket/普通 Map 保持原 schema_version，并使用 plan_contract_version: 1 扩展。Ticket 拥有经过核实的 Skill 调用绑定、语义资源和执行计划；Map 路由是其投影。规则为 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>`。计划、产物数量与完成证据漂移必须由对应 owner 修订；不能仅改 map 状态。

父 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 是 goal-tickets-map 无状态入口，只引用现有 Implementation Map/Plan；它不能拥有第二份 status、owner 或任务清单。统一 P 拥有生命周期，旧 O 仅保留入口与恢复键。

## 新增工件 owner

- Delivery：<Path>{roots.state}/specdev/changes/{change}/pull-requests/PR-###.md</Path> 拥有 PR 交付回执；<Path>{roots.state}/specdev/delivery-runs/DEL-###.md</Path> 拥有独立远程操作，绝不复用 external_action/publish_action/capture。
- R-retro：<Path>{roots.state}/specdev/retro/{retro}/RETRO.md</Path> 拥有独立复盘及原文来源；<Path>{roots.state}/specdev/retro/{upgrade}/PLAN.md</Path> 拥有跨报告筛选、具体升级方案与执行依据。`retro`/`upgrade` 是日期主题 ID；按 <Path>{roots.workflows}/specdev/specdev-r-retro/references/records.md</Path> 保存，不成为永久知识或 change 完成证据。A 拥有已批准的 ADR/context 写入及移动/封存。
- P：<Path>{roots.state}/specdev/changes/{change}/prototypes/LOGIC-NNN/logic.md</Path> 记录逻辑模型与浏览器证据；index.html 是可运行原型，ready 时 hash 与记录一致。
- 来源更新：<Path>{roots.state}/specdev/changes/{change}/source.md</Path> 冻结后保持不变。T 将后续读取写入 <Path>{roots.state}/specdev/changes/{change}/sources/SRC-###.md</Path>，记录 replaces、固定 SHA/hash、完整性和原 locator，triage 正文选择有效快照；不得把新远程事实自动升级为已接受 Spec。

## 专业分支的证据归属

R.performance 的测量卡、原始样本引用和优化候选仍由 architecture-review 拥有，不直接修改生产代码。I.documentation 修改获批项目文档并在原本票或 Direct Spec Evidence 保存验证；不另造文档状态。D.evidence-triage 在 diagnosis 的现象/事件节记录观察、未知与下一检查；它不是已经接受的根因或修复合同。具体记录见 <Path>{roots.workflows}/specdev/common/rules/engineering-evidence.md</Path>。

代码、运行证据可以证明计划尚未实现或已过时，但不能改写用户目标。ADR 记录采纳与真实备选；未确认解释属于 LOG/设计树，未完成计划不能进入当前事实摘要。实际文档职责遵守 <Path>{roots.workflows}/specdev/common/rules/documentation-standard.md</Path>。
