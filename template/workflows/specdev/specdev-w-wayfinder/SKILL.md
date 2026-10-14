---
name: specdev-w-wayfinder
description: "大需求的 change 边界或实施路线尚不可见时建立探索地图，并分别澄清各 change；已有清晰 Spec 时不触发。"
metadata:
  speculo-kind: work-skill
  speculo-id: specdev/wayfinder
  speculo-domain: specdev
  speculo-contract-version: "2"
---

# 探索大需求与 Change 边界

> 激活后读取 `<Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path>`。

W 位于 change 形成之前：Initiative → 候选 change → 各自 Grill → Spec → Tickets → 一个或多个 change 的 Goal。探索载体继续使用普通 change 目录，不增加另一套全局状态根；它不等于最终产品 change。

## 读取范围

先读 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`；先从共享地图定位当前调查 ID，再读当前问题、直接依赖及其 solution comment 原文；共享答案只引用 provenance。低分辨率地图不缓存所有开放票正文。

## 按当前调查选择参考

| 当前需要 | 按需读取 |
|---|---|
| 初次绘制问题空间，或划分多个 change | `<Path>{roots.workflows}/specdev/specdev-w-wayfinder/references/initiative-discovery.md</Path>` |
| 领取并解决一个调查问题，或恢复既有地图 | `<Path>{roots.workflows}/specdev/specdev-w-wayfinder/references/map-traversal.md</Path>` 和 `<Path>{roots.workflows}/specdev/specdev-w-wayfinder/references/local-tracker-contract.md</Path>` |
| 生成地图、问题与答案 | `<Path>{roots.workflows}/specdev/specdev-w-wayfinder/assets/wayfinder-map-template.md</Path>`、`<Path>{roots.workflows}/specdev/specdev-w-wayfinder/assets/investigation-ticket-template.md</Path>`、`<Path>{roots.workflows}/specdev/specdev-w-wayfinder/assets/solution-comment-template.md</Path>` |
| 选定清晰 change 交给 Goal | `<Path>{roots.workflows}/specdev/specdev-w-wayfinder/references/initiative-discovery.md</Path>` 的交接门禁 |

## 调查的决策价值

每张调查说明它影响的决定、已知事实、缺失证据、最小调查、结束条件和下一 owner。只对目的地相关的兼容、迁移、权限、故障、成本和部署约束展开，不把“全面研究”变成无限搜索。答案需有可回读来源；没有依据的候选继续未知，不能以调查完成代替产品完成。

## 必留纪律

- 目的地约束所有调查；能精确陈述的问题成为调查票，尚不能陈述的留在战争迷雾，目标外内容不自动升级。
- 默认每个会话最多解决一个调查 Ticket；绘图会话不关闭调查票。这个限制约束 W，不限制 P 的长期 Goal 调度；不静默减少用户明确要求的交付数量。
- 四类保持 `wayfinder:research`、`wayfinder:prototype`、`wayfinder:grilling`、`wayfinder:task`。HITL 必须真人参与，Agent 不代答；Task 仅解除调查阻塞，不偷做目的地实现。
- 调查认领保存在各 investigation Ticket 的实际 Assignment；不建中央镜像。先领取后执行；他人已领取的问题跳过，不接管；只暂停有归属冲突的部分。
- 每个 materialized change 拥有自己的 design-tree、LOG、CONTEXT、ADR、Spec 与 tickets-map；涉及 UI 时也拥有经批准的 DESIGN。共享探索答案通过 solution comment 引用，不复制成多个可写事实源。
- 缺失关键决定或必需证据时保持该 change 未就绪；其他独立清晰 change 可以交接，不要求整个大需求一次揭完迷雾。

UI 调查调用 P 时按 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path> 继承永久基线并在 HTML 后集中确认。solution comment 只保存设计合同/版本、指定原型与实际证据；探索包复用到 child change 必须核对新范围，不复制出多个永久写入 owner，也不把父探索批准自动视作 child 批准。

## 校验与交接

存在多个候选 change 时，由 W 写 `<Path>{roots.state}/specdev/changes/{change}/initiative.json</Path>`；使用 `<Path>{roots.workflows}/specdev/specdev-w-wayfinder/references/initiative-template.json</Path>` 和 `<Path>{roots.workflows}/specdev/common/schemas/initiative.schema.json</Path>`。目标 change 只在用户接受边界后创建，不能挪用已属于其他任务的状态。

运行 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>` 的 `--stage wayfinder` 校验地图、claim、评论和 initiative；选定成员必须分别满足 Grill 共识、Ready Spec 和 Ready Tickets，再转交 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path>`。W 不把“地图完成”宣称为产品已经交付。
