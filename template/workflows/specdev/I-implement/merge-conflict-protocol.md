# Merge / Rebase Conflict Protocol

只在 `git status` 证明仓库正处于 merge 或 rebase 冲突时加载。普通集成设计冲突继续按 deviation/upstream owner 处理。

## 流程

1. 读取 Git 状态、操作类型、冲突文件、base/ours/theirs commit 和当前 Ticket/Evidence。
2. 追溯双方意图：commit message、冻结的 source、Spec、Ticket、ADR、测试和调用者。二者缺失时不凭代码表面猜测产品行为。
3. 逐 conflict hunk 写出双方意图、共同约束和建议结果。只合并既有意图；需要发明新行为或改变上层合同则停止并登记 deviation。
4. 在获授权可写范围内解决文本，运行受影响测试、typecheck、lint 和项目要求的验证。
5. 分别展示并确认 `git add`、`git merge/rebase --continue` 和最终 commit 动作。没有授权时保存已分析方案、剩余文件和精确恢复命令，不擅自继续。
6. 重读 Git 状态和 diff，确认无 marker、无未声明路径、双方要求及测试仍成立。

## 完成标准

- 每个 hunk 的结果可追溯到双方意图；
- 新产品决定没有藏在冲突解决中；
- 项目验证有命令、退出码和关键输出；
- Git 副作用逐动作获得授权；
- 完成或暂停状态可以从 Evidence 和 Git 状态恢复。
