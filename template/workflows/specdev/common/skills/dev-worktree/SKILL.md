---
name: dev-worktree
description: 管理 SpecDev required Ticket 的 Git worktree；创建隔离来源 workspace、固定实现 commit，并由 Lead 在 parent-candidate checkout 验证后推进父分支。
---

# Dev Worktree

本 Skill 由 T-tickets、P-goal-plan 和 I-implement 复用。仅在 Goal Plan 选择 `required` 时使用完整 source → candidate → parent 状态机；`current` Ticket 不调用本 Skill。

## 输入

- `operation=create | restore | finalize | remove`；
- `purpose=ticket`；
- repository、父分支、`base_sha`、branch、portable workspace locator；
- workspace、implementation 和 integration owner；
- 允许动作、路径合同、验证合同、调用方状态记录位置。

required Ticket 还必须提供 Ready Ticket、Goal Plan（若存在）、Evidence 路径、implementation commit 与本地 candidate integration/父分支更新授权。缺失时返回 blocked；current Ticket 应按 I-implement 的 direct-parent 规则执行。

## 1. 创建或恢复

`operation=create` 时加载 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/references/create.md</Path>`。Ticket 使用 `specdev-worktree/<ticket-id>`；同一 Ticket 只存在一个来源 worktree。`operation=restore` 时重读实际 Git worktree/branch/tip/dirty 状态并与调用方记录核对，漂移时停止。

**完成标准**：来源基线、branch、locator、owners 和实际 Git 状态一致；现有用户改动未被覆盖。

## 2. 来源实现门

implementation owner 只在来源 worktree 修改授权项目路径，运行 Ticket 要求的单元、组件、静态、类型、lint/build 等非 E2E 检查。进入 `review` 前，worktree 必须 clean，branch tip 必须是已授权的 `source_checkpoint` commit，实际 diff 必须符合路径合同。

**完成标准**：source checkpoint 不可变且可达；来源 worktree 没有 E2E pass 声明。

## 3. 候选合并与父分支推进

`operation=finalize` 仅由 Lead/integration owner 调用，并加载 `<Path>{roots.workflows}/specdev/common/skills/dev-worktree/references/finalize.md</Path>`。Lead 在独立 parent-candidate checkout 组合最新父分支与 source checkpoint，运行集成检查和适用 E2E，通过后才推进父分支。

本地 candidate checkout/branch 的创建、重建和回收属于已授权 local candidate integration；来源 branch/worktree 的删除仍需要独立 cleanup 授权。push、PR、remote merge、deploy、migration 和生产动作不从本 Skill 继承。

**完成标准**：Ticket `integrated` 时父 HEAD 精确等于记录的 result SHA，并包含 source checkpoint；失败或 stale 时父分支未变化。后续 `removed` 只表示来源 branch/worktree 已清理，不撤销该集成事实。

## 4. 移除

`operation=remove` 先验证 Ticket 已 `integrated`、目标 worktree clean、checkpoint 可恢复且删除目标精确。只有明确 cleanup 授权时删除来源 branch/worktree；强制删除需要单独确认。删除后重读 `git worktree list` 与 refs，并只把调用方生命周期状态更新为 `removed`；`base_sha`、source checkpoint、candidate/result、验证、E2E 与 Evidence 字段必须原样保留。

**完成标准**：只删除精确授权目标；失败保留现场与恢复命令。

## 固定规则

- Agent Team 不决定 worktree；Ticket 切片本身决定来源 worktree；
- Ticket E2E 只在 Lead-owned parent-candidate checkout 运行；
- 每个 Done Ticket 必须有 source commit 与父分支 result，worktree 状态为 `integrated` 或其清理后终态 `removed`；
- candidate 失败保留来源 worktree 修正，父分支不动；
- 成功集成不自动清理来源 branch/worktree。
