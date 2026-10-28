# 在选定 change 工作区验收

Lead 在原 change workspace 上执行；本过程不创建 candidate worktree、不提交、不合并、不推进父分支。

1. 核对原 README 执行上下文、实际 Git、允许路径、原票据/Spec、owner、验证合同和已有授权。
2. 协调相关 writer 停写，冻结实际 commit 或未提交工作副本快照。检查全部交付范围，保留其他票和原有用户改动的归属，不暂存或覆盖它们。
3. 对固定输入执行必要集成/回归、类型/lint/build 和 Lead-owned E2E；记录命令、退出码和观察，not-required 给真实理由。
4. 按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/reviewer-contracts.md</Path> 确定最终范围的审查策略，再按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/review-evidence.md</Path> 核验两轴和固定输入。需要独立审查时，冲突修正者和参与实现的 Lead 均不能作为独立 reviewer；允许自查的范围由主 Agent 核验。输入变化只复用未失效的证据。
5. 回读真实交付与固定输入，验证通过后由 Lead 将本票执行记录标 verified、Ticket 标 done；整个 change 仍需整体 AC/Gate 和最终审查。没有提交授权时快照足够，不伪造 commit/result。
6. 失败保留实际工作区、快照、报告和命令；同一 blocker 无新证据或 attempts 达到有效上限时返回 Lead 复盘。记录共同失败模式、可能原因、下一轮实质改变及 owner/路由后才可重试，保留旧轮次。

明确请求的 Git/发布交付由原 owning 入口按具体授权串行执行，并重新核验变化后的交付。完成验收不自动授予 commit、merge、push、PR 或工作区清理权限。

**完成标准**：证据覆盖实际交付，verified 不等于已合并；失败不掩盖未知状态，不增加工作区。
