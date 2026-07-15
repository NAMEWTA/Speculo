---
name: speculo-write-workflows
description: 创建、审计、对账或重构 Speculo workflow package、PERSISTENCE 运行契约、route、atomic skill wrapper、XML 编排和状态骨架。当 vendor Git 变更新增、删除、移动或更新 SKILL，或 workflow catalog 与 raw targets 漂移时使用。
---

# Speculo Write Workflows

## 过程

1. 读取 [AGENTS.md](../../../AGENTS.md)、[workflow-authoring.md](../../../docs/workflow-authoring.md)、[persistence-contract.md](../../../docs/persistence-contract.md) 和 [authoring-quality.md](../_shared/authoring-quality.md)。完成标准：用户意图、route/atomic 入口、状态、产物与副作用边界均已明确。
2. 审计 `../../../template/workflows/`、可复用 `../../../template/skills/` 和不可变 vendor 输入。当 Git 变更触及 vendor-backed workflow 时，读取 [vendor-reconciliation.md](references/vendor-reconciliation.md) 并先运行其中的只读影响分析器；其他情况直接审计当前 inventory。完成标准：每个 raw SKILL、wrapper、catalog 与反向依赖都已归属，每个 Git 变更都已分类。
3. 设计 package：`WORKFLOW.md`、`PERSISTENCE.md`、可选 `routes/atomic-skills/templates` 与 `_state/{status.json,changes,archive}`。PERSISTENCE 独占 runtime roots、stores、change 启动和副作用规则；WORKFLOW 与 wrapper 第一阶段只引用它。完成标准：直接 wrapper 可独立启动，其他文件无契约副本。
4. 让 route 只调用 atomic wrapper；每个 wrapper 只加载 PERSISTENCE 并适配一个 SKILL。所有静态引用使用 `root + path`，产物使用 `root="change|state"`，适配只写入 workflow 与调用方。完成标准：catalog、目录和 raw targets 一一对应，路径不逃逸，experimental/user-only 约束保留，vendor 输入与对账前一致。
5. 同步 runtime-context、commands/skills 调用方、CLI 安装断言、作者文档和 README/CHANGELOG。运行 `pnpm validate-assets`、`pnpm check` 与 `pnpm verify-bin`。完成标准：全新安装、更新保留状态、direct/route 契约、引用解析和归档回归均有通过证据。

State schema 未变化时不修改 migration；已有可选数组按空值兼容。路径适配与确认规则写在 workflow wrapper/PERSISTENCE，raw vendor 保持只读。
