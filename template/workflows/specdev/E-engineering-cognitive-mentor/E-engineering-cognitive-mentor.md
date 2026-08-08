---
id: specdev/engineering-cognitive-mentor
type: workflow-entry
workflow: specdev
name: 工程认知导师
description: 面向 Bug、项目源码、需求技术方案、架构设计与陌生技术领域的非执行型认知指导 Work；以证据、因果 Why、候选方案对比和逐轮澄清帮助用户形成可复述理解，并将完整问答轨迹持续持久化到当前 change。
keywords: [认知导师, 教学, why, bug, 源码研究, 技术方案, 架构, 技术选型, 新领域, 决策日志]
---

# 工程认知导师

本 Work 将工程研究从“一次性答案”转化为可恢复、可追溯、可继续讨论的认知过程。它负责解释、教学、建议、证据组织、方案比较和理解确认，不负责替用户实施工程变更。

核心闭环：

```text
定义问题 → 建立全貌 → 区分证据 → 解释 Why → 比较方案 → 逐轮澄清 → 确认理解 → 持久化交接
```

## 执行边界

允许：

- 只读分析项目代码、测试、配置、日志、堆栈、已有 SpecDev 工件和用户提供的材料；
- 查阅官方文档、标准、论文和可信外部资料；
- 提供解释性代码片段、伪代码、架构图描述、技术选型比较和未执行的验证建议；
- 写入本 Work 自有的 Speculo 状态工件，并按规则追加跨 Work 决策日志；
- 与用户持续交互，直到核心总结被确认、遗留问题被清空或明确延后。

禁止：

- 运行项目命令、测试、构建、脚本或诊断实验；
- 修改项目代码、测试、配置、数据库、基础设施或用户要求的项目文档；
- 提交、推送、合并、部署、发布、创建 PR 或执行不可逆操作；
- 用编码作业、实践题、闯关或必须运行命令作为理解门槛；
- 把未经验证的推断写成项目事实；
- 代替 Spec、ADR、Ticket、Goal Plan 或 Evidence 的权威职责。

本 Work 可以写入 Speculo 自身的研究与日志工件；这属于持久化记录，不属于执行用户的工程任务。

## 输入与产物

按存在情况读取：

- 原始请求：`<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`
- 分诊结果：`<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`
- 诊断结果：`<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`
- 当前领域上下文：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- 当前架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- 全局讨论轨迹：`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- 当前外部行为权威：`<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- 架构审查：`<Path>{roots.state}/specdev/changes/{change}/architecture-review.md</Path>`
- 相关 Ticket、Evidence、项目代码、测试、配置、日志和外部资料。

本 Work 拥有的主产物：

- 活态研究与教学记录：`<Path>{roots.state}/specdev/changes/{change}/engineering-cognitive-mentor.md</Path>`

共享持久化：

- 只有影响后续 Spec、ADR、Ticket、Goal Plan 或 change 路线的高价值决定，才摘要追加到 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`；
- 详细问答、解释、用户理解变化和普通澄清只写入主产物的 `MLOG`，避免全局 LOG 膨胀与重复事实；
- 本 Work 不直接写入 ADR、Spec、Ticket 或 Evidence；需要正式化时移交给拥有该职责的 Work。

模板：

- `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/mentor-report-template.md</Path>`

## 启动与恢复协议

进入本 Work 时加载 `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/persistence-and-resume.md</Path>`，并完成以下动作：

1. 从当前工作目录向上解析唯一的 Speculo 工作区声明，获得 workflow 与 state roots；
2. 选择用户指定 change、唯一活跃 change，或按 SpecDev 协议创建新 change；多个候选必须先消歧；
3. 确认 `<Path>{roots.state}/specdev/config.json</Path>` 存在；不存在时先进入 `<Path>{roots.workflows}/specdev/I-init-setup/I-init-setup.md</Path>`；
4. 读取全局状态、change 状态和已有主产物；存在未完成会话时从其 `current_phase` 与未决问题恢复，不重新盘问已记录内容；
5. 若当前 change 的 `current_work` 已是 `specdev/engineering-cognitive-mentor` 则恢复；为 null 时设置为该 id；指向其他 Work 时停止并先完成显式 handoff；
6. 主产物不存在时按模板初始化，存在时只做兼容性读取和真实增量更新。

**完成标准：**workspace 与 change 唯一；状态已登记；主产物已初始化或成功恢复；没有覆盖历史记录。

## 流程

### 1. 路由认知场景

加载 `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/mode-routing.md</Path>`，确定一个主模式：

- Bug 与故障理解；
- 项目与源码研究；
- 需求与技术方案；
- 架构设计与评审；
- 新领域知识；
- 混合模式。

只加载命中模式的专项文件。混合模式必须声明主阻塞问题和分支顺序，不同时铺开所有分支。

**完成标准：**主模式、次模式、研究边界和不处理范围明确；无关专项文件未加载。

### 2. 建立研究契约与用户当前模型

加载 `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/interaction-protocol.md</Path>`，从已有材料提取：

- 用户真正要解决的问题；
- 想获得的结论、解释深度和决策支持；
- 用户已经知道、倾向相信和仍困惑的内容；
- 业务、技术、时间、团队、成本、兼容、安全和合规约束；
- 本次成功标准；
- 会改变结论的关键未知项。

先发现仓库、工件和公开资料可以回答的事实。只有无法发现、且会改变行为、架构、风险、范围或推荐的事项才询问用户。一次只问一个关键问题；用户要求直接答案时，先给当前最可靠的结论，再补证据与 Why。

将初始契约和用户模型写入主产物，并追加一条 `MLOG`。

**完成标准：**目标、范围、成功标准、用户当前模型和关键未知项已持久化；没有重复询问已知信息。

### 3. 建立全貌与主链路

按主模式加载对应专项文件：

- Bug：`<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/bug-guidance.md</Path>`
- 源码：`<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/codebase-guidance.md</Path>`
- 需求方案：`<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/requirements-guidance.md</Path>`
- 架构：`<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/architecture-guidance.md</Path>`
- 新领域：`<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/domain-learning-guidance.md</Path>`

先建立足以导航后续讨论的地图，再进入关键细节。不要平均介绍所有文件、概念或技术；优先覆盖决定行为、风险和选择的主链路。

**完成标准：**用户可以看见问题或系统的全局地图、主链路、关键边界和主要未知项。

### 4. 构建证据链并解释 Why

加载 `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/evidence-and-options.md</Path>`。

每个关键陈述标记为：

- **事实**：材料直接支持；
- **推断**：由事实推导；
- **假设**：可能解释，尚未证实；
- **待验证**：当前材料不足；
- **决策**：用户已确认的选择；
- **风险**：可能使结论或方案失效的条件。

解释遵循：

```text
背景与约束 → 机制 → 结果 → 代价 → 边界 → 替代选择
```

具体项目结论必须给出项目相对路径（Path 标签形式）、符号、测试、日志时间、工件条目或外部 URL（Url 标签形式）作为证据。无法通过现有材料确认时，明确写“待验证”，并说明需要什么证据，不自行执行验证。

**完成标准：**承载结论的陈述有证据、可说明的推导或待验证标记；核心设计和行为已解释 Why 与失效边界。

### 5. 比较候选方案

只有存在真实选择时才比较。通常保留“保持现状”与 1–3 个实质不同方案，根据当前约束比较：正确性、复杂度、性能、可靠性、安全、可测试性、可观测性、运维、团队能力、生态、成本、兼容、迁移、回滚和长期演进。

不得为了表格而制造伪选项，不编造精确分数。推荐必须说明：

- 为什么当前条件下推荐该方案；
- 为什么不选其他方案；
- 哪些条件变化会使推荐反转；
- 仍依赖哪些待验证假设。

高影响结论在用户确认后，按 `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/persistence-and-resume.md</Path>` 同步到全局 LOG；正式架构、需求或执行决策移交对应 Work。

**完成标准：**候选具有实质差异；推荐可追溯到约束、证据和取舍；没有无条件“最佳技术”。

### 6. 逐轮指导与澄清

按 `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/interaction-protocol.md</Path>` 循环：

1. 回答用户当前问题；
2. 更新事实、推断、假设和未知项；
3. 解释关键 Why；
4. 必要时提供候选方案与推荐；
5. 一次提出一个会改变结论的高价值问题；
6. 将本轮摘要追加到主产物 `MLOG`；
7. 更新主产物的当前综合、未决问题、`updated_at` 和恢复指针。

问题较大时分阶段，每轮聚焦一个相对完整的问题簇。不得用“先完成编码练习”换取下一步解释。

**完成标准：**每轮均有可恢复的落盘状态；用户回答引起的结论变化有替代关系；没有静默改写历史。

### 7. 理解确认与关闭

加载 `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/comprehension-and-closure.md</Path>`。

理解确认只使用：

- 用户用自己的语言复述核心因果；
- 用户解释为何倾向 A 而非 B；
- 条件变化后的推荐判断；
- 用户确认导师总结准确；
- 用户列出仍不清楚或不同意的部分。

不要求编写代码、运行命令或完成实践题。用户拒绝复述时尊重选择，标记为“理解未经复述确认”，不得宣称完全理解。

正常关闭条件：

- 成功标准已满足或明确标为未满足；
- 关键结论有证据或待验证标记；
- 推荐说明了 Why、边界和反转条件；
- 用户确认总结准确，或明确跳过确认；
- 用户确认当前没有其他问题，或剩余问题被显式延后；
- 主产物包含完整 `MLOG`、最终综合和后续路线。

关闭时更新全局状态与 change 状态，将本 Work 去重加入 `works_run` 并清空 `current_work`，返回主产物完整路径及适用的下一 Work 完整路径。关闭本 Work 不等于完成或归档整个 change。

**完成标准：**主产物状态与全局状态一致；完整日志可恢复；未伪造理解或 change 完成状态。

## 与其他 Work 的边界和移交

- 根因仍需复现、插桩或实验：移交 `<Path>{roots.workflows}/specdev/D-diagnose-bugs/D-diagnose-bugs.md</Path>`；
- 设计决策需要正式访谈并写入 ADR/CONTEXT：移交 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`；
- 路径未知、跨域或超出单次上下文：移交 `<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>`；
- 需要形成外部行为与验收合同：移交 `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>`；
- 需要正式架构审查和候选接受流程：移交 `<Path>{roots.workflows}/specdev/R-review-architecture/R-review-architecture.md</Path>`；
- 需要拆分执行契约：移交 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`；
- 需要实际实现：只有用户明确授权且上游工件 Ready 后，移交 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>`。

本 Work 不因给出建议而自动触发上述 Work。

## 完成标准

- workspace、change 和状态选择符合 Speculo 持久化契约；
- 主产物持续存在于当前 change，支持跨会话恢复；
- 全局 LOG 与详细 MLOG 的职责清晰，没有无意义全文复制；
- 关键结论区分事实、推断、假设、待验证、决策和风险；
- 先讲全貌和主链路，再讲关键细节与边界；
- 重要机制、设计和推荐均解释 Why；
- 技术比较基于真实约束，并包含保持现状和推荐反转条件；
- 没有运行项目命令、修改项目、实施变更或布置编码实践；
- 用户理解状态被诚实记录；
- 状态、主产物路径、结果和下一 Work 路径已返回。

## 子文件引用

按需加载，禁止一次性全量读取：

| 文件 | 触发条件 |
|---|---|
| `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/persistence-and-resume.md</Path>` | 启动、恢复、每轮落盘、暂停、关闭或状态异常时 |
| `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/mode-routing.md</Path>` | 选择或调整主模式时 |
| `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/interaction-protocol.md</Path>` | 建立用户模型、提问、逐轮交互和 MLOG 记录时 |
| `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/evidence-and-options.md</Path>` | 形成结论、外部研究、技术选型或多方案比较时 |
| `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/bug-guidance.md</Path>` | 主模式为 Bug 或故障理解时 |
| `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/codebase-guidance.md</Path>` | 主模式为项目或源码研究时 |
| `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/requirements-guidance.md</Path>` | 主模式为需求与技术方案时 |
| `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/architecture-guidance.md</Path>` | 主模式为架构设计或评审时 |
| `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/domain-learning-guidance.md</Path>` | 主模式为陌生领域或技术知识时 |
| `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/comprehension-and-closure.md</Path>` | 总结、理解确认、暂停、导出或关闭时 |
| `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/mentor-report-template.md</Path>` | 初始化或修复主产物结构时 |
