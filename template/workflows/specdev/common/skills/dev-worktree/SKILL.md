---
name: specdev-dev-worktree
description: 为具有明确隔离触发条件的 Ready Ticket 或一次性原型建立可恢复 worktree，并由 workspace owner 与 integration owner 管理基线、自动本地集成或清理。
---

# SpecDev Dev Worktree

## 适用范围

- 只用于具备 `parallel-write`、`protect-local-state`、`disposable-experiment`、`background-resume`、`provider-requirement` 或 `user-requested` 触发事实的 Ready Ticket/原型。
- 只读调查、Agent Team 本身和没有其他隔离事实的顺序执行默认共用当前工作区。
- 调用方必须明确 trigger、workspace owner、implementation owner、integration owner、固定基线、父分支、工作项 ID、持久化 owner 和允许的结束动作。
- Coordination 与 workspace 正交：`single-session` 可以使用本 Skill；`lead-team` 不自动使用。Current workspace 下 Worker 只读；Worker 写入必须绑定本 Skill 创建的独立 workspace。
- 平台原生 worktree 优先；不可用时使用 Git worktree。

## 生命周期

1. 创建或恢复时加载 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/references/create.md</Path>`。
2. implementation owner 完成后返回工作项状态、Evidence/record 路径、`workspace_ref`、不可变 source checkpoint、commit 或 PR 引用和未验证项；Ticket worktree 从 `active` 更新为 `review`。
3. `terminal_action=integrate` 时 integration owner 自动加载 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/references/finalize.md</Path>`；`retain` 保持 review。一次性原型只评估和清理，不合入生产分支。

Ticket worktree 状态依次为 `planned → active → review → integrating → integrated → removed`；失败进入 `blocked`，记录写入 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `worktrees`。`integrating` 是带完整授权、来源和尝试证据的可恢复锁：同一父分支一次只允许一个 integration owner；fast-forward 与 merge-commit 都必须落到可复核的 `integrated/passed` 终态。原型的 branch、`workspace_ref` 和清理结果只写入 `<Path>{roots.state}/specdev/changes/{change}/prototypes/{prototype-id}/record.md</Path>`，不伪造 Ticket worktree 记录。

## 边界

- 每个隔离 Ticket 使用独立 worktree 和分支；同一并行 Wave 固定相同 `base_sha`。每个原型使用独立 worktree 和分支。
- Git provider 固定使用 `<project-root>/specdev-worktree/<work-item-id>/`，持久化 `workspace_ref: specdev-worktree/<work-item-id>`；`<project-root>` 由 `workspace.json#path_base: project-root` 解析。
- native/external provider 保留其可迁移 opaque locator；所有 provider 都不保存机器绝对路径、认证秘密或真实用户数据。
- 项目根 `.gitignore` 的 `specdev-worktree/` 条目由 `speculo init` 单一维护；缺失时创建流程阻塞并提示重新运行 init。
- E2E 仅适用于用户界面交互受影响的变更，由 integration owner 在集成阶段运行。
- `terminal_action=integrate` 授权本地 fast-forward，以及分叉集成所需的暂存、merge continue 和一次集成专用 merge commit；不授权普通实现提交、push、PR、远端 merge、部署、迁移或删除分支/worktree。
