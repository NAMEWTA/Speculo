---
id: learning/quiz
type: workflow-entry
workflow: learning
name: 即时掌握测验
description: 在不泄露答案的前提下对锁定目标执行即时回忆、解释、迁移和误区测验，并产生可审计评分。
keywords: [测验, quiz, mastery, rubric, 即时评估]
---

# 即时掌握测验

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`，再执行本入口。

Q 只拥有即时测验。通过表示当前会做，不表示已经长期保持，因此不能完成或归档 change。

## 流程

1. 恢复 change，读取锁定 plan 和独立 practice 证据；证据不足返回 P。设置 phase=`immediate_quiz` 和 `current_work=learning/quiz`。
2. 按 `<Path>{roots.workflows}/learning/common/rules/assessment-policy.md</Path>` 创建下一个 `quiz/immediate-NN-questions.md`。覆盖全部关键 OBJ、主动回忆、因果/结构解释、新情境迁移和误区辨析。
3. 停止并等待学习者作答。把原文写入 `immediate-NN-response.md`；在该文件存在前不得创建 result 或展示答案。
4. 使用教学前锁定的 rubric 和验证来源评分，写 `immediate-NN-result.md`。逐 OBJ 引用 response 证据，标记 score、critical、transfer、misconceptions 和 confidence。
5. 未达到 mastery policy 时设置 immediate=`failed | needs_review`，保留 active，写最小补救范围并路由 E/P。不得降低目标后重用旧 result。
6. 通过时设置 immediate=`passed`、retention=`not_attempted`、change_status=`awaiting_retention`，安排不少于 24 小时的 `next_review_at`；清空 current work 并路由 R。

## 完成标准

- question、response、result 分离且编号一致；
- result 晚于原始 response，评分覆盖每个关键 OBJ；
- 通过后仍不是 completed，context 和 archive 未修改；
- 失败具有精确补救路由，旧 attempt 保留。

## 子文件引用

- 测验工件模板：`<Path>{roots.workflows}/learning/Q-quiz/quiz-artifact-template.md</Path>`
