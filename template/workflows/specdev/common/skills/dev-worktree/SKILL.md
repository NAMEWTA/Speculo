---
name: specdev-dev-worktree
description: 为并行写代码的 Ready Ticket 建立隔离 worktree，并由 Lead 完成基线、集成验证和清理。Goal Plan Lead 在创建、恢复或收尾 Ticket worktree 时使用。
---

# SpecDev Dev Worktree

## 适用范围

- 仅用于并行写代码且路径所有权不冲突的 Ready Ticket。
- 只读调查和顺序执行默认共用当前工作区。
- Lead 管理创建、集成和清理；Worker 只实现、验证并返回 Evidence。
- 平台原生 worktree 优先；不可用时使用 Git worktree。

## 生命周期

1. 创建或恢复时加载 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/references/create.md</Path>`。
2. Worker 完成后将记录从 `active` 更新为 `review`，返回 Ticket 状态、Evidence 路径、`workspace_ref`、commit 或 PR 引用，以及条件性 Lead E2E。
3. Lead 集成或清理时加载 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/references/finalize.md</Path>`。

状态依次为 `planned → active → review → integrated → removed`；失败进入 `blocked`。记录写入 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `worktrees`。

## 边界

- 每个并行 Ticket 使用独立 worktree、分支和相同 `base_sha`。
- 持久状态只保存 `workspace_ref`，不保存机器绝对路径。
- E2E 仅由 Lead 在集成阶段执行，且仅适用于用户界面交互受影响的变更。
- 合并、推送、PR、删除分支或 worktree 仍需用户授权。
