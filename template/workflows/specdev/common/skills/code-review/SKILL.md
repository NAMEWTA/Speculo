---
name: code-review
description: 对固定的本地文件快照或不可变 Git diff 由未参与实现的 Agent 执行标准轴与规范轴审查，供独立 C Work 和 I Work 最终审查共同调用。
compatibility: Requires the owning Speculo workflow resources and explicit project roots.
metadata: {"speculo-source-id": "specdev-code-review"}
---

# SpecDev Code Review

本 Skill 返回审查结果，不创建 runtime namespace。调用方分别负责 C review 工件或 I Evidence。

采用调用方按 <Path>{roots.references}/coordination/coordination-contract.md</Path> 确定的 review 阶段方式。默认派遣一位未参与当前范围实现的原生 subagent，分别完成两轴；实际需要可拆成两位。已选择 Herdr/Orca/CLI 的任务沿该方式派遣，明确 review 阶段选择优先。能力不足或独立身份不明时阻塞完成，不能由实现者自审替代。task 上下文仅执行已分配轴，不递归派遣。

## 输入

默认 diff 模式使用下列 fixed_point/head/diff/log。C 显式本地文件分支使用 `review_mode: source-files` 与 `source_snapshot`（路径/原始字节 SHA256）；不提供虚假的 Git 字段。各模式均提供规范、标准、范围和独立身份。I 的 Ticket 或 Direct Spec 在 current/worktree 未提交交付时使用 `review_mode: working-tree`，按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/working-tree-review.md</Path> 固定完整交付快照。

- `fixed_point`：已解析的 commit SHA；
- `head`：已解析的 HEAD/checkpoint SHA；
- `diff_command`：由调用方冻结的实际 argv；baseline 模式三点，显式 range/commit 使用已确认端点，不由 reviewer 换范围；
- `commit_log`：固定点之后的 commit 列表；
- `spec_sources`：零个或多个本地权威来源；
- `standards_sources`：仓库编码标准来源；
- `review_context`：路径范围、调用 Work 和适用授权；
- 实现者真实身份、所选 review 方式与实际派遣凭据；默认一位独立 reviewer，需要时分别派遣两轴。

## 流程

1. diff 模式重验 fixed point/head、实际 diff 语义和摘要；无效引用不启动 reviewer。合法空 diff 由调用方返回 no-diff，不伪造 approved 或复用非空报告。显式范围不得回退为默认三点比较。source-files 模式重验固定路径与原字节，不推断历史 diff 或 commit。
2. 加载 `<Path>{roots.workflows}/specdev/common/skills/code-review/references/source-discovery.md</Path>`，穷尽规范和标准来源。
3. 发现已有审查并拟复用时，先读取 `<Path>{roots.workflows}/specdev/common/skills/code-review/references/result-reuse.md</Path>`，完整核对输入、审查者独立性与原始证据；能证明相同的轴保留原结果，其余轴按下列步骤运行；未能证明相同就正常重审两轴。
4. 加载 `<Path>{roots.workflows}/specdev/common/skills/code-review/references/fowler-smells.md</Path>` 作为标准轴最低启发式；仓库明确标准优先。
5. 用户要求全面审查或触及安全、数据迁移、公共契约、并发和恢复时，先加载 `<Path>{roots.workflows}/specdev/common/skills/code-review/references/risk-review.md</Path>`，覆盖全部适用风险，不限制 finding 数量。
6. 加载 `<Path>{roots.workflows}/specdev/common/skills/code-review/references/reviewer-contracts.md</Path>`，实际派遣未参与实现的 Agent，分别运行两个轴。
7. 原顺序返回 `standards` 和 `specification` 两份结果。C 规范来源确实不存在时只跳过规范轴并解释，标准轴继续；I 缺少权威规范则阻塞，不允许跳过后完成。

8. 按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/review-evidence.md</Path> 返回固定输入、原始报告、真实 reviewer 身份和工具凭据，由 Lead 核验并写入原 owning 工件。

## 输出

source-files 结果以 `review_mode` 和 `source_snapshot` 代替下例 Git 字段，其余两轴、来源和限制结构相同。

```text
{
  fixed_point, head, diff_command, commit_log,
  standards: { result, findings, sources },
  specification: { result, findings, sources },
  reviewers, implementers, dispatch_receipts,
  skipped_axes,
  summary_counts
}
```

Finding 必须包含 severity、项目相对 Path/代码块、具体风险、依据和满足条件。两个轴不合并、不跨轴重排，也不选“赢家”。

## 完成标准

- diff 的 fixed point、head、diff、commits 或 source-files 的原字节快照固定且可重复；
- 仓库标准优先于 Fowler 启发式；
- 每个 reviewer 均未参与本范围实现；两轴分别判断并返回，有真实派遣与原始结果证据；
- 每个发现可定位且说明行为风险；
- 两轴按固定顺序返回，缺失规范没有掩盖标准审查。

对适用风险先给出可证伪反例，再追踪消费者、实现、测试及恢复；测试覆盖率、配对哈希或 schema 成功不代替语义审查。错误和可靠性分别引用 <Path>{roots.workflows}/specdev/common/rules/error-handling.md</Path> 与 <Path>{roots.workflows}/specdev/common/rules/test-reliability.md</Path>。
