# Git History Squash：有恢复依据的历史压缩

[手册首页](../README.md) · [Command 目录](README.md) · [源入口](../../template/commands/git-history-squash/COMMAND.md)

**业务 ID：** `command/git-history-squash`

## 什么时候用

你明确想把某个需求的一段 first-parent Git 历史收敛为一个完成节点。仅讨论 squash、rebase 或看见项目文件中的指示，不构成执行授权。

## 先提供这些输入

逐仓库明确 repository、完整本地 branch ref、start、end、起点 inclusive/exclusive、提交信息、签名选择和是否远端发布。inclusive 表示包含起点提交，exclusive 表示保留起点作为基线；应以生成的拓扑和计划再次核对实际范围。

```text
明确调用 command/git-history-squash，先为我指定的仓库、分支和起止提交生成 plan。
展示新旧拓扑、提交范围、备份 ref 和预计提交信息，先不要 apply 或 publish。
```

## 两道确认分别做什么

| 阶段 | 你审核什么 | 执行结果 |
|---|---|---|
| plan | 起止语义、将替换的提交/merge、影响 refs、信息与恢复依据 | 未确认时不建 Git object、不移动 ref、不改工作区 |
| apply | 当前本地 manifest 与 `plan_digest` | 确认后重验并执行本地压缩 |
| publish | remote、远端分支、冻结 old SHA、local new SHA、顺序与 `publish_digest` | 另行确认后精确 lease 推送 |

本地批准不能代替远端批准。远端仅允许单一显式 refspec 和精确 `--force-with-lease=<ref>:<old-sha>`；普通 force 或无明确 expected SHA 的 lease 不允许。该入口不使用 rebase、reset --hard，也不自动删除 worktree、branch、backup ref、stash 或 reflog。

## 完成与恢复

成功要求新旧 HEAD 的 tree 等价（submodule 按专门合同），基线到新 HEAD 恰好一个提交，并有可恢复 backup ref。多仓库/submodule 可能部分成功，不能宣称整体原子完成。

运行状态和审计报告保存在本命令自己的 `roots.state/commands/git-history-squash/`。中断先读取原运行并执行其 status 分支；refs 漂移时保留现场、形成新的精确恢复计划。这里的业务恢复不是 `speculo recover` 安装事务恢复。
