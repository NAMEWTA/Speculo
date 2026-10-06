---
id: learning/init-setup
type: workflow-entry
workflow: learning
name: 初始化学习系统
description: 初始化 Learning v2 的教学偏好、空索引、位置登记和可验证状态。
keywords: [初始化, learner-profile, context, learning-v2]
---

# 初始化学习系统

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`。

读取 `<Path>{roots.workflows}/learning/common/rules/activation-and-memory.md</Path>`，按当前 Change、OBJ、主题与证据 ID 定位本轮输入；仅当前恢复或安全门要求时扩读。

## 流程

1. 读取 `<Path>{roots.state}/learning/status.json</Path>`。不存在时从 `_state/status.json` 原子创建；存在 v1 或未知 schema 时停止并返回 `learning-reset-required`，不修复旧文件。
2. 读取 `<Path>{roots.workflows}/learning/I-init-setup/learner-profile-template.md</Path>`。只询问无法从环境发现的语言、表达基线、深度、图像/图解偏好、默认 Lesson 时长、Homework 题数和 R 偏好；保留已有字段。
3. 首次初始化才创建缺失的 `changes/`、`archive/`、`context/domains/`、`locations.json`、`context/INDEX.md`、`context/REVIEW.md`。已有文件先验证并保留，不能重置 active、位置、课程、原答、掌握证据或知识内容；必要文件缺失且存在既有 Change 时报告不一致，不用空索引掩盖。
4. 运行 `<Path>{roots.workflows}/learning/common/tools/validate-learning.mjs</Path>` 的 state 校验并重读新文件。

## 完成标准

- 状态、位置登记和 profile 是合法 v2；
- 首次空初始化没有虚构 active Change 或 mastered 条目；复核既有系统时原有记录与用户偏好保持不变；
- 本次没有外部副作用；新建空索引或既有索引均可导航，后续 Work 可恢复。

## 子文件

- Profile：`<Path>{roots.workflows}/learning/I-init-setup/learner-profile-template.md</Path>`
- 总目录：`<Path>{roots.workflows}/learning/I-init-setup/context-index-template.md</Path>`
- 复习目录：`<Path>{roots.workflows}/learning/I-init-setup/review-index-template.md</Path>`
