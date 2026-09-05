---
id: learning/consolidate
type: workflow-entry
workflow: learning
name: 主题整合
description: 将选定 Change 物理嵌入父 Change，生成带 claim 级 provenance 的可迭代主题综合。
keywords: [consolidate, synthesis, provenance, topic, relocate]
---

# 主题整合

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`。

## 流程

1. 用户指定目标 domain/topic 和 source Change IDs。允许 active/closed 的未归档根 Change；已归档内容必须先显式恢复。已有综合子树只能整棵选择，不得拆分。
2. 读取每个 source 的 current locator、旧 locator、时间、内容哈希、Lesson/Homework/Review 索引和关系；若祖先/后代循环、重复 ID、活动锁或路径越界则阻塞。
3. 输出 dry-run：目标父 Change、子目录、effective date、移动清单、哈希、未掌握 evidence、冲突/空白和 context 写入计划。用户未确认前不移动、不改状态。
4. 用户确认后由 `<Path>{roots.workflows}/learning/common/tools/relocate-learning.mjs</Path>` 在父根锁内 stage、移动整个目录到 `children/<child-id>/`、更新 locations/status projection，并在失败时回滚。现有 Markdown 字节必须保持一致；子 owner 仍写自己的子目录，父负责路由和锁。
5. 生成 `synthesis/` 的 source-manifest、overview、claim-matrix、concept-map、conflicts-and-gaps 和带版本的 revisions。每个 claim 带 source Change/Lesson/Homework anchor、外部 source id、evidence status 和验证时间。
6. 用户再次确认后才发布 `context/domains/<domain>/topics/<topic-id>/`；发布不删除原料、不改变 immediate/retention 掌握结论。C 完成后不自动激活 A/R。

## 完成标准

- 物理移动可证明、可回滚、可由稳定 Change ID 解析；
- 原始工件不被综合覆盖，后续综合以新 revision 记录；
- active 子 Change 的后续 L/H 仍写子目录，不能绕过父根锁；
- synthesis 能明确支持、争议、未决 claim，并保留引用。

## 子文件

- 综合规则：`<Path>{roots.workflows}/learning/common/skills/topic-synthesis/SKILL.md</Path>`
- 迁移工具：`<Path>{roots.workflows}/learning/common/tools/relocate-learning.mjs</Path>`
