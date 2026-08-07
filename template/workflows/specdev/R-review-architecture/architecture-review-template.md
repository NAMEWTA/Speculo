---
artifact: architecture-review
change: <YYYY-MM-DD-topic>
status: draft
---

# Architecture Review: <范围>

- **决策记录：** `<Path>{roots.state}/specdev/changes/{change}/architecture-review.md</Path>`
- **可视化报告：** `<Path>{roots.state}/specdev/changes/{change}/architecture-review.html</Path>`

## 1. 审查压力与范围

- 触发目标：
- 审查入口：
- 相关行为或 Ticket：
- 不审查范围：
- 成功标准：
- 热点依据：用户指定 / Git 历史

## 2. 当前结构地图

### Modules 与 Interfaces

### 数据、控制与错误流及 Seams

### 变化热点、Locality 与测试表面

## 3. 候选提案

### AR-001: <标题>

- **文件：** `<Path>project/relative/path</Path>`
- **问题：** 当前架构如何造成摩擦
- **解决方案：** 将发生什么变化；报告阶段不提出具体 interface
- **收益：** locality、leverage 与测试改善
- **建议强度：** Strong / Worth exploring / Speculative
- **依赖类别：** in-process / local-substitutable / ports & adapters / mock
- **删除测试：** 删除当前 shallow module 会集中复杂性 / 只移动复杂性
- **ADR 冲突：** 无 / ADR-###，值得重审因为 ...

#### Before / After

- Before：shallow interface、leaking seam 与分散 locality。
- After：deep module、稳定 interface 与集中测试表面。

- **推荐：**
- **访谈状态：** unselected / selected / consensus / blocked / rejected
- **用户结论：**
- **ADR 影响：** 无 / `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 中的 ADR-###

## 4. 最佳推荐

首先探索：AR-###。原因：<一句话>。

## 5. 下一步

- 报告生成后询问用户选择一个候选，不批量访谈。
- 达成共识的接受项进入 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`。
