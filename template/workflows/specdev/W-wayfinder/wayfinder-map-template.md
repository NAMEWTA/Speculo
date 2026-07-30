---
artifact: wayfinder-map
change: <YYYY-MM-DD-topic>
status: active
---

# Wayfinder Map: <目标>

- **共享地图：** `<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>`
- **调查目录：** `<Path>{roots.state}/specdev/changes/{change}/investigation/</Path>`
- **领取状态：** `<Path>{roots.state}/specdev/status.json</Path>`

## 1. 最终目标与当前边界

## 2. 调查清单

| ID | Type | 问题 | 为什么高影响 | Blocked By | Owner/Claim | 状态 | Result |
|---|---|---|---|---|---|---|---|
| INV-01 | research | ... | ... | — | unassigned | open | `<Path>{roots.state}/specdev/changes/{change}/investigation/INV-01-<name>.md</Path>` |

## 3. 调查 DAG

```text
INV-01
  ├─→ INV-02
  └─→ INV-03
```

## 4. 并行与领取规则

- 最大并发来自 `<Path>{roots.state}/specdev/config.json</Path>`。
- 当前领取集合以 `<Path>{roots.state}/specdev/status.json</Path>` 为权威。
- 同一调查 Ticket 只能有一个 owner/session。
- 共享地图是状态投影，领取变更后必须同步。

## 5. 决策收敛

| 未知项 | 当前结论 | 置信度 | 消费工件 | 是否仍阻塞 |
|---|---|---|---|---|

## 6. 停止条件

- [ ] 所有高影响未知项已 confirmed、disproved，或明确转为用户/owner 决策。
- [ ] 可以形成 Ready Spec、Ticket、诊断契约或架构决策。
- [ ] 没有把产品实现留在调查 Ticket 中。
- [ ] 所有 claim 已释放或转为明确 blocked。
