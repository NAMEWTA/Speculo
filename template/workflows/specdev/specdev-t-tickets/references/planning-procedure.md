# 拆分 Tickets


Ticket 是**可独立验收的垂直行为切片**：它消除执行者在目标、范围、公共契约、关键顺序和验收上的关键决策，但不展开逐行代码、局部变量或可从现有惯例自然推导的实现细节。

本 work 保留原有能力：代码库探索、prefactor 识别、曳光弹垂直切片、真实阻塞边、用户粒度核对、宽重构的 expand-contract 排序、Ticket 独立文件和总体 Tickets Map。


## 输入

优先读取：

- 当前 Spec：`<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- 当前架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- 当前领域上下文：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- 当前设计日志：`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- Bug 诊断：`<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`
- 永久架构决策：`<Path>{roots.state}/specdev/adr/</Path>`
- 永久领域上下文：`<Path>{roots.state}/specdev/context/</Path>`
- 项目 Agent 指令及其声明的项目 Skill 根；
- 项目当前代码、测试、配置、schema 和 CI 事实。

若尚无 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`，只有在用户提供的计划或对话已经等价覆盖目标、范围、关键决定和可判定验收时才可继续；否则建议先运行 `<Path>{roots.workflows}/specdev/specdev-s-spec/SKILL.md</Path>`。

## 流程

### 1. 输入预检

1. 先读取上游工件索引，按当前 Ticket 的依赖、缺口和冲突关键词定位，再回读相关工件；
2. 检查 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` 的 `ready_for_tickets`；
3. 按 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>` 处理 Spec、ADR、用户决定与代码事实的冲突；
4. 将未知项分类为可发现事实、高影响用户决定和低影响实现细节；
5. 高影响未决问题没有关闭时停止，不通过更详细的 Ticket 文字伪装决策完备。

**完成标准**：拆分依据、权威顺序、合同范围与未决问题已明确。

UI 范围同时读取 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path> 与 <Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>，核对批准、revision/digest、基线、prototype 和页面/状态。每张 UI 票以 `design_ref` 绑定所负责的 pages/acceptance，不能复制一份可独立修改的视觉规则。设计缺失或漂移先返回 P。

### 2. 探索代码库与实现地形

如果尚未探索，进行只读探索：

- 找到行为入口、稳定接口、测试接缝、数据流和错误路径；
- 查找相邻或类似实现，优先复用项目现有模式；
- 沿调用关系和依赖识别预计修改的模块、公共路径、共享文件、迁移索引和全局注册点，以及只需读取或验证的消费者；
- 查找现有测试命令、夹具、类型检查、构建和 CI 门禁；
- 对照 `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` 使用项目领域词汇；
- 对照 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 与 `<Path>{roots.state}/specdev/adr/</Path>` 避免重新争论已接受决策。

按 <Path>{roots.references}/change-scope/change-contract.md</Path> 将预计修改写入各票 `expected_changes`；只需读取的相关文件按原路径合同记入 `read_only_paths`，在原行为与范围、验证方法中说明消费者和验证依据或引用有效的上游分析。`writable_paths` 和 shared owner 仍按真实授权确定，不把影响清单整体复制成可写范围。

先继承上游已经核实的复用依据。遇到陌生模块、方案或外部依赖且依据不足时，使用 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`，再继续拆分。把本票实际使用的研究条目、关键原始 URL 和适配边界写入目标与来源或执行约束；不能只保留 Spec 名称而丢失支持具体实现约束的出处。

#### 项目 Skill 路由

按 <Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path> 区分必需方法和可选知识。先按当前范围定位相关项目 Skill，不强制全库扫描。用户/安全/验收指定的方法在 Ticket 绑定；普通 Skill 可执行中渐进发现，不预列完整最低路由。Map 可记录导航，未列出的可选方法仍可用；没有适用方法不制造“已扫描”形式记录。

#### Prefactor

遵循“让变更变容易，然后做容易的变更”：

- 如果当前接口、依赖或接缝会使后续实现明显不安全或重复，提出前置 prefactor Ticket；
- prefactor 必须说明它解除的具体阻碍；
- prefactor 必须独立有价值且可验证；
- 不为了“更干净”而创建与目标无关的重构 Ticket。

**完成标准**：实现地形、稳定接缝、共享路径、必要 prefactor 与逐 Ticket 项目 Skill 路由已识别。

### 3. 草拟曳光弹式垂直切片

加载 `<Path>{roots.workflows}/specdev/specdev-t-tickets/references/decomposition-rules.md</Path>`。每个切片应横向穿过交付该行为所需的最小层次组合，而不是把数据库、后端、前端和测试拆成互相无价值的水平 Ticket。

每个 Ticket 必须：

- 交付一个可观察行为，或一个能独立解除后续阻塞的安全准备能力；
- 完成后可以独立演示、测试或验证；
- 粒度适合一个全新 Agent 上下文在不中断的情况下完成；这是可交接性要求，实际执行可由同一个 Agent 连续完成多票，无需逐票新建 Agent 或会话；
- 与其他 Ticket 有实质行为差异；
- 只依赖真正阻止它开始的前置产物；
- 自带至少一种完成证据。

#### 宽重构例外

字段重命名、共享符号类型变化、协议升级等宽机械变更无法安全塞入单个垂直切片时，按以下顺序：

1. **Expand**：在旧形式旁增加新形式，保持旧调用方可工作；
2. **Migrate batches**：按包、目录、消费者或风险分批迁移，每批独立成 Ticket；
3. **Contract**：确认旧调用点为零后删除旧形式；
4. 若迁移批次无法各自保持绿色，使用隔离集成分支和最终集成验证 Gate，但仍保留明确的批次与责任边界。

**完成标准**：每个 Ticket 的可观察产出、真实阻塞边和验证方式已草拟。

### 4. 判定规划深度与风险

按 `<Path>{roots.workflows}/specdev/common/rules/readiness-and-depth.md</Path>` 为每个 Ticket 标注：

- `lite`：局部、可逆、沿用既有模式、无公共契约或迁移影响；
- `standard`：大多数多文件或跨层垂直切片；
- `deep`：公共 API/schema、数据迁移、安全/隐私/资金、不可逆操作、expand-contract、共享核心路径、多个 implementation owner 的跨 Ticket 写入协调或高事故半径。

规划深度不是优先级，也不是 Gate。每个 Ticket 必须记录触发该深度的原因。

### 5. 写成可交接的垂直切片 Ticket

仅对必需方法按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 填写真实绑定；可选知识按需使用并记录。Map 导航不能替代实际调用。

使用 `<Path>{roots.workflows}/specdev/specdev-t-tickets/assets/ticket-template.md</Path>`：正文只写目标与来源、垂直行为与范围、验收和验证、本票执行约束及适用风险。依赖、路径、资源和项目 Skill 调用以原 frontmatter 为准；不在正文维护镜像。

引用上游 AC/ADR，只补充本票差异。公共合同、关键安全顺序和验收必须确定；局部实现选择交给 I。Lite/Standard/Deep 决定需要展开的实际风险，不规定执行步数，也不要求无关栏目逐项填“不适用”。通用实现、风险适配审查、集成、停止与恢复沿 I 入口执行。

### 6. 构建依赖 DAG、合同覆盖与并发检查

1. 使用 Ticket ID 建立 `blocked_by`；
2. 检测循环和不存在的引用；
3. 识别根 Ticket、汇合点、扇出与收缩点；
4. 为每个 Spec 验收合同映射至少一个 Ticket；
5. 检查并行候选的 `writable_paths` 是否相交；
6. 共享路径必须指定唯一 owner，通常由专门 Ticket 或明确的集成 owner 修改；
7. 不得用依赖边表达“可能更方便”或纯粹的人员交接。

使用 `<Path>{roots.workflows}/specdev/specdev-t-tickets/assets/tickets-map-template.md</Path>` 草拟总体 Map；写入所有 Ticket 共享的总体实施背景；项目 Skill 导航按需记录，不要求每票完整覆盖。明确标记的必需方法仍须绑定。

### 7. Definition of Ready

加载 `<Path>{roots.workflows}/specdev/specdev-t-tickets/references/ticket-readiness.md</Path>` 逐个检查。

存在以下任一情况时 `ready: false`：

- 会改变行为、接口、数据、兼容、安全、范围或验收的未决问题；
- 依赖缺失或 DAG 有环；
- 可写路径不明确或并行所有权冲突；
- 验证方法不能执行且没有批准的替代证据；
- Ticket 未声明 E2E required/not-required 及理由，或未指定 Lead 在稳定 change-workspace 上验收；
- Tickets Map 缺少总体实施背景，或必需方法缺失、漂移、路径越界；普通可选方法的发现/更新不阻塞 Ready；
- 无法冻结真实交付、满足风险适用的审查要求或提供验收证据；未获提交授权本身不阻塞快照验收；
- 单个新上下文无法完成；
- 真实迁移、安全操作等不可交换顺序未明确；
- Deep 实际风险需要的迁移、兼容、恢复或批准点未闭合。

### 8. 与用户核对

以完整编号列表展示所有 Ticket，至少包含：

- 标题；
- 可观察交付；
- 被阻塞于；
- Planning Depth 与触发原因；
- 风险；
- Ready 状态；
- 关键未决问题；
- 预计并行组和共享路径 owner；
- 适用的必需方法及可选知识导航。

核对：

- 粒度是否适合单一上下文；
- 是否出现水平切片；
- 阻塞边是否真实；
- 是否应合并、进一步拆分或增加 prefactor；
- 合同是否全部覆盖；
- 路径所有权和验证是否可信。

每次修改后重新展示完整列表，直到用户批准。用户明确要求一次性自主规划且不存在高影响未知项时，可使用推荐默认值并把假设写入 Ticket，不为形式重复询问。

### 9. 发布

创建：

- Ticket 目录：`<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- Tickets Map：`<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- Evidence 目录：`<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`

按拓扑顺序写入 Ticket：

```text
<Path>{roots.state}/specdev/changes/{change}/ticket/NN-<ticket-name>.md</Path>
```

`NN` 使用两位或更多位零填充数字；Ticket frontmatter ID 使用 `T-NN`。Ticket 的 `blocked_by` 使用 Ticket ID，而不是相对文件路径。

使用 `<Path>{roots.workflows}/specdev/specdev-t-tickets/assets/ticket-template.md</Path>` 和 `<Path>{roots.workflows}/specdev/specdev-t-tickets/assets/tickets-map-template.md</Path>` 生成工件，并对照：

- `<Path>{roots.workflows}/specdev/common/schemas/ticket.schema.json</Path>`
- `<Path>{roots.workflows}/specdev/common/schemas/tickets-map.schema.json</Path>`

运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage tickets \
  --repo <project-root> \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

回读 Ticket 的状态、Map 的依赖/导航以及 README 接续点，不另写状态镜像。

## 完成标准

- Ticket 目录和 Map 已写入完整 Path 标签 所指位置；
- Spec 合同全部 covered 或有明确批准的 deferred；
- DAG 无环、阻塞引用存在；
- Ready Ticket 无高影响未知项；
- 并行 Ticket 无未解决的可写冲突；
- 每个 Ticket 可独立验证且适配单一上下文；
- Tickets Map 已记录总体实施背景；每个 Ticket 被项目 Skill 读取矩阵覆盖，Skill 路径存在且为项目根相对路径；
- Prefactor 与 expand-contract 使用条件正确；
- 用户已批准拆分或明确授权自主发布；
- 校验器无 error。

## 子文件引用

- 拆分规则：`<Path>{roots.workflows}/specdev/specdev-t-tickets/references/decomposition-rules.md</Path>`
- Ticket 就绪规则：`<Path>{roots.workflows}/specdev/specdev-t-tickets/references/ticket-readiness.md</Path>`
- Ticket 模板：`<Path>{roots.workflows}/specdev/specdev-t-tickets/assets/ticket-template.md</Path>`
- Tickets Map 模板：`<Path>{roots.workflows}/specdev/specdev-t-tickets/assets/tickets-map-template.md</Path>`

## 下一步

满足任一情况时建议运行 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path>`：Ticket 数量达到或超过 10、存在多个 implementation owner 的并行写入协调、Deep Ticket、迁移、共享契约、多个 Gate 或高风险发布。只读 review/research 并行本身不触发 Goal Plan；少量线性 Ready Ticket 可直接进入 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`。

