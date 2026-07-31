---
artifact: wayfinder-map
change: <YYYY-MM-DD-topic>
status: active
---

# Wayfinder Map: <目标名称>

> 本地图是**索引而非仓库**：每个决策只在一处存放，地图只给一行摘要并链接到详情。凡是人会读到的叙述，用**名称**指代 Ticket，不用裸编号。

- **共享地图：** `<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>`
- **调查目录：** `<Path>{roots.state}/specdev/changes/{change}/investigation/</Path>`
- **领取状态：** `<Path>{roots.state}/specdev/status.json</Path>`

## 1. 目标

<终点长什么样，一到两行。目标是第一动作，塑造每一个 Ticket，并固定范围。>

## 2. 笔记

- **领域：**
- **需参考的 skills：**
- **固定偏好 / 约束：**
- **执行授权：** 默认只产出决策不产出交付物；如需把执行纳入地图，在此显式写明。

## 3. 调查清单（前沿由此表投影）

> 前沿 = `open` + 依赖已满足（unblocked）+ 尚未领取（unclaimed）的行。走完地图时只从前沿取 Ticket。

| 名称 | ID | Type | 模式 | 问题 | Blocked By | Owner/Claim | 状态 | Result |
|---|---|---|---|---|---|---|---|---|
| 示例：登录态跨域刷新策略 | INV-01 | research | AFK | ... | — | unassigned | open | `<Path>{roots.state}/specdev/changes/{change}/investigation/INV-01-<name>.md</Path>` |

- Type：research（可证实）/ decision（需取舍）/ validation（需实验验证）/ mapping（建立调用链/影响面）。
- 模式：AFK（子代理独立完成，典型 research/mapping）/ HITL（须与用户实时交流，代理不代答，典型 decision）。

## 4. 调查 DAG

```text
INV-01
  ├─→ INV-02
  └─→ INV-03
```

- 标记可并行调查与必须串行的决策点，避免多个调查重复回答同一问题。

## 5. 并行与领取规则

- 最大并发来自 `<Path>{roots.state}/specdev/config.json</Path>`。
- 当前领取集合以 `<Path>{roots.state}/specdev/status.json</Path>` 为权威。
- 同一调查 Ticket 只能有一个 owner/session。
- **research / AFK 型可并行领取**；**decision 及其他 HITL 型，单会话一次只解决一个**（research 除外），逐个解决让地图稳定生长。
- 共享地图是状态投影，领取变更后必须同步；写回前先重读，预期并发编辑。

## 6. 已定决策（实际走过的路线）

> 每关闭一个 Ticket 追加一行结论索引。越界工作不写这里，移入“范围之外”。

| 名称 | 结论（一行） | 置信度 | 消费工件 | 详情指针 |
|---|---|---|---|---|

## 7. 尚未指定（战争迷雾）

> 范围内、已隐约感到会出现、但此刻还无法**精确表述**的决策。看得清就毕业成第 3 节的 Ticket，看不清就留在这里。不要预先切成 Ticket 大小的碎片。

- ...

## 8. 范围之外

> 超出目标的工作。永不毕业回地图；目标被重画时作为新 change 处理。已存在 Ticket 若被发现越界，关闭后在此留一行摘要与理由。

| 被排除的工作 | 理由 |
|---|---|

## 9. 停止条件

- [ ] 目标已命名，并塑造了地图上的每个 Ticket。
- [ ] 所有高影响未知项已 confirmed、disproved，或明确转为用户/owner 决策。
- [ ] 战争迷雾中不再有阻塞目标、且已可精确表述却未立 Ticket 的问题。
- [ ] 可以形成 Ready Spec、Ticket、诊断契约或架构决策。
- [ ] 没有把产品实现留在调查 Ticket 中。
- [ ] 所有 claim 已释放或转为明确 blocked。
