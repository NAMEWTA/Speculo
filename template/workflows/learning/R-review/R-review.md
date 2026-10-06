---
id: learning/review
type: workflow-entry
workflow: learning
name: 延迟保持与周期复习
description: 用户主动指定后，用真实时间间隔验证回忆、机制和迁移，并更新 retention evidence。
keywords: [复习, retention, spaced-review, transfer]
---

# 延迟保持与周期复习

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`。

## 读取范围

当前步骤开始前，读取 `<Path>{roots.workflows}/learning/common/rules/homework-contract.md</Path>`；只加载本 Work 需要的领域合同。

读取 `<Path>{roots.workflows}/learning/common/rules/activation-and-memory.md</Path>`，按当前 Change、OBJ、主题与证据 ID 定位本轮输入；仅当前恢复或安全门要求时扩读。

## 流程

1. 用户明确指定 Lesson、Homework、Change 或 topic；按 review/来源索引只读取对应 sources、目标和到期的过去证据。没有真实间隔时只记录 `due_at`，不伪造通过。
2. 在 Change 的 `review/INDEX.md` 和 `review/RV-<id>.md` 生成新复习记录。题目必须包含延迟回忆、机制/反例和新的迁移情境，不复制刚看过的示例。
3. 原样保存回答并给出逐项证据；失败只生成补救范围和 `needs_review`，不删除历史、不改写 archived 原文。
4. 只有通过真实延迟复习才设置 `mastery.retention=passed`、`mastery.overall=retention_verified`，仅更新当前 Change 的 retention 证据与状态投影。永久 context topic view 仍由 `<Path>{roots.workflows}/learning/C-consolidate/C-consolidate.md</Path>` 通过原发布网关在用户确认后消费该证据并标记 `mastered`；R 不直接写 context，不自动激活 C 或 A。

## 完成标准

- 时间、来源、题目和回答可审计；
- R 是可选 Work，H 的 immediate 评审可以结束当前学习轮次；
- 周期复习失败保留原证据并建立新的补救 Change 或 note。

## 子文件

- Review 模板：`<Path>{roots.workflows}/learning/R-review/review-template.md</Path>`
- Topic 状态规则：`<Path>{roots.workflows}/learning/common/skills/topic-synthesis/SKILL.md</Path>`
