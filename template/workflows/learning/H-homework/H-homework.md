---
id: learning/homework
type: workflow-entry
workflow: learning
name: 课程作业与评审
description: 以单一 Markdown 文件生成题目、接收显式提交并追加逐题评审；不与 Lesson 混写。
keywords: [homework, assignment, questions, grading, explain]
---

# 课程作业与评审

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`。

## 流程

1. 用户指定一个或多个 Lesson/OBJ 和题数（默认 5）。读取课程正文、目标、来源和背景；不得把题目答案提前写入作业。
2. 创建 `homework/HW-<NNN>-<slug>-attempt-01.md`，写元数据、Q1…、空白 A1… 和 `Submission: pending`，更新 `homework/INDEX.md`。
3. 用户填写 A1…并在文件中加入精确行 `Submission: ready` 后再次激活 H。H 校验回答原文和提交标记，冻结问题/答案内容。
4. 只在同一文件末尾追加 `## Review`：每题给出 `correct|partial|incorrect|uncertain`、证据覆盖、中文详细讲解、`Explain (English)`、误区和下一步，并记录引用的 Lesson/source anchor。
5. 评审完成后更新 homework/immediate 投影；不写 mastered、不自动启动 R/C/A。重新作答必须创建新的 attempt 文件并链接旧 attempt，旧文件不可改写。

## 完成标准

- 一个作业文件包含问题、学习者答案、提交标记和 AI 评审；
- 评审不会改写学习者答案，答案不完整时按 evidence/uncertain 处理；
- H 的分类结论可结束当前学习轮次，R 才是延迟掌握证据。

## 子文件

- 作业模板：`<Path>{roots.workflows}/learning/H-homework/homework-template.md</Path>`
- 评审规则：`<Path>{roots.workflows}/learning/common/rules/assessment-policy.md</Path>`
