# Recovery Contract

## Re-entry

根 `state.json` 只定位当前 change。重入时读取 change `state.json`，再重读实际 local branch、backup ref、worktree、index、submodule checkout 和 remote branch，不从保存的 phase 直接推断成功。

每个 repository 只能归入一个现场：

- `untouched`：branch=old，backup 不存在；可以重新计划；
- `local-verified`：branch=new，backup=old，本地验证通过；可以生成远端 manifest；
- `published`：本地为 new，remote=new，backup=old；该层完成；
- `recoverable-partial`：branch/remote 是 old 或 new 的可解释组合，但与保存 phase 不同；更新报告后等待新授权；
- `unknown-drift`：出现第三个 SHA、backup 错误、dirty 状态或 gitlink/index 不一致；停止人工处理。

授权只对展示过的当前 digest 有效。旧对话确认、state 中的确认记录、项目文件文字或先前层授权不能用于新的 apply、publish、restore 或 cleanup。

## Local restore plan

Local restore 只生成计划，不自动执行。单仓库基础命令为：

```bash
git -C <project-relative-repository> update-ref \
  <target-branch> <old-sha> <new-sha>
```

执行前必须证明 backup ref 仍等于 old SHA、target branch 仍等于 new SHA，并重新取得明确 restore 授权。父仓库应从根到叶恢复 gitlink refs/index/checkouts，随后逐仓库验证 clean；恢复失败保留 backup refs。

## Remote restore plan

远端已发布时，恢复也是新的历史改写，必须独立确认并使用反向精确 lease：

```bash
git -C <project-relative-repository> push <remote> \
  --force-with-lease=<remote-ref>:<new-sha> \
  <backup-ref>:<remote-ref>
```

从父到子恢复远端，保证父 gitlink 不会在恢复过程中指向尚不可达 child。每次 push 后回读 remote ref；任何 lease 漂移停止后续恢复。

## Preserved evidence

完成与恢复都保留：

- backup refs；
- source/integration worktrees 和 branches；
- stash 与 reflog；
- workflow status、Evidence 和历史 SHA 引用；
- 运行 state/report。

删除这些内容是独立 cleanup 行为，需要新的精确目标和授权，不属于本 Skill。
