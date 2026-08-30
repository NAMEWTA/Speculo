---
id: learning/init-setup
type: workflow-entry
workflow: learning
name: 初始化学习系统
description: 初始化学习者教学偏好、纯 Markdown 知识目录和可验证的 Learning 状态，不写入任何伪造知识。
keywords: [初始化, learner-profile, context-index, learning]
---

# 初始化学习系统

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`，再执行本入口。

本 Work 只建立恢复所需骨架。它不评估能力、不创建已掌握知识，也不把用户年龄写成领域水平。

## 流程

1. 读取 `<Path>{roots.state}/learning/status.json</Path>`；不存在时从 workflow seed 原子创建。存在时按 schema v1 验证，不覆盖或修复未知结构。
2. 读取 `<Path>{roots.workflows}/learning/I-init-setup/learner-profile-template.md</Path>`。`learner-profile.md` 不存在时，只询问无法发现的教学语言、图解偏好、单次节奏和复习时间偏好，然后创建；存在时保留未要求修改的内容。
3. 创建不存在的 `<Path>{roots.state}/learning/changes/</Path>`、`<Path>{roots.state}/learning/archive/</Path>` 和 `<Path>{roots.state}/learning/context/domains/</Path>`。
4. 从对应模板创建缺失的 `context/INDEX.md` 与 `context/REVIEW.md`。索引只包含标题和表头，不写示例知识行。
5. 运行 `<Path>{roots.workflows}/learning/common/tools/validate-learning.mjs</Path>` 的 state 校验；重读所有新建文件。
6. 初始化不创建 change，也不写 `works_run`。返回 A-assess-and-plan 作为正常下一路由。

## 完成标准

- 全局状态是合法 schema v1，既有状态未丢失；
- profile 只记录教学和复习偏好，不声明无证据能力；
- context 目录是空的可导航 Markdown 图书；
- 没有新增 mastered 条目、active change 或外部副作用。

## 子文件引用

- Profile 模板：`<Path>{roots.workflows}/learning/I-init-setup/learner-profile-template.md</Path>`
- 总目录模板：`<Path>{roots.workflows}/learning/I-init-setup/context-index-template.md</Path>`
- 复习目录模板：`<Path>{roots.workflows}/learning/I-init-setup/review-index-template.md</Path>`
