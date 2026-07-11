# Git 与全局 State 契约

本契约定义可复现输入、工作区清洁提交和 docs-sync state v4。调用方拥有 Git 与持久化副作用。

## 运行前清洁

1. 确认当前目录属于唯一 Git 仓库，且不处于 merge、rebase、cherry-pick、revert 或 bisect。
2. 收集 `git status --short --branch`、`git diff --check`、staged、unstaged 与 untracked 路径；逐项读取内容和归属。
3. 运行仓库声明的最小完整校验。缺少校验命令时记录事实，不虚构命令。
4. 若存在冲突、校验失败、疑似密钥、异常大文件、无法判断用途的 untracked 文件或不相关用户改动，停止且不改变 Git 状态。
5. 其余改动按显式路径暂存，并创建一个 `chore(docs-sync): checkpoint workspace` commit。禁止使用 `git add .`、stash、reset、clean、amend、rebase 或丢弃内容。
6. 重新读取 `git status --short`；非空即继续分类，无法安全收敛时阻塞。

完成标准：`INPUT_HEAD=$(git rev-parse HEAD)` 已记录，工作区为空，checkpoint 的文件清单与验证结果进入报告。

## State v4

默认路径为 `speculo/.speculo/commands/docs-sync/state.json`：

```json
{
  "schema_version": 4,
  "command": "docs-sync",
  "state_path": "speculo/.speculo/commands/docs-sync/state.json",
  "baseline": { "mode": "explicit", "sha": null },
  "last_range": { "from_sha": null, "to_sha": null },
  "project_targets": [],
  "pending_legacy_targets": [],
  "scope_revision": 0,
  "scope_confirmed_at": null,
  "last_sync_run_at": null,
  "total_syncs": 0,
  "synced_assets": []
}
```

- `project_targets` 只保存不归属具体 workflow 的已确认项目文档目标。
- `baseline.mode` 为 `state-file-commit | explicit`。正常运行使用前者；迁移暂存使用后者。
- `last_range` 保存本次审计输入的两个 commit；`from_sha` 仅在 bootstrap 时可为 `null`。
- `pending_legacy_targets` 只用于迁移后等待用户重新确认的旧路径。
- state 不保存 diff、用户确认原文、绝对路径、个人信息或密钥。

## 基线解析

1. `state-file-commit`：运行 `git log -1 --format=%H -- "$STATE_FILE"`，把最后修改 state 的 commit 作为 `FROM_SHA`。
2. `explicit`：使用 `baseline.sha`；为 `null` 时进入 bootstrap。
3. 非空 `FROM_SHA` 必须是 `INPUT_HEAD` 的祖先；浅克隆缺历史、分支分叉或损坏 SHA 均阻塞。
4. 常规范围固定为 `FROM_SHA..INPUT_HEAD`；bootstrap 盘点当前项目事实，不对 `null` 执行 git diff。
5. 固定收集 log、name-status、shortstat 和具体文件 diff；commit 标题只用于导航，结论必须回到文件事实。

`last_range.from_sha/to_sha` 必须支持直接运行 `git diff "$FROM_SHA..$INPUT_HEAD"` 复现输入。

## v1-v3 迁移

- `tracked_docs`、`tracked_assets` 原样放入 `pending_legacy_targets`，不得自动转成授权。
- `synced_docs` 映射为 `synced_assets`；移除 short SHA、commit subject/date 等派生字段。
- `baseline` 使用 `explicit` 和旧 `last_sync_sha`；`last_range` 使用旧 `previous_sync_sha/last_sync_sha`。
- 首次 v4 运行统一展示、分类并确认 pending targets；成功后清空 pending，切换为 `state-file-commit`。

## 写回与提交

1. 验证通过后写同目录临时文件，再原子 rename state、报告和 sidecar；JSON 使用 2 空格和尾部换行。
2. 更新 `last_range={from_sha: FROM_SHA, to_sha: INPUT_HEAD}`、运行时间、计数和实际同步资产；正常输出将 baseline 设为 `{mode: "state-file-commit", sha: null}`。
3. 显式暂存本次文档、报告、state 和 sidecar。实际修改使用 `docs(docs-sync): synchronize project documentation`；no-op 使用 `chore(docs-sync): record no-op synchronization`。
4. commit 失败时保留证据并阻塞，不重写历史或丢弃文件。成功后 `git status --short` 必须为空。

下次运行通过 state 文件的 Git 历史定位本次输出 commit，因此不会把本次报告和文档提交重复纳入输入范围。
