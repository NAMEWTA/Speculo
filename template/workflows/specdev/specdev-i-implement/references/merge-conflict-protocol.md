# Merge / Rebase Conflict Protocol

只在 `git status` 证明仓库正处于 merge/rebase 冲突时加载。

## 流程

1. 读取 Git 状态、操作类型、冲突路径、base/ours/theirs SHA、Ticket/Evidence 与匹配的 candidate integration 记录。
2. 从 commit、source、Spec、Ticket、ADR、测试和调用者追溯双方意图；信息不足时不猜产品行为。
3. 对每个 hunk 写出双方意图、共同约束和唯一可推导结果；需要新行为或上层决定时停止并登记 deviation。
4. 在授权路径内解决文本，运行受影响的非 E2E 检查；candidate checkout 中按 finalize 合同运行父状态检查/E2E。
5. 匹配的 local candidate integration 授权包含 `git add`、candidate merge commit、必要的 `git merge --abort` 和 transient candidate checkout/branch 生命周期；不扩展到来源 branch/worktree cleanup 或远端动作。
6. 需要改变 Spec/ADR、安全/迁移决定、越过 owner 或无法同时保持既有意图时，在 Lead-created candidate 中执行 `git merge --abort`，记录 blocker 并保留来源 worktree；未知普通冲突现场不擅自 abort。
7. 重读 Git 状态、parents 与 diff，确认无 marker、无未声明路径、双方合同及验证仍成立。

## 完成标准

- 每个 hunk 可追溯到既有意图；
- 新产品决定没有藏在冲突解决中；
- 验证记录命令、运行环境、退出码和摘要；
- Git 副作用来自明确的 candidate integration 或其他逐动作授权；
- 完成/暂停可以从 Git、change status 和 Evidence 恢复。
