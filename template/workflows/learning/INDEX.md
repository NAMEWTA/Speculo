---
id: learning
type: workflow
workflow: learning
name: Learning Workflow
description: 以可验证目标、通俗教学、主动练习和延迟测验，将项目、产品、学科、语言或技能学习沉淀为可检索的个人 Markdown 知识。
keywords: [learning, 学习, 教学, 测验, 复习, 知识, 项目, 产品, 英语, eli5]
---

# Learning Index

本索引用于发现 Learning，并让未激活状态机的会话按图书目录方式读取已经掌握的知识。Learning 不使用 RAG、向量数据库、Embedding、语义分块或重排器。

## 永久知识

只读取当前请求需要且实际存在的索引或知识文件；路径不存在时静默跳过。被动读取不得初始化状态、创建 change 或修改复习状态：

- 总目录：`<Path>{roots.state}/learning/context/INDEX.md</Path>`
- 复习目录：`<Path>{roots.state}/learning/context/REVIEW.md</Path>`
- 领域知识：`<Path>{roots.state}/learning/context/domains/</Path>`

检索顺序固定为总目录、领域 `INDEX.md`、精确知识文件。索引缺失或链接失效时可以用 `rg` 在 Learning state 根内定位候选，但搜索结果不是知识权威，必须回到真实 Markdown 文件核对。

## Work 激活

用户明确激活 Learning 或其中某个 Work 后，读取 `<Path>{roots.workflows}/learning/README.md</Path>`，取得 Work 条目、启动、恢复、状态、所有权、掌握门和副作用合同。仅发现本索引或读取永久知识不加载该合同。
