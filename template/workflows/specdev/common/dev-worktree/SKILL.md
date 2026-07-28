---
name: dev-worktree
description: 在 Speculo workflow change 内创建隔离 git worktree 进行开发，完成后验证测试并合回基础分支。当用户要求隔离开发、开始实现、或实现完成后需要合并/清理时使用。与 specdev workflow 深度集成，worktree 持久化在 change 目录下的 .worktree/ 中。
---

# Dev Worktree

为当前 workflow change 创建独立 worktree，实现「隔离开发 → 验证 → 合并 → 清理」闭环。

**启动时宣布：** 「正在使用 dev-worktree 技能。」

## 决策树

| 场景 | 入口 |
|------|------|
| 要开始实现 / 用户要求隔离 | **阶段 A：创建 worktree** |
| 已在 worktree 中，开发完成 | **阶段 B：收尾合并** |
| 已在 worktree 中，未完成 | 继续开发，不重复创建 |
| 用户要求 PR / 暂存 / 丢弃 | 阶段 B 按对应选项执行 |

## 阶段 A：创建 Worktree

完整步骤见 [references/create.md](references/create.md)。概览：

1. **检测现有隔离** — 已在 worktree 则跳过创建；submodule 内按普通仓库处理
2. **命名** — 分支 `speculo/<workflow>/<change>`；路径 `{state-root}/<workflow>/changes/<change>/.worktree/`；已存在则停止
3. **创建** — `git worktree add -b …`；确保 `.gitignore` 含 `.worktree/`
4. **基线** — 安装依赖并跑基线测试；失败则报告并询问
5. **写回** — 将 `base_branch` / `change_branch` / `worktree_path` / `worktree_status: active` 写入 change 的 `.status.json`

**前置：** `speculo/.speculo/` 必须被 git 跟踪；若被忽略则降级为非 worktree 模式。

## 阶段 B：收尾合并

完整步骤见 [references/finalize.md](references/finalize.md)。概览：

1. **验证测试** — 失败则停止，禁止合并/PR
2. **展示选项** — 本地合并（默认）/ 创建 PR / 保持 / 丢弃
3. **执行** — 本地合并顺序：checkout base → pull → `merge --no-ff` → 重跑测试 → `worktree remove` → `branch -d` → `prune` → 更新 `.status.json`

合并冲突或测试失败 → 停止，保留现场。冲突解决见 `<Path>{roots.workflows}/specdev/common/resolving-merge-conflicts/SKILL.md</Path>`。

## 红线

- 已在 worktree 时不嵌套创建；不覆盖已有分支或路径
- 测试失败时不合并/不发 PR；合并结果未验证不删 worktree
- 清理顺序固定：merge → remove worktree → delete branch；在 worktree 内部不执行 `git worktree remove`
- 破坏性操作须先确认；不强制推送
