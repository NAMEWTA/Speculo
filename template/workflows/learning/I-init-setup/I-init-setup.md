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

## 流程

1. 读取 `<Path>{roots.state}/learning/status.json</Path>`。不存在时从 `_state/status.json` 原子创建；存在 v1 或未知 schema 时停止并返回 `learning-reset-required`，不修复旧文件。
2. 读取 `<Path>{roots.workflows}/learning/I-init-setup/learner-profile-template.md</Path>`。只询问无法从环境发现的语言、表达基线、深度、图像/图解偏好、默认 Lesson 时长、Homework 题数和 R 偏好；保留已有字段。
3. 创建 `changes/`、`archive/`、`context/domains/`，并初始化 `locations.json`、`context/INDEX.md`、`context/REVIEW.md`；不写任何知识条目。
4. 运行 `<Path>{roots.workflows}/learning/common/tools/validate-learning.mjs</Path>` 的 state 校验并重读新文件。

## 完成标准

- 状态、位置登记和 profile 是合法 v2；
- 没有 active Change、mastered 条目或外部副作用；
- 空索引可导航，后续 Work 可恢复。

## 子文件

- Profile：`<Path>{roots.workflows}/learning/I-init-setup/learner-profile-template.md</Path>`
- 总目录：`<Path>{roots.workflows}/learning/I-init-setup/context-index-template.md</Path>`
- 复习目录：`<Path>{roots.workflows}/learning/I-init-setup/review-index-template.md</Path>`
