---
id: specdev/grill-with-docs
type: workflow-entry
workflow: specdev
name: 设计访谈（带文档）
description: 通过一次一问的设计访谈打磨方案，同时持续维护设计日志、领域上下文和架构决策。
keywords: [设计访谈, ADR, LOG, CONTEXT, 决策, 领域建模]
---

# 设计访谈（带文档）

本 work 保留原有的 grilling 访谈与 domain-modeling 双重能力：访谈负责沿决策树逐分支达成共识，领域建模负责在决策结晶时同步维护设计轨迹、术语与架构决策。未经用户确认，不进入实现。

## 输入与权威

开始前按需读取：

- 全局配置：`<Path>{roots.state}/specdev/config.json</Path>`
- 永久架构决策：`<Path>{roots.state}/specdev/adr/</Path>`
- 永久领域上下文：`<Path>{roots.state}/specdev/context/</Path>`
- 原始请求：`<Path>{roots.state}/specdev/changes/{change}/source-issue.md</Path>`
- 分诊结果：`<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`
- Bug 诊断：`<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`
- 当前 Spec（如已存在）：`<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- 工件职责规则：`<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>`
- 规划原则：`<Path>{roots.workflows}/specdev/common/rules/planning-principles.md</Path>`

不存在的可选输入静默跳过，不把缺失文件伪装成已知事实。

## 流程

### 1. 启动或恢复 change

创建或恢复 `<Path>{roots.state}/specdev/changes/{change}/</Path>`，其中 `{change}` 使用 `<YYYY-MM-DD>-<topic>`。

首次启动时创建：

- 生命周期状态：`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`（首次创建时使用 `<Path>{roots.workflows}/specdev/I-init-setup/change-status-template.json</Path>`）
- 架构决策：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- 设计日志：`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`
- 领域上下文：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`

创建和更新格式分别遵循：

- `<Path>{roots.workflows}/specdev/G-grill-with-docs/adr-format.md</Path>`
- `<Path>{roots.workflows}/specdev/G-grill-with-docs/log-format.md</Path>`
- `<Path>{roots.workflows}/specdev/G-grill-with-docs/context-format.md</Path>`

恢复已有 change 时必须先读取现有三份文档，避免重复询问已经确认的问题。

**完成标准**：change 目录、生命周期状态和三份设计文档均可读取；已知结论与未决问题已建立初始摘要。

### 2. 探索可发现事实

在提问前只读探索相关代码、配置、接口、schema、测试、历史 ADR 和相邻实现。将未知项分为：

- 可发现事实：继续探索，不询问用户；
- 高影响偏好或取舍：进入访谈；
- 低影响实现细节：记录为实现者可自行决定，不升级为产品决策。

若涉及不熟悉的外部技术、第三方 API、标准或版本行为，调用 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`，并把研究结论的来源和置信度写入 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`。

### 3. 一次一问的设计访谈

加载 `<Path>{roots.workflows}/specdev/G-grill-with-docs/grilling-protocol.md</Path>`。每轮只处理一个会实质改变设计的问题：

1. 陈述已知事实与证据；
2. 提出唯一关键问题；
3. 给出 2–4 个真实选项、权衡和推荐默认值；
4. 等待用户确认、拒绝或延后；
5. 将结果立即追加到 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`。

不得把多个独立决策塞进同一个问题；不得为了填模板询问不会改变方案的细节；不得在用户尚未确认前执行实现。

**完成标准**：决策树已覆盖目标、角色、范围、主要流程、状态与失败、数据与接口、兼容与迁移、安全与隐私、性能与可观测性、验证与验收等适用分支。

### 4. 同步领域文档

加载 `<Path>{roots.workflows}/specdev/G-grill-with-docs/domain-modeling-rules.md</Path>`，按固定顺序同步：

1. 先把所有确认、延后、拒绝和替代结论写入 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`；
2. 再把当前仍真实的术语、不变量、示例、反例和代码映射写入 `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`；
3. 最后把满足 ADR 条件的长期架构决策写入 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`。

历史轨迹不得写入领域上下文；尚未确认的选项不得写成已接受 ADR；已有 ADR 被替代时必须建立 supersedes 链，不重写历史。

### 5. 收敛与就绪判断

访谈结束时必须能明确：

- 目标、目标用户、成功标准；
- IN、REUSE、OUT；
- 主要行为路径、失败行为与状态转换；
- 公共接口、数据、不变量、兼容和迁移影响；
- 安全、隐私、性能、可靠性和可观测性要求；
- 验证接缝和可观察验收方式；
- 剩余未知项及其影响。

仍存在会改变外部行为、范围、公共接口、数据、安全、兼容、迁移或验收的未决问题时，将 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 标为 `blocked` 或保持 `active`，不得伪装为 Ready。

### 6. 停止与路由

向用户汇报三份文档的新增/修改条目、已锁定决策、延后事项和风险。根据成熟度明确给出下一步：

- 通常进入 `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>`；
- 外部行为已经完全明确时可进入 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`；
- 极小、局部且已经具备批准执行契约的工作，可在用户确认后进入 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>`；
- 路径或关键事实仍未知时进入 `<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>`。

同步 `<Path>{roots.state}/specdev/status.json</Path>` 的 `current_work`、`work_history` 和当前 change 状态，返回三份权威工件及下一 Work 的完整路径。

不得在本 work 中自动读取实现源码并开始修改代码。

## 完成标准

- `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` 已记录全部设计结论和状态变化；
- `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` 只包含当前领域真相；
- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 只包含满足条件的架构决策；
- 高影响未决问题已关闭或明确标记为阻塞；
- 状态、权威工件和下一 Work 路径已返回；
- 下一 work 已明确，但未自动执行实现。

## 子文件引用

- 访谈协议：`<Path>{roots.workflows}/specdev/G-grill-with-docs/grilling-protocol.md</Path>`
- 领域建模规则：`<Path>{roots.workflows}/specdev/G-grill-with-docs/domain-modeling-rules.md</Path>`
- ADR 格式：`<Path>{roots.workflows}/specdev/G-grill-with-docs/adr-format.md</Path>`
- 领域上下文格式：`<Path>{roots.workflows}/specdev/G-grill-with-docs/context-format.md</Path>`
- 设计日志格式：`<Path>{roots.workflows}/specdev/G-grill-with-docs/log-format.md</Path>`
