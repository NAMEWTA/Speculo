---
schema_version: 1
artifact: diagnosis
change: <YYYY-MM-DD-topic>
status: reproducing
feedback_loop_ready: false
red_command: null
red_evidence: null
cleanup_status: pending
updated_at: <ISO-8601>
---

# Diagnosis: <问题>

## 1. 现象与影响

只记录可观察现象、受影响对象、严重度和时间范围。

## 2. 红灯反馈回路

- **命令：**
- **至少一次真实输出：**
- **精确症状断言：**
- **耗时：**
- **确定性/复现率：**
- **Agent 可运行性：** autonomous / structured-HITL
- **无法建立时已尝试方式和所需输入：** 不适用 / ...

`feedback_loop_ready: false` 时以下假设表必须为空。

## 3. 最小复现

- **环境与输入：**
- **剩余步骤：**
- **逐项删除证据：**
- **最后红灯证据：**
- **捕获物：** 无 / `<Path>{roots.state}/specdev/changes/{change}/diagnostics/<artifact></Path>`

## 4. 假设与证伪

| 排名 | 假设与预测 | 支持证据 | 单变量实验 | 结果 |
|---|---|---|---|---|

## 5. 已确认根因

- **触发条件：**
- **失败机制：**
- **根因位置：** `<Path>src/example.ts</Path>`
- **漏检原因：**
- **为何排除其他候选：**
- **确认实验：**

## 6. 修复契约

- **必须改变：**
- **必须保持：**
- **正确测试 seam：** `<Path>test/example.test.ts</Path>` / 缺失并路由 R
- **回归测试：** 修复前红、修复后绿的具体合同
- **OUT：**
- **风险与回滚：**
- **推荐下游：** S-spec / T-tickets / I-implement / R-review-architecture

## 7. 清理

- **原始回路重跑：**
- **`[DEBUG-...]` 搜索：**
- **一次性脚本/原型：**
- **未清理项 owner 与删除条件：** 无 / ...
