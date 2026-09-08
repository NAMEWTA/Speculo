---
name: speculo-write-command
description: 编辑 Speculo 的 `template/commands/<id>.md`；仅在一次调用的 scope、确认、报告、command state 或 skill 编排需要改变时使用。
---

# Speculo Write Command

Command 是一次调用的薄编排入口；复用逻辑归 skill，跨调用状态机归 workflow。

## 读取

先读 [`../_shared/authoring-protocol.md`](../_shared/authoring-protocol.md)、[`../_shared/project-model.md`](../_shared/project-model.md)、[`../_shared/authoring-quality.md`](../_shared/authoring-quality.md) 和 [`references/command-contract.md`](references/command-contract.md)，再定位目标 command、调用方、被调用 skill 与测试。不要默认读取全部 commands。

## 路由

1. 明确触发、参数、scope、报告路径、state、skill 输入/输出和副作用 owner。
2. 将破坏性、Git、远程 API、发布、部署和不可逆迁移放在明确确认门之后；未确认只产生 dry-run/计划。
3. 更新单文件入口和必要调用方；报告永不覆盖，执行后重读源、目标、state 和报告。
4. 运行共享 gates、dry-run、适用的 confirmed/写入、冲突和失败前置条件。

## 停止条件

scope/owner 不明、报告冲突、确认缺失、静态引用失效、状态漂移或部分失败时停止并列出已完成/未完成清单。
