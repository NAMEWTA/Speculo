# Git 冲突处置

仅在当前工作区已有 merge/rebase 冲突或明确授权的 Git 集成发生冲突时读取；普通票据实现不创建 candidate worktree 或自动合并。

1. 读取实际 Git 操作状态、原 owner、目标、基线、授权和冲突文件，不将未知现场视作本次操作。
2. 暂停重叠写集，保留未提交用户/其他票改动及可恢复 checkpoint。解决冲突须在原写集内保持双方已批准意图。
3. 需要改变 Spec/ADR、安全/迁移/验收或越过 owner 时停止并返回真正 owner；未知 merge/rebase 不自动 abort。
4. 只有与当前操作匹配的授权包含相应暂存、提交或 abort 时才执行；任何操作不扩展到其他 branch/worktree 或远端。
5. 修正者记入实际实现者。在选定工作区冻结实际结果，按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/reviewer-contracts.md</Path> 对修正后的范围选择适用双轴审查，重跑受影响验证，再记录结果；需要独立审查时，修正者不能充当独立 reviewer。

**完成标准**：实际 Git 状态、交付和证据一致；失败保留现场，不创建额外工作区或删除来源分支。
