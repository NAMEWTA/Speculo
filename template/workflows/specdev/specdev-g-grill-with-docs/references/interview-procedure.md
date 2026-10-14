# 设计访谈（带文档）


不留情面地访谈用户，直到达成共识。把这件事映射为一棵**设计树（design tree）**：每个决策都会分出挂在它下面的后续决策。

按**轮次**推进这棵树。**前沿（frontier）** 是所有前置条件已经确定的决策——那些现在就能问、不必猜测尚未得到答案的问题。每轮询问完整 frontier；用户的答案会重塑设计树并解除下一层问题的阻塞。

本 work 只把访谈写成当前 change 的可恢复工件：设计树保存进度，LOG 保存讨论轨迹，CONTEXT 保存本 change 已确认的规范语言，ADR 保存已成为本 change 下游合同的架构决定。这些工件不等于项目永久知识，也不构成实现授权；永久 namespace 对 G 只读，只有 `<Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/SKILL.md</Path>` 能在实现证据、毕业评估和用户确认通过后执行提升。


## 输入与产物

按存在情况读取：

- `<Path>{roots.state}/specdev/config.json</Path>`
- `<Path>{roots.state}/specdev/adr/</Path>`（只读永久基线）
- `<Path>{roots.state}/specdev/context/</Path>`（只读永久基线）
- `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/planning-principles.md</Path>`

本 work 拥有：

- `<Path>{roots.state}/specdev/changes/{change}/design-tree.json</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/questionnaires/</Path>`，仅在第三方 stakeholder 持有阻塞答案时延迟创建。

不存在的可选输入静默跳过，不把缺失文件伪装成已知事实。

## 流程

### 1. 启动或恢复 change

创建或恢复 `<Path>{roots.state}/specdev/changes/{change}/</Path>`。首次真实任务创建 <Path>{roots.state}/specdev/changes/{change}/README.md</Path> 的 Outcome active、范围与接续；ADR/LOG/CONTEXT 在有实际决定/语义时创建，使用设计树时以 `<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/assets/design-tree-template.json</Path>` 为模板创建 `<Path>{roots.state}/specdev/changes/{change}/design-tree.json</Path>`。

分别使用：

- `<Path>{roots.workflows}/specdev/common/rules/adr-format.md</Path>`
- `<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/references/log-format.md</Path>`
- `<Path>{roots.workflows}/specdev/common/rules/context-format.md</Path>`
- `<Path>{roots.workflows}/specdev/common/schemas/design-tree.schema.json</Path>`

恢复时读取 README 接续与 design tree，再按当前节点及其引用读取实际存在的 LOG、CONTEXT、ADR；没有对应决定或领域语义时允许文件不存在。已关闭节点的决定和 LOG 引用必须可回读，避免重复询问已关闭问题。

**完成标准**：当前分支必要工件可读取；节点依赖无环，所有实际 LOG 指针可解析，当前 frontier 可确定。未产生内容的可选工件不创建空文件；已引用工件缺失时阻塞依赖该证据的恢复。

### 2. 查找事实

查找*事实*是 Agent 的工作，永远不是用户的。先探索相关代码、配置、接口、schema、测试、历史 ADR 和相邻实现。

当前沿问题需要来自环境的事实时，派遣独立探索去查找。不要阻塞等待：一次进行中的探索是一个未解决的前置条件，所以只有它下游的问题等待结果；现在就继续处理 frontier 的其余部分。不熟悉的外部技术使用 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`。

将未知项分为：

- 可发现事实：探索或研究，不询问用户；
- 高影响决策：进入设计树；
- 低影响实现细节：记录为实现者可自行决定，不制造决策节点。

阻塞答案既不可发现、当前用户也无法回答、但另一个明确 stakeholder 掌握时，加载 `<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/references/stakeholder-questionnaire.md</Path>`，生成问卷并保存恢复条件；不在本轮继续猜测该分支。

**完成标准**：每个候选问题已分类；用户只接收无法从环境发现的真实决策。

### 3. 建立设计树

围绕目标、角色、范围、主要流程、状态与失败、数据与接口、兼容与迁移、安全与隐私、性能与可观测性、验证与验收建立适用节点。

每个节点包含稳定 `D-###`、标题、问题、依赖、推荐答案和状态。只有问题本身已经可以精确陈述时才创建节点；依赖尚未确定的节点可以存在，但不进入 frontier。

**完成标准**：每个高影响已知决策有且只有一个节点；每条依赖指向真实上游节点；没有默默采用的高影响假设。

### 4. 逐轮推进完整 frontier

加载 `<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/references/grilling-protocol.md</Path>`。每轮原子增加 `round`，重读设计树并计算完整 frontier。按协议格式给每个问题编号并附推荐答案，然后等待用户回答。

用户回答后：

1. 为每个回答更新对应节点；
2. 每个节点各追加一条 LOG，不把多个决定压成一条；
3. 根据回答增加、删除或重新连接后续节点；
4. 重新计算 frontier，进入下一轮。

一个答案依赖本轮仍开放问题的提问属于后续轮次。用户延后且该决定会影响外部行为、公共接口、数据、安全、兼容、迁移或验收时，保持 blocked，不把它伪装成共识。

**完成标准**：本轮开始时的完整 frontier 每个节点都有回答、明确延后或阻塞记录；所有状态已原子写入并重读。

### 5. 同步 change-local 领域模型

加载 `<Path>{roots.workflows}/specdev/common/rules/domain-modeling.md</Path>`。每轮先写 LOG，再把已确认且本 change 下游必须使用的项目规范术语同步到 change CONTEXT，最后把有持续决策价值、已有真实依据且成为本 change 合同的架构决定写入 change ADR。

历史轨迹只留在 LOG；未确认选项不写成已接受 ADR；已有 change ADR 被替代时建立 supersedes 链。同步只更新本 change 工件，不创建、合并或改写永久 `context/`、`adr/`；它记录共识生长过程，不授权产品实现。

**完成标准**：实际形成的 LOG、CONTEXT、ADR 与 design tree 无冲突；每个同步结论都有用户回答或事实来源，没有相应结论的可选工件保持缺省；永久 namespace 未被修改。

### 6. 共识确认与路由

frontier 为空时，向用户确认设计树的每个分支均已走过且已经达成共识。用户指出遗漏时新增节点并继续；只有明确确认后把 design tree 标为 `consensus`。

路由前使用 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>` 的 `--stage grill` 校验当前 change；失败时保持本 Work 可恢复状态，不发布共识。

随后按成熟度路由：

- 通常进入 `<Path>{roots.workflows}/specdev/specdev-s-spec/SKILL.md</Path>`；
- 外部行为已经完全明确时进入 `<Path>{roots.workflows}/specdev/specdev-t-tickets/SKILL.md</Path>`；
- 获批的极小局部工作可进入 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；
- 路径或关键事实仍未知时进入 `<Path>{roots.workflows}/specdev/specdev-w-wayfinder/SKILL.md</Path>`。

回读实际已形成的决定/领域/日志/设计树工件，将接续导航留 README，返回真实工件和下一 Work 完整路径；无内容不为数量预建空文件。不自动执行下一 work。

## 完成标准

- 设计树的每个适用分支都已走过，没有高影响事项被默默假定；
- 每轮询问的是完整 frontier，依赖未关闭的问题没有提前出现；
- 可发现事实由 Agent 查找，没有转交用户；
- design tree 通过 schema，LOG 指针完整；
- CONTEXT 只包含当前 change 已确认的规范语言，ADR 只包含满足条件且已成为本 change 合同的架构决定；
- 永久 `context/`、`adr/` 保持只读，未在 G 中执行知识提升；
- frontier 为空且用户明确确认共识；
- 状态、权威工件和下一 work 路径已返回；
- 未执行产品实现。

## 子文件引用

- 质询协议：`<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/references/grilling-protocol.md</Path>`
- 设计树模板：`<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/assets/design-tree-template.json</Path>`
- 领域建模：`<Path>{roots.workflows}/specdev/common/rules/domain-modeling.md</Path>`
- ADR 格式：`<Path>{roots.workflows}/specdev/common/rules/adr-format.md</Path>`
- CONTEXT 格式：`<Path>{roots.workflows}/specdev/common/rules/context-format.md</Path>`
- LOG 格式：`<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/references/log-format.md</Path>`
- Stakeholder 问卷：`<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/references/stakeholder-questionnaire.md</Path>`

## 决策记录的完整性

结晶时区分采纳决定与实际落地；ADR 留真实备选、理由、代价、适用范围和验证义务，未确认解释留 LOG。以后路径/命名变化更新当前事实，决定改变则保留取代关系；永久知识仍经 A，不把提案当作已实现。
