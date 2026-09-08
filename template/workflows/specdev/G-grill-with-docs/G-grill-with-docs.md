---
id: specdev/grill-with-docs
type: workflow-entry
workflow: specdev
name: Change 决策访谈
description: 一个已界定 change 仍有产品、领域或架构决定待确认时进行可恢复访谈；跨 change 边界未清晰时先用 W。
keywords: [grill, 设计树, 领域, 决策, 共识]
---

# Change 决策访谈

> 激活后读取 `<Path>{roots.workflows}/specdev/README.md</Path>`。

## 读取范围

读取 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`；定位当前 change 的 `<Path>{roots.state}/specdev/changes/{change}/design-tree.json</Path>`、`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 和相关 initiative 决策。先找到相关条目再回读必要原文，不默认整读永久 ADR 或索引。

## 过程与边界

进入访谈必须读取 `<Path>{roots.workflows}/specdev/G-grill-with-docs/references/interview-procedure.md</Path>`，再按触发分支读取 grilling、领域建模、日志格式或 stakeholder questionnaire。保留完整 frontier、推荐答案和逐轮共识检查，但不替用户回答高影响取舍。

- 先查仓库可发现事实，只询问会改变行为、架构、风险、范围、迁移或验收的决定。
- W 的每个 materialized change 在自己的目录拥有设计树和文档；共享答案以来源指针引用，不能共用一棵可写设计树。
- 当前 change 的 LOG/CONTEXT/ADR 可按 Work 授权写入；永久 namespace 对 G 只读，正式知识只能经 A 的原有写入网关提升。
- 没有未决的高影响决定且证据可定位才标记共识；无法回答时只暂停相关分支，返回明确问题和恢复入口。

完成后使用 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>` 的 `--stage grill`，回读四个真实源工件，再交给 `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>`；若属于 W 调查票，只关闭本票并返回探索地图。
