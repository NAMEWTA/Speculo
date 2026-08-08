---
name: specdev-dev-worktree
description: 为需要隔离项目写入的 Ready Ticket 或一次性原型建立可恢复 worktree，并由调用方明确的 workspace owner 管理基线、集成或清理。
---

# SpecDev Dev Worktree

## 适用范围

- 用于并行写代码且路径所有权不冲突的 Ready Ticket，或明确要求临时隔离的一次性原型。
- 只读调查和顺序执行默认共用当前工作区。
- 调用方必须明确 workspace owner、implementation owner、固定基线、工作项 ID、持久化 owner 和允许的结束动作。
- 普通执行不建立额外角色；委派 Goal Plan 才把 workspace owner/implementation owner 分别映射为 Lead/Worker。
- 平台原生 worktree 优先；不可用时使用 Git worktree。

## 生命周期

1. 创建或恢复时加载 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/references/create.md</Path>`。
2. implementation owner 完成后返回工作项状态、Evidence/record 路径、`workspace_ref`、checkpoint、commit 或 PR 引用和未验证项；Ticket worktree 从 `active` 更新为 `review`。
3. workspace owner 集成或清理时加载 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/references/finalize.md</Path>`；一次性原型只评估和清理，不合入生产分支。

Ticket worktree 状态依次为 `planned → active → review → integrated → removed`；失败进入 `blocked`，记录写入 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `worktrees`。原型的 branch、`workspace_ref` 和清理结果只写入 `<Path>{roots.state}/specdev/changes/{change}/prototypes/{prototype-id}/record.md</Path>`，不伪造 Ticket worktree 记录。

## 边界

- 每个并行 Ticket 使用独立 worktree、分支和相同 `base_sha`；每个原型使用独立 worktree 和分支。
- Git provider 固定使用 `<project-root>/specdev-worktree/<work-item-id>/`，持久化 `workspace_ref: specdev-worktree/<work-item-id>`；`<project-root>` 由 `workspace.json#path_base: project-root` 解析。
- native/external provider 保留其可迁移 opaque locator；所有 provider 都不保存机器绝对路径、认证秘密或真实用户数据。
- 项目根 `.gitignore` 的 `specdev-worktree/` 条目由 `speculo init` 单一维护；缺失时创建流程阻塞并提示重新运行 init。
- E2E 仅适用于用户界面交互受影响的变更。普通执行由当前集成 owner 运行；委派执行由 Lead 在集成阶段运行。
- 合并、推送、PR、删除分支或 worktree 仍需用户授权。
