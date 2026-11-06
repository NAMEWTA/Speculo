---
name: learning
description: 设计课程、完整讲解、目标式源码学习、苏格拉底练习、主动探究、作业评审、延迟复习与知识综合。
---

# 学习与知识整理

先识别用户要听讲、练习、深挖、复习还是整理材料。直接回答清楚的问题；需要较长学习过程时才建立课程记录。表达通俗与内容深入是两个维度，不因使用 ELI5 就删去机制、边界和证据。

## 按学习意图进入

| 意图 | Work |
|---|---|
| 设置学习偏好、接续已有学习资料 | [初始化](learning-i-init-setup/SKILL.md) |
| 评估背景并安排课程 | [评估与课程规划](learning-a-assess-and-plan/SKILL.md) |
| 围绕一个项目、源码或可观察能力设计目标路线 | [目标学习](learning-g-goal/SKILL.md) |
| 完整讲一课、讲清一个主题 | [课程讲解](learning-l-lesson/SKILL.md) |
| 让我先回答，或主动替我找盲区并深挖 | [问答与探究](learning-q-question/SKILL.md) |
| 出作业、收答案并逐题反馈 | [作业评审](learning-h-homework/SKILL.md) |
| 检查一段时间后还能否回忆与迁移 | [延迟复习](learning-r-review/SKILL.md) |
| 综合多个主题、来源与练习证据 | [主题整合](learning-c-consolidate/SKILL.md) |
| 结束一轮学习并保留历史材料 | [归档](learning-a-archive/SKILL.md) |

这些能力可以独立使用，不要求先初始化、建完整课程或按顺序调用。用户要讲解时直接讲；只有明确的练习意图才把作答作为下一步。

## 记录与学习证据

优先使用已有笔记。持续学习默认在项目根 `.agents/speculo/.speculo/learning/<topic>/README.md` 保留目标、来源、已覆盖内容、实际回答和下一步；讲义、作业或图像需要独立阅读时再拆文件。

用户原始回答与 AI 解释分开，修订保留先前尝试。讲义已经生成、用户说听懂、当场做对和隔段时间仍能应用是不同证据，不凭模型自评写成“已掌握”。归档也不表示掌握。

讲解表达参考 [教学方法](references/teaching.md)，需要主动挖掘边界时参考 [深度探究](references/inquiry.md)。保存长期主题知识和归档时使用 [持久化](../../references/memory.md)，不生成状态 JSON 或重复索引。
