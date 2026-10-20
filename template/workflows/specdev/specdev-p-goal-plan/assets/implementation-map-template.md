---
schema_version: 1
artifact: implementation-map
change: <YYYY-MM-DD-topic>
status: blocked
revision: 1
members: []
tasks: []
dependencies: []
serializations: []
---

# Implementation Map: <父目标>

由 P 在全部成员通过创建门后填写并设为 ready。members 至少包含两个真实 change；tasks 精确列出全部成员 Ticket 的 `change::T-NN` 身份。dependencies 使用 `dependent <- prerequisite`，serializations 使用无方向的 `left <> right`。空数组不是已完成盘点；先填真实输入再校验，不复制子 Ticket 的状态、Ready 或 owner。

## 1. Members and Source Authority

| Member | README | Spec | Tickets Map | 选择来源与边界 |
|---|---|---|---|---|

## 2. Composite Ticket Inventory

| Composite task | 原 Ticket | 原 Evidence | 承担的跨 change 合同 |
|---|---|---|---|

## 3. Implementation Super-DAG

保留所有子 blocked_by 边；新增跨成员边逐条指向真实产物或合同的前置条件。说明关键路径及可独立推进的分支。

## 4. Conflict and Serialization

| 资源或写集 | 涉及任务 | 唯一 owner / serialization | 解除条件 |
|---|---|---|---|

## 5. Contract and Path Coverage

| 组合验收或共享合同 | 承担任务 | 验证接缝 | 原证据入口 |
|---|---|---|---|

## 6. Revision Log

| Revision | 真实输入变化与来源 | 受影响节点及依赖闭包 | 原 owner 决定 |
|---|---|---|---|

Map 修订后由父 Plan 同步 source_map_revision；仍有效的子证据沿原工件复用。创建与恢复流程见 <Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/multi-change-plan.md</Path>。
