# Speculo Command Authoring Contract

## Prerequisites

编写 command 前必须读取：
- [AGENTS.md](../AGENTS.md) — 代理手册
- [persistence-contract.md](./persistence-contract.md) — 持久化边界
- [.agents/skills/_shared/authoring-quality.md](../.agents/skills/_shared/authoring-quality.md) — 质量模型

## When to Create a Command

- 单次短编排保留为 command。
- 多阶段状态机升级为 workflow。
- 可复用判断或操作下沉为 skill。
- Command 不得复制 skill 流程，也不得与另一入口共享同一主导词。

## Command Structure

- 单文件入口：frontmatter 含 `id`、`type: command`、`name`、`description`、`keywords`。
- 报告路径：`speculo/.speculo/commands/<command>/<YYYY-MM-DD>-<scope>-<topic>[-NN].md`。
- Scope 必须从文件名可见，完整选择写入报告 frontmatter。
- Command 是薄编排和审计回执的所有者；被调用 skill 不自行持久化。

## Confirmation Gates

- 文件移动、删除、发布和外部 API 写入必须显式确认。
- 确认前只有 dry-run/计划。
- 执行后源、目标和报告均重新验证。

## Validation

- 运行 `pnpm validate-assets` 和相关 CLI 测试。
- 无旧 command id、旧报告路径或断开的 skill 指针。
