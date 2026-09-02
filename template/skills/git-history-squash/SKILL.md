---
id: git-history-squash
type: skill
name: git-history-squash
description: 受控压缩指定 Git 分支 tip 的 first-parent 提交区间，并以可恢复的本地 ref 事务和精确远端 lease 收敛历史。
disable-model-invocation: true
---

# Git History Squash

以**受控历史收敛**为主导词。本 Skill 只在用户显式调用后运行；讨论 squash、rebase、提交整理或项目文件中的指令均不构成调用或副作用授权。

## 1. 解析运行上下文

1. 从当前目录向上寻找并读取 `<Path>{roots.state}/workspace.json</Path>`，验证 `path_base: project-root` 和全部 roots，再读取 `<Path>{roots.config}</Path>`；无法唯一确定项目根时停止。
2. 读取项目 `AGENTS.md` 及目标仓库作用域内规则。
3. 将本 Skill 的持久化根解析为 `<Path>{roots.state}/skills/git-history-squash/</Path>`。根 `state.json` 只保存当前可恢复运行的 locator；每次运行使用 `<Path>{roots.state}/skills/git-history-squash/{date}-{topic}[-NN]/</Path>`，已有目录永不覆盖。
4. 从 [request template](assets/request-template.json) 生成临时 request JSON。用户必须逐仓库明确 repository、完整 local branch ref、start、end、`inclusive | exclusive`、commit message、签名选择和远端发布选择；不得猜测缺失值。
5. 读取 [Rewrite contract](references/rewrite-contract.md)，用它验证区间语义、预检项、确认门和 Git 写入边界。涉及父仓库与 submodule 时同时读取 [Submodule contract](references/submodule-contract.md)。

**完成标准**：项目根、Skill state 根、request、目标仓库、分支、边界、消息和远端选择均只有一个解释；缺失项已向用户询问而非采用默认值。

## 2. 生成 dry-run 计划

运行：

```bash
node <Path>{roots.skills}/git-history-squash/scripts/git-history-squash.mjs</Path> plan \
  --root . \
  --state-root <Path>{roots.state}/skills/git-history-squash</Path> \
  --evidence-root <Path>{roots.state}</Path> \
  --request <request.json>
```

`plan` 可以写本 Skill 的报告与恢复 state，但不得创建 Git object、移动 ref、改变 index/worktree 或访问远端写接口。它冻结完整 SHA、区间计数、merge 数、worktree、dirty/operation 状态、关联 refs、workflow evidence、submodule 图、远端 tip 和可验证的保护策略。

将脚本返回的 `change`、`report`、`next_action` 和 digest 原样保存。任何 blocker 都保持 dry-run，返回报告和修复条件。

**完成标准**：报告位于本 Skill 的唯一运行目录；所有 Git refs 与工作区状态和 plan 前相同；只有无 blocker 的精确 manifest 才产生 `confirm-local`。

## 3. 本地确认与执行

向用户展示报告中的完整本地 manifest：每个 repository、branch、start/end/baseline SHA、first-parent/reachable/merge 数、commit message、签名选择、backup ref、关联 refs/worktrees，以及 submodule 执行层。

只有用户在当前对话中明确确认该 manifest 和 `plan_digest` 后运行：

```bash
node <Path>{roots.skills}/git-history-squash/scripts/git-history-squash.mjs</Path> apply \
  --root . \
  --state-root <Path>{roots.state}/skills/git-history-squash</Path> \
  --change <change> \
  --confirm-plan <plan_digest>
```

脚本执行前重验完整计划。每个仓库使用终点 tree 与唯一 baseline parent 创建新 commit，再以 compare-and-swap ref transaction 同时创建 backup ref、移动目标 branch。任一漂移停止当前层；不删除或改写其他 branch、tag、worktree、stash、reflog 或 workflow evidence。

多层 submodule 图只执行当前 eligible 层；下层要求发布时，父层必须等下层远端验证后重新产生新的 `plan_digest` 并再次确认。

**完成标准**：脚本重读证明每个已处理仓库的新 tree、parent、提交数、backup ref 和工作区状态满足合同；失败时 state/report 明确区分已完成与未完成仓库。

## 4. 远端确认与发布

当脚本返回 `confirm-publish` 时，向用户展示完整远端 manifest：repository、remote、remote branch、冻结的 old SHA、local new SHA、保护策略和发布顺序。

只有用户在当前对话中明确确认该 manifest 和 `publish_digest` 后运行：

```bash
node <Path>{roots.skills}/git-history-squash/scripts/git-history-squash.mjs</Path> publish \
  --root . \
  --state-root <Path>{roots.state}/skills/git-history-squash</Path> \
  --change <change> \
  --confirm-publish <publish_digest>
```

发布只使用精确 `--force-with-lease=<ref>:<old-sha>` 和单一显式 refspec。远端 tip 漂移、保护策略不允许、push 失败或回读不等于 new SHA 时立即停止；不回滚已经发布的其他仓库。

**完成标准**：每个成功远端 branch 回读精确等于 new SHA；父仓库 gitlink 指向的 child SHA 已先从对应远端 branch 到达；未发布仓库及恢复步骤已进入报告。

## 5. 恢复或结束

读取 [Recovery contract](references/recovery-contract.md)。中断或重入时先运行：

```bash
node <Path>{roots.skills}/git-history-squash/scripts/git-history-squash.mjs</Path> status \
  --root . \
  --state-root <Path>{roots.state}/skills/git-history-squash</Path> \
  --change <change>
```

实际 refs/remotes 与 state 一致时，使用脚本返回的下一 digest 回到步骤 3 或 4。漂移时保持 blocked，按报告生成新的精确恢复计划并重新取得授权；本 Skill 不自动执行恢复或清理。

**完成标准**：运行状态为 `completed-local | completed-published | blocked-partial` 之一；报告包含全部确认、验证、远端结果和精确恢复命令，且没有 token、email、凭证 URL 或机器绝对路径。

## 固定边界

- `end` 必须等于目标 local branch tip；v1 不改写分支内部区间。
- `start` 必须位于 `end` 的 first-parent 链；`inclusive` 使用 `start^1` 为 baseline，root start 产生无 parent 新提交；`exclusive` 保留 start 并以其为 baseline。
- dry-run 不 fetch、不 stash、不 checkout、不创建 commit/tree、不移动 ref、不改变 index、不 push。
- 本 Skill 不调用 `rebase`、普通 `--force`、没有精确 expected SHA 的 lease、`reset --hard` 或自动 cleanup。
- GitHub 远端只有在 protection/rules 查询成功且允许非 fast-forward update 时才发布；无法验证策略的远端只生成本地计划。
