# Vendor Workflow Reconciliation

当 vendor Git 变更触及 `<atomic-skills source-root="...">` 所属目录时，执行本对账分支。Vendor 是不可变输入；当前 raw inventory 是 `coverage="complete"` catalog 的期望集合。

## 1. 冻结输入

记录 `git status --short`、vendor diff 与当前内容摘要。默认分析复制后、提交前的 `HEAD -> worktree`：

```sh
node .agents/skills/speculo-write-workflows/scripts/vendor-workflow-impact.mjs --format markdown
```

已提交的 vendor 更新使用显式范围：

```sh
node .agents/skills/speculo-write-workflows/scripts/vendor-workflow-impact.mjs \
  --from <old-revision> --to <new-revision> --format markdown
```

使用 `--workflow <id>` 限定一个 workflow，`--format json` 获取 schema v1 机器输出，`--check` 在存在结构漂移或 blocker 时返回 1。参数、Git 基线或契约无效时返回 2。完成标准：报告覆盖 staged、unstaged、untracked 和 rename detection，每个改动都映射到 raw SKILL 或 collection-level review。

## 2. 处理变更矩阵

- **Added**：以 raw frontmatter `name` 创建唯一 wrapper，同步 `stability/invocation`，加入词法排序且 order 连续的 catalog。直接 atomic 入口是默认归属；只有真实组合需求才加入 route。
- **Deleted**：没有 route、raw `/skill` 或外部路径引用时，移除 wrapper/catalog 并重排 order。存在反向依赖时形成 blocker，逐个给出替代、合并或删除能力的推荐。
- **Moved**：`name` 不变时只更新 target path；跨入或移出 `in-progress/` 时同步稳定性和调用策略，并复审 route 归属。
- **Renamed**：`name` 变更是 atomic ID 变更。扫描完整依赖闭包；有依赖时按 Deleted 的 blocker 规则处理，无依赖时同步重命名 wrapper/catalog。
- **Modified/supporting**：检查 frontmatter、新增或删除的 `/skill` 调用、relative links、路径假设、持久化与副作用。只在 raw 语义确实改变时更新 wrapper description/completion 或 route。

Raw `name` 缺失、重复、与 wrapper ID 冲突，或已删除 ID 仍被当前 raw SKILL 调用时，直接形成 blocker。完成标准：每个 safe action 已实施，每个 blocker 已获得用户决策。

## 3. 闭合依赖

重新扫描 `WORKFLOW.md`、`routes/`、所有 raw SKILL 的嵌套调用、README/AGENTS/CHANGELOG、tests 和 scripts。将可推导的 inventory 断言写成动态检查，使用“完整覆盖”表述长期文档；历史发布记录保留当时事实。

对账后再运行分析器 `--check`，然后运行 `pnpm validate-assets`、`pnpm check` 与 `pnpm verify-bin`。最后重新读取 vendor diff/摘要，应与第 1 步记录一致。完成标准：`--check` 返回 0，无旧 ID/路径残留，全部验证通过，vendor 输入未被适配层改写。
