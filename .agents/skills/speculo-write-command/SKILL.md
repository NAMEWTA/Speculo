---
name: speculo-write-command
description: 创建、审计或整合 Speculo 的单文件 command。用户要求新增一次性命令、合并相似 commands、设计报告路径或把可复用逻辑下沉到 skill 时使用。
---

# Speculo Write Command

## 过程

1. 读取 [AGENTS.md](../../../AGENTS.md)、[command-authoring.md](../../../docs/command-authoring.md)、[persistence-contract.md](../../../docs/persistence-contract.md) 和 [authoring-quality.md](../_shared/authoring-quality.md)。完成标准：命令意图、scope、破坏性动作和报告需求已明确。
2. 审计 `../../../template/commands/` 与 `../../../template/skills/`。单次短编排保留为 command；多阶段状态机升级为 workflow；可复用判断或操作下沉为 skill。完成标准：command 不复制 skill 流程，也不与另一入口共享同一主导词。
3. 设计单文件入口和唯一报告：`speculo/.speculo/commands/<command>/<YYYY-MM-DD>-<scope>-<topic>[-NN].md`。Scope 必须从文件名可见，完整选择写入报告 frontmatter。完成标准：同日冲突、workspace/multi-workflow/workflow/change scope 和 command state 均有确定规则。
4. 将文件移动、删除、发布和外部 API 写入显式确认门禁；通过 `workspace.json` + target workflow `INDEX.md` 解析路径。完成标准：确认前只有 dry-run/计划，执行后源、目标和报告均重新验证。
5. 更新调用方、索引、迁移和测试，运行 `pnpm validate-assets` 与相关 CLI 测试。完成标准：无旧 command id、旧报告路径或断开的 skill 指针。

Command 是薄编排和审计回执的所有者；被调用 skill 不自行持久化。
