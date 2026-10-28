# 风险适配双轴审查

## 选择执行者，而不是固定角色拓扑

先依据本轮原 Spec/Ticket/README、用户与项目要求、影响范围和现有证据判断审查风险。在原 CR/Evidence 的 `Review` 段内说明 Risk、Independence、Strategy 与 Basis，不建立额外配置或审批表。普通低风险代码或文档修改可由当前主 Agent 自查，继续同一上下文和适用测试；两个判断轴不等于两名 Agent，也不要求另一会话。

高风险/高影响、安全或重大迁移、证据不足以自行判断，以及用户或项目明确要求独立审查时，采用实际未参与本范围实现的 reviewer。原 Ticket 的 high/critical risk、原 Spec/Goal/README 的 `review_independence: required` 或正文 `Review-Independence: required` 是上游约束，不能被 Evidence 自称 low 覆盖。风险发生变化时更新原决定及受影响证据，不通过降级记录绕过门。

需要独立性时，先按共享协调合同选择真实可用且获允许的通道；通常一位 reviewer 可完成两轴，只有有独立并行收益才拆开。实现者包括代码、配置、模型可见指令及修复/冲突解决的所有 Agent。改名、切换角色、重新开会话不改变实现参与事实。Reviewer 保持只读，参与修复后须换真正独立者。

只有明确需要独立性的任务才因独立能力/身份缺失而 blocked/unverified。普通自查不制造 dispatch receipt、TASK/REPORT、session 或额外 Agent。worker 不默认递归派单；跨级委派必须有明确能力、预算、权限与责任约定。Lead 始终回读实际结果并承担最终验收。

## 标准轴

依据固定 diff/log 或工作副本/文件快照、仓库标准与适用 Fowler 启发式，判断正确性、可维护性及真实风险。引用来源、代码和反例，区分 hard violation 与 heuristic；工具已强制的纯格式不重复模拟人工审查。

既有功能按 <Path>{roots.references}/change-scope/change-contract.md</Path> 追踪调用方、依赖和测试，对照影响分析与实际改动。缺少分析时重建并说明限制；文件快照不伪称历史 diff 或完整变更覆盖。

## 规范轴

以同一固定输入和实际规范判断需求完整性、越界、失败及边界语义，引用 AC/合同/决定。必要前置重构须有目的、范围与验证；获批重构按真实目标验收。影响清单不是写入授权。

## 结果与适用性

两轴分别判断、按 standards/specification 顺序记录，不用一轴结论替代另一轴，也不设置任意 finding 上限。两位 reviewer 时各自形成结论再汇总。每轴返回 `pass | request-changes | not-applicable`；不适用必须在原报告写具体 Reason，不得把未运行、未知或必需验收伪装成不适用。独立 C 确实没有规范时仍可 `skipped:no-spec`，但不能宣称完整规范验收；I 始终保留真实 AC 与其逐项验证。

按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/review-evidence.md</Path> 保存固定输入、实际结果及适用独立性证据。自查不是独立审查证书，独立报告也不是自动通过证书。
