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

## 流程

1. 用户明确指定 Lesson、Homework、Change 或 topic；读取对应的 sources、目标和过去证据。没有真实间隔时只记录 `due_at`，不伪造通过。
2. 在 Change 的 `review/INDEX.md` 和 `review/RV-<id>.md` 生成新复习记录。题目必须包含延迟回忆、机制/反例和新的迁移情境，不复制刚看过的示例。
3. 原样保存回答并给出逐项证据；失败只生成补救范围和 `needs_review`，不删除历史、不改写 archived 原文。
4. 只有通过真实延迟复习才设置 `mastery.retention=passed`、`mastery.overall=retention_verified`，并在 context topic view 标记 `mastered`。R 完成后不自动激活 A。

## 完成标准

- 时间、来源、题目和回答可审计；
- R 是可选 Work，H 的 immediate 评审可以结束当前学习轮次；
- 周期复习失败保留原证据并建立新的补救 Change 或 note。

## 子文件

- Review 模板：`<Path>{roots.workflows}/learning/R-review/review-template.md</Path>`
- Topic 状态规则：`<Path>{roots.workflows}/learning/common/skills/topic-synthesis/SKILL.md</Path>`
