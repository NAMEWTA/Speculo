---
artifact: architecture-review
change: <YYYY-MM-DD-topic>
status: draft
---

# 架构审查：<范围>

- **决策记录：** `<Path>{roots.state}/specdev/changes/{change}/architecture-review.md</Path>`
- **审查准则：** `<Path>{roots.workflows}/specdev/R-review-architecture/review-rubric.md</Path>`

## 1. 审查压力与范围

- 触发目标：
- 审查入口：
- 相关行为或 Ticket：
- 不审查范围：
- 成功标准：
- 热点依据：用户指定 / Git 历史
- 结构性压力：file-size、spaghetti growth、boundary drift、wrong-layer logic、thin wrapper、sequential orchestration

## 2. 当前结构地图

### 模块与接口

### 数据、控制与错误流及 seam

### 变化热点、locality 与测试表面

### 拆分压力

- 接近或超过 1k lines 的文件：
- 需要先删除还是先拆分的复杂性：

## 3. 候选提案

### AR-001: <标题>

- **文件：** `<Path>project/relative/path</Path>`
- **结构类别：** structural blocker / missed simplification / spaghetti growth / boundary drift / file-size pressure / wrong-layer logic
- **问题：** 当前架构如何造成摩擦
- **代码 judo：** 保留行为但删掉什么复杂性
- **删除复杂性：** 会消失的 branch、helper、wrapper、mode、special case
- **删除测试：** 删除当前 shallow module 会集中复杂性 / 只移动复杂性
- **收益：** locality、leverage、depth 与测试改善
- **建议强度：** Strong / Worth exploring / Speculative
- **依赖类别：** in-process / local-substitutable / ports & adapters / mock
- **ADR 冲突：** 无 / ADR-###，值得重审因为 ...

#### 前后对比

- Before：shallow interface、leaking seam 与分散 locality。
- After：deep module、稳定 interface 与集中测试表面。

- **证据：** `CODE:<Path>project/relative/path</Path>`、git log、测试输出
- **推荐：**
- **访谈状态：** unselected / selected / consensus / blocked / rejected
- **用户结论：**
- **ADR 影响：** 无 / `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 中的 ADR-###

## 4. 最佳推荐

首先探索：AR-###。原因：<一句话>。若没有高置信候选，明确写 `无高置信候选`。

## 5. 下一步

- 报告生成后询问用户选择一个候选，不批量访谈。
- 达成共识的接受项进入 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>`。
