---
name: speculo-write-workflows
description: 创建、审计或重构 Speculo workflow package、route、XML 编排和状态骨架。用户要求新增自定义 workflow、组合 vendor skills、调整持久化或维护 WORKFLOW.md 时使用。
---

# Speculo Write Workflows

## 过程

1. 读取 [AGENTS.md](../../../AGENTS.md)、[workflow-authoring.md](../../../docs/workflow-authoring.md)、[persistence-contract.md](../../../docs/persistence-contract.md) 和 [authoring-quality.md](../_shared/authoring-quality.md)。完成标准：目标 workflow 的用户意图、分支、状态与副作用边界均已明确。
2. 审计现有 `../../../template/workflows/`、可复用 `../../../template/skills/` 和只读 vendor 来源。完成标准：每个 route 的主导词、依赖和物理渐进披露边界都有唯一归属。
3. 设计一级 package：`WORKFLOW.md`、可选 routes/templates 和 `_state/{status.json,changes,archive}`。在 XML 中声明 `<runtime-context>`、`<persistence>`，所有静态引用使用 `root + path`，所有产物使用 `root="change|state"`。完成标准：没有绝对路径、`..`、裸 id、`src` 或未声明 state namespace。
4. 为每个 phase 写自然语言条件、稳定 id、连续 order、输入指针、产物和可检查完成标准；额外 state namespace 使用语义名称并懒创建。完成标准：每个分支只加载其需要的文件，所有关键决策和归档边界可恢复。
5. 同步 CLI 安装断言、迁移、README/architecture/quick reference 和调用方。运行 `pnpm validate-assets`、`pnpm check` 与 `pnpm verify-bin`。完成标准：全新安装、更新保留状态、引用解析和归档场景均有通过证据。

Vendor 内容保持原样；路径适配、持久化和副作用确认只写在 workflow wrapper。
