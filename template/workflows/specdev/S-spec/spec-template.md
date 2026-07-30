---
schema_version: 3
artifact: spec
change: <YYYY-MM-DD-topic>
status: draft
ready_for_tickets: false
sources:
  - USER-DECISION:<summary>
---

# Spec: <标题>

- **Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **当前 ADR：** `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- **当前领域上下文：** `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`

## 1. 问题与目标

### 问题陈述

### 目标用户与场景

### 成功标准

### 非目标

## 2. 解决方案与外部行为

### 解决方案摘要

### 主要流程

### 边界、失败与稳定错误行为

### 状态转换与不变量

## 3. 用户故事

- **US-001**：作为 <角色>，我希望 <能力>，以便 <收益>。

## 4. 验收合同

| ID | 前置条件 | 动作或事件 | 可观察结果 | 验证接缝 |
|---|---|---|---|---|
| AC-001 | ... | ... | ... | ... |

## 5. 范围

### IN

### REUSE

### OUT

- **OOS-001**：<不做什么及原因>。

## 6. 已锁定实现约束

- **DEC-001**：<只写影响公共接口、数据、不变量、兼容、安全或验证的决策>。来源：`ADR-###`。

## 7. 数据、接口与兼容

- **公共接口变化：** 无 / ...
- **数据模型与持久化：** 无 / ...
- **兼容要求：** 无 / ...
- **迁移要求：** 无 / ...
- **发布或运维影响：** 无 / ...

## 8. 非功能要求

- **NFR-001 安全与隐私：**
- **NFR-002 性能与容量：**
- **NFR-003 可用性与可靠性：**
- **NFR-004 可观测性与运营：**

不适用的维度写“不适用：原因”。

## 9. 验证策略

| 接缝 | 层级 | 覆盖合同 | 现有先例或命令 | Evidence 类型 |
|---|---|---|---|---|

项目测试先例可引用项目相对路径，例如 `<Path>tests/example.test.ts</Path>`。

## 10. 风险、假设与未决问题

### 风险

### 已采用的低影响假设

### 未决问题

无。

存在高影响未决问题时，`ready_for_tickets` 必须为 `false`。
