---
name: specdev-code-review
description: 从不可变固定点对本地 diff 执行隔离的标准轴与规范轴审查，供独立 C Work 和 I Work 最终审查共同调用。
---

# SpecDev Code Review

本 Skill 返回审查结果，不创建 runtime namespace。调用方分别负责 C review 工件或 I Evidence。

## 输入

- `fixed_point`：已解析的 commit SHA；
- `head`：已解析的 HEAD/checkpoint SHA；
- `diff_command`：固定为三点 diff；
- `commit_log`：固定点之后的 commit 列表；
- `spec_sources`：零个或多个本地权威来源；
- `standards_sources`：仓库编码标准来源；
- `review_context`：路径范围、调用 Work 和适用授权；
- `parallel_reviewers`：平台支持时为 true，否则使用两个独立上下文包顺序执行。

## 流程

1. 重验 fixed point/head 可解析、三点 diff 非空，失败时不启动 reviewer。
2. 加载 `<Path>{roots.workflows}/specdev/common/skills/code-review/references/source-discovery.md</Path>`，穷尽规范和标准来源。
3. 加载 `<Path>{roots.workflows}/specdev/common/skills/code-review/references/fowler-smells.md</Path>` 作为标准轴最低启发式；仓库明确标准优先。
4. 加载 `<Path>{roots.workflows}/specdev/common/skills/code-review/references/reviewer-contracts.md</Path>`，用互不共享发现的上下文分别运行两个轴。
5. 原顺序返回 `standards` 和 `specification` 两份结果。规范来源不存在时只跳过规范轴并解释，标准轴继续。

## 输出

```text
{
  fixed_point, head, diff_command, commit_log,
  standards: { result, findings, sources },
  specification: { result, findings, sources },
  skipped_axes,
  summary_counts
}
```

Finding 必须包含 severity、项目相对 Path/代码块、具体风险、依据和满足条件。两个轴不合并、不跨轴重排，也不选“赢家”。

## 完成标准

- fixed point、head、diff 和 commits 固定且可重复；
- 仓库标准优先于 Fowler 启发式；
- 两个 reviewer 上下文没有相互发现污染；
- 每个发现可定位且说明行为风险；
- 两轴按固定顺序返回，缺失规范没有掩盖标准审查。
