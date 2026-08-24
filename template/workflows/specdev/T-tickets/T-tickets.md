---
id: specdev/tickets
type: workflow-entry
workflow: specdev
name: 拆分 Tickets
description: 将 Spec、计划或已确认对话拆成曳光弹式垂直切片；每个 Ticket 决策完备、可独立验证、适配单一上下文，并建立阻塞 DAG、路径所有权和执行就绪门禁。
keywords: [tickets, 拆分, 垂直切片, 阻塞, 曳光弹, decision-complete, readiness]
---

# 拆分 Tickets

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

Ticket 是**决策完备的微型执行计划**：它消除执行者在目标、范围、公共契约、关键顺序和验收上的关键决策，但不展开逐行代码、局部变量或可从现有惯例自然推导的实现细节。

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
- 项目当前代码、测试、配置、schema 和 CI 事实。

若尚无 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`，只有在用户提供的计划或对话已经等价覆盖目标、范围、关键决定和可判定验收时才可继续；否则建议先运行 `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>`。

## 流程

### 1. 输入预检

1. 读取所有存在的上游工件；
2. 检查 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` 的 `ready_for_tickets`；
3. 按 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>` 处理 Spec、ADR、用户决定与代码事实的冲突；
4. 将未知项分类为可发现事实、高影响用户决定和低影响实现细节；
5. 高影响未决问题没有关闭时停止，不通过更详细的 Ticket 文字伪装决策完备。

**完成标准**：拆分依据、权威顺序、合同范围与未决问题已明确。

### 2. 探索代码库与实现地形

如果尚未探索，进行只读探索：

- 找到行为入口、稳定接口、测试接缝、数据流和错误路径；
- 查找相邻或类似实现，优先复用项目现有模式；
- 识别可能修改的模块、公共路径、共享文件、迁移索引和全局注册点；
- 查找现有测试命令、夹具、类型检查、构建和 CI 门禁；
- 对照 `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` 使用项目领域词汇；
- 对照 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 与 `<Path>{roots.state}/specdev/adr/</Path>` 避免重新争论已接受决策。

遇到不熟悉的模块、外部依赖或第三方库时，使用 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`，再继续拆分。

#### Prefactor

遵循“让变更变容易，然后做容易的变更”：

- 如果当前接口、依赖或接缝会使后续实现明显不安全或重复，提出前置 prefactor Ticket；
- prefactor 必须说明它解除的具体阻碍；
- prefactor 必须独立有价值且可验证；
- 不为了“更干净”而创建与目标无关的重构 Ticket。

**完成标准**：实现地形、稳定接缝、共享路径与必要 prefactor 已识别。

### 3. 草拟曳光弹式垂直切片

加载 `<Path>{roots.workflows}/specdev/T-tickets/decomposition-rules.md</Path>`。每个切片应横向穿过交付该行为所需的最小层次组合，而不是把数据库、后端、前端和测试拆成互相无价值的水平 Ticket。

每个 Ticket 必须：

- 交付一个可观察行为，或一个能独立解除后续阻塞的安全准备能力；
- 完成后可以独立演示、测试或验证；
- 适合一个全新 Agent 上下文在不中断的情况下完成；
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

### 5. 写成决策完备 Ticket

使用 `<Path>{roots.workflows}/specdev/T-tickets/ticket-template.md</Path>` 填写：

- 战略目标、可观察产出与来源追踪；
- 当前代码事实和需求差距；
- 已锁定决策、低影响假设和未决问题；
- IN / REUSE / OUT；
- 用户或调用者视角的端到端行为；
- Standard/Deep 的接口、输入输出、不变量、数据流、失败与兼容契约；
- 有序执行路线和安全落点；
- expected、writable、read-only、shared 路径；
- 正常、失败和回归验证矩阵；
- 每个 Ticket 按 Goal Plan 的 workspace 策略定义 current-workspace/direct-parent 或 source-worktree/parent-candidate 检查，以及按实际跨边界风险判定的 E2E disposition；
- 每个实现 Ticket 的 implementation commit 与对应父分支完成条件；仅 required 模式创建独立 worktree；
- Deep 的迁移、兼容窗口、监控、回滚和不可逆批准点；
- 可判定验收标准。

路径所有权必须遵守 `<Path>{roots.workflows}/specdev/common/rules/path-ownership.md</Path>`，证据设计必须遵守 `<Path>{roots.workflows}/specdev/common/rules/evidence-and-verification.md</Path>`。

### 6. 构建依赖 DAG、合同覆盖与并发检查

1. 使用 Ticket ID 建立 `blocked_by`；
2. 检测循环和不存在的引用；
3. 识别根 Ticket、汇合点、扇出与收缩点；
4. 为每个 Spec 验收合同映射至少一个 Ticket；
5. 检查并行候选的 `writable_paths` 是否相交；
6. 共享路径必须指定唯一 owner，通常由专门 Ticket 或明确的集成 owner 修改；
7. 不得用依赖边表达“可能更方便”或纯粹的人员交接。

使用 `<Path>{roots.workflows}/specdev/T-tickets/tickets-map-template.md</Path>` 草拟总体 Map。

### 7. Definition of Ready

加载 `<Path>{roots.workflows}/specdev/T-tickets/ticket-readiness.md</Path>` 逐个检查。

存在以下任一情况时 `ready: false`：

- 会改变行为、接口、数据、兼容、安全、范围或验收的未决问题；
- 依赖缺失或 DAG 有环；
- 可写路径不明确或并行所有权冲突；
- 验证方法不能执行且没有批准的替代证据；
- Ticket 未声明 E2E required/not-required 及理由，或在 required 模式把 E2E 安排到 source worktree；
- 无法形成实现 commit 与 Goal Plan 所选 direct-parent/candidate-merge 父分支出口；
- 单个新上下文无法完成；
- Standard/Deep 缺少有序执行路线；
- Deep 缺少迁移、兼容、监控、回滚或批准点。

### 8. 与用户核对

以完整编号列表展示所有 Ticket，至少包含：

- 标题；
- 可观察交付；
- 被阻塞于；
- Planning Depth 与触发原因；
- 风险；
- Ready 状态；
- 关键未决问题；
- 预计并行组和共享路径 owner。

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

使用 `<Path>{roots.workflows}/specdev/T-tickets/ticket-template.md</Path>` 和 `<Path>{roots.workflows}/specdev/T-tickets/tickets-map-template.md</Path>` 生成工件，并对照：

- `<Path>{roots.workflows}/specdev/common/schemas/ticket.schema.json</Path>`
- `<Path>{roots.workflows}/specdev/common/schemas/tickets-map.schema.json</Path>`

运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage tickets \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

更新 `<Path>{roots.state}/specdev/status.json</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`。

## 完成标准

- Ticket 目录和 Map 已写入完整 Path 标签 所指位置；
- Spec 合同全部 covered 或有明确批准的 deferred；
- DAG 无环、阻塞引用存在；
- Ready Ticket 无高影响未知项；
- 并行 Ticket 无未解决的可写冲突；
- 每个 Ticket 可独立验证且适配单一上下文；
- Prefactor 与 expand-contract 使用条件正确；
- 用户已批准拆分或明确授权自主发布；
- 校验器无 error。

## 子文件引用

- 拆分规则：`<Path>{roots.workflows}/specdev/T-tickets/decomposition-rules.md</Path>`
- Ticket 就绪规则：`<Path>{roots.workflows}/specdev/T-tickets/ticket-readiness.md</Path>`
- Ticket 模板：`<Path>{roots.workflows}/specdev/T-tickets/ticket-template.md</Path>`
- Tickets Map 模板：`<Path>{roots.workflows}/specdev/T-tickets/tickets-map-template.md</Path>`

## 下一步

满足任一情况时建议运行 `<Path>{roots.workflows}/specdev/P-goal-plan/P-goal-plan.md</Path>`：Ticket 数量达到或超过 10、存在多个 implementation owner 的并行写入协调、Deep Ticket、迁移、共享契约、多个 Gate 或高风险发布。只读 review/research 并行本身不触发 Goal Plan；少量线性 Ready Ticket 可直接进入 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>`。
