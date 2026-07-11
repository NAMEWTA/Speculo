# Speculo Workflow Authoring Contract

## Prerequisites

编写 workflow 前必须读取：
- [AGENTS.md](../AGENTS.md) — 代理手册
- [persistence-contract.md](./persistence-contract.md) — 持久化边界
- [.agents/skills/_shared/authoring-quality.md](../.agents/skills/_shared/authoring-quality.md) — 质量模型

## Package Structure

```
workflows/<workflow>/
  WORKFLOW.md          # 入口：frontmatter + XML 声明
  routes/              # route markdown 文件
  _state/              # 骨架：status.json, changes/, archive/（必需）
```

## WORKFLOW.md 必需元素

- `<runtime-context>`：root 声明（workflow、state、可选 vendor roots）。
- `<persistence>`：store 声明（index/changes/archive 必需；其余 lazy）。
- `<routes>`：route 条目含 `id`、`order`、`root`、`path`、`<when>` 条件。
- 可选：`<sequence>`、`<dependencies>`、`<state-schema>`、`<transitions>`。

## Validation Rules（由 validate-framework-assets.mjs 强制）

- workflow root 必须解析到 `speculo/workflows/<workflow>`。
- state root 必须解析到 `speculo/.speculo/<workflow>`。
- persistence root 必须为 `"state"`。
- Index store：file `status.json`；changes：directory `changes`；archive：directory `archive`。
- 无绝对路径、无 `..`、无反斜杠。
- 所有静态引用（skill、route、command 等）必须解析到已有文件。
- `_state/` 必须存在且含 `status.json`、`changes/`、`archive/`。

## Sidecar Rule

`docs-sync.json` 是 command 拥有的延迟 sidecar，不得放入 `_state/` 模板。
