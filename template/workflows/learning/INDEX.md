---
id: learning
type: workflow
workflow: learning
name: Learning Workflow
description: 以完整、通俗、多表示的课程，单文件作业评审、可选延迟复习和带溯源的主题综合，持续建立个人 Markdown 知识库。
keywords: [learning, 学习, 教学, 作业, 复习, 综合, 知识, eli5]
---

# Learning Index

本索引只用于被动发现 Learning 和已发布的主题知识；被动读取不得初始化状态、创建 Change 或修改复习状态。需要执行 Work 时必须读取 `<Path>{roots.workflows}/learning/README.md</Path>`。

## 永久知识（主题视图）

- 总目录：`<Path>{roots.state}/learning/context/INDEX.md</Path>`
- 主题目录：`<Path>{roots.state}/learning/context/domains/{domain}/topics/{topic-id}/INDEX.md</Path>`
- 复习目录：`<Path>{roots.state}/learning/context/REVIEW.md</Path>`

主题文件是带 evidence status 和 provenance 的派生视图；原始课程、作业和回答始终回到对应 Change 核对。

## Work 激活

用户明确激活 Learning 或指定 Work 后，读取 `<Path>{roots.workflows}/learning/README.md</Path>`，按 v2 状态、位置登记和 ownership 合同恢复或创建 Change。Work 的建议下一步不构成自动授权。
