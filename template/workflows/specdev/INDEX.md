---
id: specdev
type: workflow
workflow: specdev
name: SpecDev Workflow
description: 以本地工件为开发权威，覆盖来源分诊、诊断、设计、逻辑/UI 原型、规格、Ticket、编排、实现、审查、复盘、GitHub/PR/包发布交付与知识归档。
keywords: [specdev, local-first, 规格驱动开发, decision-complete, prototype, code-review, TDD, retro, PR, release, 证据]
---

# SpecDev Index

本索引用于发现 SpecDev，并让未激活 SpecDev 的会话按需取得项目已经沉淀的长期知识。

激活后读取 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`：先定位相关 entry，再回读少量原文与 provenance；正式写入前检查 owner/gateway、pending transaction、lock 和 recovery evidence。

## 永久知识

读取本索引时，只把与当前请求相关且已经存在的内容作为只读背景；不存在的路径静默跳过：

- 永久架构决策：`<Path>{roots.state}/specdev/adr/</Path>`
- 永久领域上下文：`<Path>{roots.state}/specdev/context/</Path>`
- 永久研究：`<Path>{roots.state}/specdev/research/</Path>`

## Work 激活

用户明确激活 SpecDev 或其中某个 Work 后，读取 `<Path>{roots.workflows}/specdev/README.md</Path>` 取得 Work 条目、启动、恢复、状态、所有权和副作用合同，再进入目标 Work。仅发现本索引或读取永久知识不加载该合同。
