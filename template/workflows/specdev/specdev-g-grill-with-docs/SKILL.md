---
name: specdev-g-grill-with-docs
description: "一个已界定 change 仍有产品、领域或架构决定待确认时进行可恢复访谈；跨 change 边界未清晰时先用 W。"
metadata:
  speculo-kind: work-skill
  speculo-id: specdev/grill-with-docs
  speculo-domain: specdev
  speculo-contract-version: "2"
---

# Change 决策访谈

> 激活后读取 `<Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path>`。

## 读取范围

读取 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`；定位当前 change 的 `<Path>{roots.state}/specdev/changes/{change}/design-tree.json</Path>`、`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 和相关 initiative 决策。先找到相关条目再回读必要原文，不默认整读永久 ADR 或索引。

## 按风险选择问题

涉及失败、重试、取消或恢复时读取 <Path>{roots.workflows}/specdev/common/rules/error-handling.md</Path>：谁拥有状态，何时算成功，超时后副作用是否未知，谁核实结果，什么可以重复，哪些依赖应停止？涉及工具/prompt/context 时再读取 <Path>{roots.workflows}/specdev/common/rules/agent-experience.md</Path>。问题由当前 change 风险触发，不固定全问；仓库能查明的事实先查，高影响取舍才询问用户。

局部 ADR 保留真实问题、采纳决定、考虑过的替代方案、代价、适用范围和验证义务。未确认方案留 LOG/设计树，不编造备选，也不把已采纳但未实现的决定写成已交付。

## 当前 change 的访谈与共识

进入访谈必须读取 `<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/references/interview-procedure.md</Path>`，由该过程在出现设计取舍、术语变化、日志写入或外部 stakeholder 缺口时分别读取 grilling、领域建模、日志格式或 questionnaire；不默认加载所有参考。保留完整 frontier、推荐答案和逐轮共识检查，但不替用户回答高影响取舍。

- 先查仓库可发现事实，只询问会改变行为、架构、风险、范围、迁移或验收的决定。
- W 的每个 materialized change 在自己的目录拥有设计树和文档；共享答案以来源指针引用，不能共用一棵可写设计树。
- 当前 change 的 LOG/CONTEXT/ADR 可按 Work 授权写入；永久 namespace 对 G 只读，正式知识只能经 A 的原有写入网关提升。
- 没有未决的高影响决定且证据可定位才标记共识；无法回答时只暂停相关分支，返回明确问题和恢复入口。

完成后使用 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>` 的 `--stage grill`，回读实际形成的决定与证据工件；无实际内容不为四份数量预建空文件，再交给 `<Path>{roots.workflows}/specdev/specdev-s-spec/SKILL.md</Path>`；若属于 W 调查票，只关闭本票并返回探索地图。
