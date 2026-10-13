# Rewrite Contract

## Request schema

Request 使用 schema v1：

```json
{
  "schema_version": 1,
  "topic": "account-profile",
  "repositories": [
    {
      "id": "backend",
      "path": "services/backend",
      "branch": "refs/heads/feature/account-profile",
      "start": "<commit-ish>",
      "end": "<commit-ish>",
      "boundary": "inclusive",
      "message": "feat: complete account profile",
      "sign": false,
      "remote": {
        "name": "origin",
        "branch": "refs/heads/feature/account-profile",
        "publish": true
      },
      "submodule_of": null
    }
  ]
}
```

- `topic` 和 repository `id` 使用小写 ASCII kebab-case。
- `path` 是项目根 POSIX 相对路径，`.` 表示项目根；不得绝对、包含 `..` 或穿越符号链接。
- `branch` 与 remote branch 必须是通过 `git check-ref-format` 的完整 `refs/heads/...`。
- `start`、`end` 在 plan 时各解析一次并冻结为完整 commit SHA；空值和歧义值失败。
- `message` 非空且不含 NUL；完整消息进入私有运行 state，报告只保留 subject 与 SHA-256。
- `sign` 必须是 boolean；为 true 时使用当前仓库签名配置执行 `git commit-tree -S` 并在移动 ref 前验证新 commit。
- `remote` 为 `null` 表示 local-only；非 null 时三个字段均必填。`publish: false` 不访问远端写接口。

## Range semantics

目标范围始终结束于选中 local branch 的 tip：

```text
exclusive: baseline = start,    replace start..end
inclusive: baseline = start^1,  replace start^1..end
```

`inclusive` start 没有 parent 时 baseline 为 null，新提交成为 root commit。Start 必须出现在 `git rev-list --first-parent end` 中；只通过普通 ancestry 到达不够。End 不等于 branch tip、范围为空或范围不能减少节点时失败。

普通 repository 的新 commit 使用 `end^{tree}`，并且只有 baseline 一个 parent。该策略不重放被替换的 merge，不执行内容合并，也不读取真实 index 来构造 tree。

## Read-only preflight

逐仓库穷尽检查：

- Git feature probe、worktree/bare/shallow 状态、replace refs 和 grafts；
- branch/start/end/baseline 的 object 类型、first-parent ancestry 和范围计数；
- 全部 linked worktrees 的 branch、HEAD、locked/prunable、staged、unstaged、untracked 状态；
- merge、rebase、cherry-pick、revert、bisect、sequencer 与 index/ref lock；
- stash tip、范围内 local branch/remote/tag refs 和从旧 SHA 定位到的 workflow evidence；
- submodule mode `160000`、`.gitmodules` 映射和 request dependency 图；
- remote push URL 数量、remote branch tip、local ancestry 和 provider protection policy。

Plan 命令统一设置 `GIT_OPTIONAL_LOCKS=0`。已有 stash、其他 refs 和 completed/archived workflow evidence 只记录；active workflow evidence、dirty/prunable worktree、进行中操作、浅克隆、replace/graft、多个 push URL 或未知远端保护策略阻塞执行。

## Local transaction

执行层开始前，把 `phase=local-applying` 和精确 manifest 原子写入运行 state/report。创建 commit object 后先验证 tree、parent、message digest 和签名，再通过 `git update-ref --stdin` 事务完成：

```text
start
create <backup-ref> <old-head>
update <target-branch> <new-head> <old-head>
prepare
commit
```

Backup ref 格式为：

```text
refs/speculo/backups/git-history-squash/<run-id>/<repository-id>
```

事务必须要求 backup ref 不存在且 target branch 仍等于 old head。每仓库事务原子；多个仓库之间不宣称原子。脚本在每个仓库成功后立刻原子更新运行 state/report。

## Local verification

普通 repository 同时满足：

- `new^{tree} == old_end^{tree}`；
- new 的 parent list 精确等于 baseline，或 root-inclusive 时为空；
- `git rev-list --count baseline..new == 1`，root-inclusive 使用 `git rev-list --count new == 1`；
- target branch 等于 new，backup ref 等于 old；
- target branch 所在 worktree 仍 clean。

Submodule parent 使用 submodule contract 的 planned tree，不套用普通 tree 等价规则。

## Remote lease

远端 old SHA 来自 push URL 对应 branch 的 `git ls-remote --exit-code`，不从 remote-tracking ref 推断。发布前再次回读，随后只运行等价于：

```bash
git push <remote> \
  --force-with-lease=<remote-ref>:<remote-old-sha> \
  <local-ref>:<remote-ref>
```

Remote ref 不存在、old SHA 在本地未知、old SHA 不是 old local head 的祖先、lease 漂移或回读失败均停止。普通 `--force`、省略 expected SHA 的 lease、matching refspec 和多个 push destinations 不进入执行路径。

本地 path/file remote 的 protection 为 `not-applicable`。`github.com` remote 使用 `gh api` 读取 branch、classic protection 和适用 rules；`non_fast_forward`、锁定、禁止 force push、需要 PR 或无法判定时阻塞发布。其他 provider 在 v1 标记 `unknown` 并阻塞发布。

## Report and state

根 state：

```json
{"schema_version":1,"current_change":"YYYY-MM-DD-topic"}
```

运行 state 保存 schema version、run id、phase、request、冻结 repository manifest、per-repository result、当前 local/publish digest、确认摘要、错误和更新时间。写入使用同目录临时文件、flush/fsync 和 atomic rename；state symlink、未知 schema 或现有 active run 漂移时停止。

`report.md` 从运行 state 整体重建，只允许原子替换同一 run 的报告；其他运行目录和报告永不覆盖。报告路径使用项目相对 POSIX 路径，外部 worktree 使用稳定占位 locator；URL、token、email 和机器绝对路径不得持久化。
