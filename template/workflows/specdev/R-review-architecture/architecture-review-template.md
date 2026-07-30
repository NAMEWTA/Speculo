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

## 2. 当前结构地图

### 模块与接口

### 数据、控制与错误流

### 变化热点与测试接缝

## 3. 候选提案

### AR-001: <标题>

- **机制：** shallow-module / seam-leak / locality / dependency / temporal-coupling / shared-state / migration
- **严重度：** low / medium / high / critical
- **证据：** `<Path>project/relative/path</Path>`
- **问题如何发生：**
- **用户或工程影响：**
- **当前 workaround：**
- **不做后果：**

#### 方案 A：保持现状

#### 方案 B：推荐最小深层化

#### 方案 C：替代方案

| 维度 | A | B | C |
|---|---|---|---|
| 调用者复杂度 | | | |
| 接口稳定性 | | | |
| 迁移与兼容 | | | |
| 测试与验证 | | | |
| 回滚 | | | |
| 事故半径 | | | |

- **推荐：**
- **建议 Planning Depth：** lite / standard / deep
- **访谈状态：** proposed / accepted / adjusted / deferred / rejected
- **用户结论：**
- **ADR 影响：** 无 / `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 中的 ADR-###

## 4. 优先级与依赖

| Candidate | Value | Risk Reduction | Cost | Dependency | Decision |
|---|---|---|---|---|---|

## 5. 下一步

- 接受项进入 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`。
