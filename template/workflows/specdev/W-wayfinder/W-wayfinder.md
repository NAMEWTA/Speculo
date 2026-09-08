---
id: specdev/wayfinder
type: workflow-entry
workflow: specdev
name: 探索大需求与 Change 边界
description: 大需求的 change 边界或实施路线尚不可见时建立探索地图，并分别澄清各 change；已有清晰 Spec 时不触发。
keywords: [initiative, 战争迷雾, change划分, exploration]
---

# 探索大需求与 Change 边界

> 激活后读取 `<Path>{roots.workflows}/specdev/README.md</Path>`。

W 位于 change 形成之前：Initiative → 候选 change → 各自 Grill → Spec → Tickets → 一个或多个 change 的 Goal。探索载体继续使用普通 change 目录，不增加另一套全局状态根；它不等于最终产品 change。

## 读取范围

先读 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`；读取共享地图、当前问题与依赖索引，只回读命中原文。低分辨率地图不缓存所有开放票正文。

## 分支

| 当前需要 | 按需读取 |
|---|---|
| 初次绘制问题空间，或划分多个 change | `<Path>{roots.workflows}/specdev/W-wayfinder/references/initiative-discovery.md</Path>` |
| 领取并解决一个调查问题，或恢复既有地图 | `<Path>{roots.workflows}/specdev/W-wayfinder/references/map-traversal.md</Path>` 和 `<Path>{roots.workflows}/specdev/W-wayfinder/local-tracker-contract.md</Path>` |
| 生成地图、问题与答案 | `<Path>{roots.workflows}/specdev/W-wayfinder/wayfinder-map-template.md</Path>`、`<Path>{roots.workflows}/specdev/W-wayfinder/investigation-ticket-template.md</Path>`、`<Path>{roots.workflows}/specdev/W-wayfinder/solution-comment-template.md</Path>` |
| 选定清晰 change 交给 Goal | `<Path>{roots.workflows}/specdev/W-wayfinder/references/initiative-discovery.md</Path>` 的交接门禁 |

## 必留纪律

- 目的地约束所有调查；能精确陈述的问题成为调查票，尚不能陈述的留在战争迷雾，目标外内容不自动升级。
- 默认每个会话最多解决一个调查 Ticket；绘图会话不关闭调查票。这个限制约束 W，不限制 P 的长期 Goal 调度；不静默减少用户明确要求的交付数量。
- 四类保持 `wayfinder:research`、`wayfinder:prototype`、`wayfinder:grilling`、`wayfinder:task`。HITL 必须真人参与，Agent 不代答；Task 仅解除调查阻塞，不偷做目的地实现。
- `claimed_investigations` 仍由探索载体的 change 状态唯一拥有。先领取后执行；他人已领取的问题跳过，不接管；只暂停有归属冲突的部分。
- 每个 materialized change 拥有自己的 design-tree、LOG、CONTEXT、ADR、Spec 与 tickets-map。共享探索答案通过 solution comment 引用，不复制成多个可写事实源。
- 缺失关键决定或必需证据时保持该 change 未就绪；其他独立清晰 change 可以交接，不要求整个大需求一次揭完迷雾。

## 校验与交接

存在多个候选 change 时，由 W 写 `<Path>{roots.state}/specdev/changes/{change}/initiative.json</Path>`；使用 `<Path>{roots.workflows}/specdev/W-wayfinder/references/initiative-template.json</Path>` 和 `<Path>{roots.workflows}/specdev/common/schemas/initiative.schema.json</Path>`。目标 change 只在用户接受边界后创建，不能挪用已属于其他任务的状态。

运行 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>` 的 `--stage wayfinder` 校验地图、claim、评论和 initiative；选定成员必须分别满足 Grill 共识、Ready Spec 和 Ready Tickets，再转交 `<Path>{roots.workflows}/specdev/P-goal-plan/P-goal-plan.md</Path>`。W 不把“地图完成”宣称为产品已经交付。
