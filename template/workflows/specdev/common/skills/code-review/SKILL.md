---
name: code-review
description: 对固定的本地文件快照或不可变 Git diff 按真实风险选择主 Agent 自查或独立 reviewer，执行标准轴与规范轴审查，供独立 C Work 和 I Work 最终审查共同调用。
compatibility: Requires the owning Speculo workflow resources and explicit project roots.
metadata: {"speculo-source-id": "specdev-code-review"}
---

# SpecDev Code Review

本 Skill 返回审查结果，不创建 runtime namespace。调用方分别负责 C review 工件或 I Evidence。

先读取 <Path>{roots.workflows}/specdev/common/skills/code-review/references/reviewer-contracts.md</Path>，依据原范围、风险、实际证据及用户/项目要求决定 self 或 independent。普通任务可以由主 Agent 在当前上下文完成两轴，不启动额外 Agent；高风险、独立要求或需独立判断时才按 <Path>{roots.references}/coordination/coordination-contract.md</Path> 选择实际获允许的 reviewer 通道。required 方式不静默回退，缺少必需独立能力才阻塞相应任务；不默认递归派单。

## 输入

默认 diff 模式使用下列 fixed_point/head/diff/log。C 显式本地文件分支使用 `review_mode: source-files` 与 `source_snapshot`（路径/原始字节 SHA256）；不提供虚假的 Git 字段。各模式均提供规范、标准、范围和风险策略；需要独立时再提供真实独立身份。I 的 Ticket 或 Direct Spec 在 current/worktree 未提交交付时使用 `review_mode: working-tree`，按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/working-tree-review.md</Path> 固定完整交付快照。

- `fixed_point`：已解析的 commit SHA；
- `head`：已解析的 HEAD/checkpoint SHA；
- `diff_command`：由调用方冻结的实际 argv；baseline 模式三点，显式 range/commit 使用已确认端点，不由 reviewer 换范围；
- `commit_log`：固定点之后的 commit 列表；
- `spec_sources`：零个或多个本地权威来源；
- `standards_sources`：仓库编码标准来源；
- `review_context`：路径范围、调用 Work 和适用授权；
- 实现者、当次 review 策略与依据；独立时提供真实 reviewer 身份及派遣凭据，不按轴数推导 Agent 数。

## 流程

1. diff 模式重验 fixed point/head、实际 diff 语义和摘要；无效引用不启动 reviewer。合法空 diff 由调用方返回 no-diff，不伪造 approved 或复用非空报告。显式范围不得回退为默认三点比较。source-files 模式重验固定路径与原字节，不推断历史 diff 或 commit。
2. 加载 `<Path>{roots.workflows}/specdev/common/skills/code-review/references/source-discovery.md</Path>`，穷尽规范和标准来源。
3. 发现已有审查并拟复用时，先读取 `<Path>{roots.workflows}/specdev/common/skills/code-review/references/result-reuse.md</Path>`，完整核对输入、当次策略所需独立性与原始证据；能证明相同的轴保留原结果，其余轴按下列步骤运行；未能证明相同就正常重审两轴。
4. 加载 `<Path>{roots.workflows}/specdev/common/skills/code-review/references/fowler-smells.md</Path>` 作为标准轴最低启发式；仓库明确标准优先。
5. 用户要求全面审查或触及安全、数据迁移、公共契约、并发和恢复时，先加载 `<Path>{roots.workflows}/specdev/common/skills/code-review/references/risk-review.md</Path>`，覆盖全部适用风险，不限制 finding 数量。
6. 按已读取的风险策略，由主 Agent 自查或实际派遣未参与实现的 reviewer，分别运行两个轴。
7. 按 `standards`、`specification` 顺序返回两份结果。C 规范来源确实不存在时只跳过规范轴并解释，标准轴继续；I 缺少权威规范则阻塞，不允许跳过后完成。
8. 按 <Path>{roots.workflows}/specdev/common/skills/code-review/references/review-evidence.md</Path> 返回固定输入、原始报告、实际审查者身份以及独立策略需要的工具凭据，由 Lead 核验并写入原 owning 工件。

## 输出

source-files 结果以 `review_mode` 和 `source_snapshot` 代替下例 Git 字段，其余两轴、来源和限制结构相同。

```text
{
  fixed_point, head, diff_command, commit_log,
  standards: { result, findings, sources },
  specification: { result, findings, sources },
  review_strategy, risk, independence, basis, reviewers, implementers,
  dispatch_receipts /* only when actually delegated */,
  skipped_axes,
  summary_counts
}
```

Finding 必须包含 severity、项目相对 Path/代码块、具体风险、依据和满足条件。两个轴不合并、不跨轴重排，也不选“赢家”。

## 完成标准

- diff 的 fixed point、head、diff、commits 或 source-files 的原字节快照固定且可重复；
- 仓库标准优先于 Fowler 启发式；
- 两轴分别判断、按固定顺序返回原始结果，缺失规范未掩盖标准审查；需要独立时 reviewer 未参与本范围实现且真实派遣/返回已核验；
- 每个发现可定位且说明行为风险。

对适用风险先给出可证伪反例，再追踪消费者、实现、测试及恢复；测试覆盖率、配对哈希或 schema 成功不代替语义审查。错误和可靠性分别引用 <Path>{roots.workflows}/specdev/common/rules/error-handling.md</Path> 与 <Path>{roots.workflows}/specdev/common/rules/test-reliability.md</Path>。

