# Speculo Persistence Contract

## Root Resolution

1. 从当前工作目录向上寻找 `speculo/.speculo/workspace.json`。
2. 第一个命中的目录是 `project_root`；同时命中多个候选或用户指定目录与候选不一致时停止并澄清。
3. `workspace.json` 定义 root aliases，`path_base` 必须为 `project-root`：

```json
{
  "speculo": "speculo",
  "state": "speculo/.speculo",
  "commands": "speculo/commands",
  "skills": "speculo/skills",
  "workflows": "speculo/workflows",
  "vendor": "speculo/vendor"
}
```

## Workflow Persistence

- 每个 workflow 的 `<runtime-context>` 声明其 roots（workflow、state、可选 vendor roots）。
- `<persistence>` 声明 store namespaces，全部以 state root 为基准。
- 固定 stores：`status.json`（index）、`changes/`（active）、`archive/`（archive）。
- Lazy stores（knowledge、policy、integrations、backlog）：只在 route 产生对应内容时创建。
- Existing-only stores（如 `.config`）：只读兼容来源，不自动创建。

## State Boundaries

- 每个 workflow 只写自己的 `status.json/changes/archive` 和已声明 namespace。
- Command 报告：`speculo/.speculo/commands/<command>/<YYYY-MM-DD>-<scope>-<topic>[-NN].md`。
- Command state：`speculo/.speculo/commands/<command>/state.json`。
- Skill 只使用调用方提供并完成边界校验的路径，不自行选择持久化根。
- Raw vendor skill 未经 workflow runtime context 激活时，不继承 Speculo 持久化保证。

## docs-sync.json (Command Sidecar)

- 由 docs-sync command 延迟创建，不属于 `_state/` 骨架。
- 位于 `speculo/.speculo/<workflow>/docs-sync.json`。
- 记录每个 workflow 的 `project_targets` 和 `state_targets`。
- Schema version 1，含 `scope_revision`、`scope_confirmed_at`。

## Migration

- v2 state：顶层 `dev/doc/person` 配 `*-status.json` 索引。
- transitional v3：`commands/.config/docs-sync-state.json`。
- migrate command：plan → dry-run → apply，带 rollback 安全网。
- 迁移是原子的：staging 目录构建 → rename 旧 state → rename staging → 成功后清理备份。
