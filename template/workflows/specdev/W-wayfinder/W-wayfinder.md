---
id: specdev/wayfinder
type: workflow-entry
workflow: specdev
name: 寻路
description: 为路径未知、跨域或超出单次上下文的工作建立共享调查地图，通过可领取的研究与决策 Ticket 关闭未知项并收敛到可执行路线。
keywords: [wayfinder, 调查, research, decision, shared-map, 并行, 未知项]
---

# 寻路

Wayfinder 用于“尚不知道怎样安全形成 Spec 或实现路线”的场景。它保留共享地图、多会话领取、研究型 Ticket 和决策型 Ticket 的能力，但禁止把产品实现伪装成调查。

## 产物

- 共享地图：`<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>`
- 调查 Ticket 目录：`<Path>{roots.state}/specdev/changes/{change}/investigation/</Path>`
- 单个调查 Ticket：`<Path>{roots.state}/specdev/changes/{change}/investigation/{investigation-id}.md</Path>`
- 调查 Evidence：`<Path>{roots.state}/specdev/changes/{change}/investigation/evidence/</Path>`
- 全局领取状态：`<Path>{roots.state}/specdev/status.json</Path>` 中当前 change 的 `claimed_investigations`

模板：

- `<Path>{roots.workflows}/specdev/W-wayfinder/investigation-ticket-template.md</Path>`
- `<Path>{roots.workflows}/specdev/W-wayfinder/wayfinder-map-template.md</Path>`

## 何时运行

- 路径未知，无法安全写出 Ready Spec 或 Ticket；
- 需要跨多个领域、技术栈或外部系统调查；
- 调查量超出单个上下文，适合并行研究；
- 存在多个相互依赖的高影响未知项；
- 需要在若干候选方案中先获得事实证据再做决定。

若问题只是一个可在当前上下文通过短暂只读探索回答的事实，不创建 Wayfinder Map。

## 流程

### 1. 定义目标与未知项

写明最终目标、已知边界、当前不能决定的事项和“为什么这些未知项阻塞规划”。未知项分为：

- **research**：答案可由代码、文档、实验或外部来源证实；
- **decision**：事实已足够，但需要用户或架构 owner 做取舍；
- **validation**：已有方案，需要实验验证关键可行性或风险；
- **mapping**：需要建立调用链、数据流、依赖图或影响面。

低影响实现细节不创建调查 Ticket。

### 2. 建立共享地图

使用 `<Path>{roots.workflows}/specdev/W-wayfinder/wayfinder-map-template.md</Path>` 写入 `<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>`：

- 每个 Ticket 只关闭一个高影响未知项；
- 写明依赖、owner、领取状态、停止条件和结果消费方；
- 构建调查 DAG，避免多个调查重复回答同一问题；
- 标记可并行调查和必须串行的决策点；
- 定义整体停止条件，不以“所有可能问题都研究完”为目标。

### 3. 领取与并行

调查者开始前原子地更新 `<Path>{roots.state}/specdev/status.json</Path>` 的 `claimed_investigations`：

- 未领取且依赖满足 → 设置 owner、session 和 claimed 时间；
- 已领取 → 跳过并选择其他可用 Ticket；
- 超过配置的 claim 超时且无进展 → 允许在记录原因后回收；
- 完成或释放后从领取集合移除，并同步共享地图。

并行调查使用独立上下文；不要复制所有调查历史，只读取共享地图、当前调查 Ticket、相关上游工件和必要代码事实。

### 4. 执行调查

调查默认只读。允许：

- 代码搜索与静态分析；
- 文档、规范和官方来源研究；
- 可撤销的临时实验、最小原型或插桩；
- 性能测量、调用点扫描、schema 对比或兼容性验证。

外部研究使用 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`。

禁止：

- 顺手实现产品功能；
- 提交未经审查的实验代码；
- 将原型视为最终架构；
- 在没有证据时把建议写成事实；
- 无停止条件地持续研究。

### 5. 记录结果与影响

每个调查结果区分：

- 官方或规范事实；
- 当前代码事实；
- 实验结果；
- 推断；
- 建议；
- 用户或 owner 决策。

写明来源、版本、置信度、适用范围、反例、仍未知项和对以下工件的影响：

- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`；
- `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`；
- `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`；
- `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`。

调查完成、阻塞或释放时，同步调查 Ticket、调查 Evidence、共享地图和领取状态，并返回 investigation ID、状态及三份工件的完整路径。

状态使用 `open | claimed | confirmed | disproved | decision-needed | unresolved | superseded | cancelled`。

### 6. 收敛与退出

当剩余未知项不再阻止目标、行为、架构、风险或验证决策时停止。根据结果进入：

- 需要产品或架构取舍 → `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`；
- 外部行为已清楚 → `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>`；
- Spec 已 Ready 且只是实现拆分未知 → `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`；
- Bug 根因路径已收敛 → `<Path>{roots.workflows}/specdev/D-diagnose-bugs/D-diagnose-bugs.md</Path>`；
- 仍存在高影响未知项 → 保持 blocked，并明确下一调查或用户决策。

长期有效且经实现验证的研究，只有在归档时由 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/A-archive-and-consolidate.md</Path>` 提升。

## 完成标准

- 共享地图、调查 Ticket 和领取状态一致；
- 每个调查只关闭一个高影响未知项；
- 结论区分事实、实验、推断、建议和决定；
- 来源、版本、置信度和停止条件可追踪；
- 并行调查没有重复领取或互相覆盖；
- 调查状态及 Ticket、Evidence、共享地图路径已返回；
- 没有把产品实现藏在调查中；
- 已明确下一 work 或阻塞决策。

## 子文件引用

- 调查 Ticket 模板：`<Path>{roots.workflows}/specdev/W-wayfinder/investigation-ticket-template.md</Path>`
- 共享地图模板：`<Path>{roots.workflows}/specdev/W-wayfinder/wayfinder-map-template.md</Path>`
