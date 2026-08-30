---
id: learning/archive-and-consolidate
type: workflow-entry
workflow: learning
name: 归档并合并已掌握知识
description: 校验即时与保持证据，先 dry-run 再经确认移动 completed change，并按领域合并当前 Markdown 知识与索引。
keywords: [归档, consolidation, promotion, context, index, mastered]
---

# 归档并合并已掌握知识

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`，再执行本入口。

A 是唯一归档 owner，也是除 R 的受限复习状态更新外唯一永久知识 writer。解释完成、练习完成或即时通过都不能绕过本入口。

## 流程

1. 选择用户指定或唯一 completed change，读取两级状态、plan、sources、lessons、practice、全部 quiz 和 log。状态不是 completed、双门未 passed、关键目标/迁移未通过、存在 blocker/misconception 或 evidence 缺失时停止。
2. 调用 `<Path>{roots.workflows}/learning/common/skills/knowledge-promotion/SKILL.md</Path>` 的 `plan-promotion`。逐 OBJ 映射到 `create | merge | supersede | archive-only`，生成 `promotion-plan.md` 和 `promotion-staging/` 候选 Markdown，并列出知识叶子、领域索引、总索引、REVIEW、移动和状态变化；此时不写 context。
3. 运行 validator 的 `--stage pre-archive --change {change}`；展示完整 dry-run。没有用户对本次精确计划的明确确认时不修改 context、不移动 change。
4. 确认后重新读取并验证 source/target 无 drift。先在 `promotion-rollback/` 保存所有目标的原内容或“不存在”记录，再按 promotion skill 的 `apply-promotion` 自叶到根原子写入 staging 候选；冲突、目标漂移或部分写入失败时按 rollback manifest 恢复并重读。
5. 调用共享归档能力的 `mechanical-only` 模式移动 change 到 `<Path>{roots.state}/learning/archive/YYYY-MM/{change}/</Path>`，按 Learning schema 更新归档 `.status.json` 和全局 active/archived。共享能力不得自行判断知识毕业或写 SpecDev 专属字段。移动或状态更新失败时恢复 context 快照；只有移动和状态验证完成后事务才成功。
6. 重读所有知识、索引、源/目标和两级状态；运行 `--stage complete --change {change}`。任何不一致标记 blocked，并报告已经完成的精确动作。

## 完成标准

- 双重掌握门和证据均由实际工件证明；
- dry-run 与 confirmed 严格分离；
- 同一 Knowledge ID 只有一个当前文件，索引链接真实；
- change 源不存在、归档目标完整、active/archived 无重叠；
- archive 只读，context 只含当前已掌握内容；
- 没有未经批准的移动、覆盖、删除或外部副作用。

## 子文件引用

- Promotion 模板：`<Path>{roots.workflows}/learning/A-archive-and-consolidate/promotion-plan-template.md</Path>`
- Learning promotion：`<Path>{roots.workflows}/learning/common/skills/knowledge-promotion/SKILL.md</Path>`
- 机械归档：`<Path>{roots.skills}/archive-and-consolidate/SKILL.md</Path>`
