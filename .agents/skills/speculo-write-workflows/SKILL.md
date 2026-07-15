---
name: speculo-write-workflows
description: 创建、审计或重构 Speculo workflow package、PERSISTENCE 运行契约、route、atomic skill wrapper、XML 编排和状态骨架。
---

# Speculo Write Workflows

## 过程

1. 读取 [AGENTS.md](../../../AGENTS.md)、[workflow-authoring.md](../../../docs/workflow-authoring.md)、[persistence-contract.md](../../../docs/persistence-contract.md) 和 [authoring-quality.md](../_shared/authoring-quality.md)。完成标准：用户意图、route/atomic 入口、状态、产物与副作用边界均已明确。
2. 审计 `../../../template/workflows/`、可复用 `../../../template/skills/` 和只读 vendor 来源。为每个独立 SKILL 建立唯一 wrapper；只有真实组合才进入 route。完成标准：每个能力的触发词、target 和渐进披露边界都有唯一归属。
3. 设计 package：`WORKFLOW.md`、`PERSISTENCE.md`、可选 `routes/atomic-skills/templates` 与 `_state/{status.json,changes,archive}`。PERSISTENCE 独占 runtime roots、stores、change 启动和副作用规则；WORKFLOW 与 wrapper 第一阶段只引用它。完成标准：直接 wrapper 可独立启动，其他文件无契约副本。
4. 让 route 只调用 atomic wrapper；每个 wrapper 只加载 PERSISTENCE 并适配一个 SKILL。所有静态引用使用 `root + path`，产物使用 `root="change|state"`，vendor 不修改。完成标准：catalog、目录和 raw targets 一一对应，路径不逃逸且 experimental/user-only 约束保留。
5. 同步 runtime-context、commands/skills 调用方、CLI 安装断言、作者文档和 README/CHANGELOG。运行 `pnpm validate-assets`、`pnpm check` 与 `pnpm verify-bin`。完成标准：全新安装、更新保留状态、direct/route 契约、引用解析和归档回归均有通过证据。

State schema 未变化时不修改 migration；已有可选数组按空值兼容。路径适配与确认规则写在 workflow wrapper/PERSISTENCE，raw vendor 保持只读。
