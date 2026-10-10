---
artifact: learning-goal-probe
probe_id: GP-<lesson>-b0N
lesson_id: L-<NNN>-<slug>
audience: mine
batch: b01
question_budget_used: 0
split_depth: 0
status: open
---

# Probe GP-<lesson> / b0N

审问对象是已写成的 Lesson 与源码，不是学习者。禁止 `inquiry/`、`Response:`、`Submission:`、`verdict`、mastered。`b01` 承载 Q1–Q5；`b02` 承载 Q6–Q10。禁止 `b03`。miner 不得写 `lessons/`。

`question_budget_used` 按 `lesson_id` 累计。`re-dispatch-L` 不重置该课预算。

## Q1 澄清

哪些范围内单元被这节课声称覆盖？

## Q2 证据

源码里哪些函数、容器或数据流真正被讲到？

## Q3 假设与反例

合格读者读完后仍说不出什么？具体遗漏了哪个假设、边界或失败情境，为什么容易漏掉，忽略会改变什么判断？不要仅因材料未提到就断言学习者不理解。

## Q4 视角

架构边或数据流边缺了哪一条？相关时检查重复执行、结果未知、恢复与无进展循环；说明处理责任层、所需证据和可观察的验证条件，不只列“重试/监控”。

## Q5 元问题

`mine-more` | `defer` | `re-dispatch-L` | `split-lesson`，原因：

（`b02` 的元问题是 Q10，选项相同。满 10 问后 `mine-more` 非法，只允许 `split-lesson` / `defer` / `re-dispatch-L`。）

## 缺口清单

| 格子 | 缺口 | 建议补丁 | 处置建议 |
| --- | --- | --- | --- |
|  |  |  | mine-more / defer / re-dispatch-L / split-lesson |

每个主要缺口在表后追加遗漏原因、触发/父问题、证据与待验证项；新的 b02 应带来增量，不重复 b01。

Miner 只填表，不选择最终处置。

## split-proposal

10 问后仍不清，或操作定义触发时填写；否则写 `none`。

| 原 lesson_id | 建议新课标题 | 从原课拿走的格子 | 为什么 10 问不够 |
| --- | --- | --- | --- |
|  |  |  |  |

Lead 裁决：新课进当前或下一 mine unit；当前 unit 加进去会超过 15 则开新 unit。不得调用 `C-consolidate` 或 `relocate-learning.mjs`。

## 关闭

- 状态：`open` | `patched` | `deferred` | `split_proposed` | `closed`
- `question_budget_used`：
- 是否改变了至少一个矩阵格子，或显式 `defer` / `split-proposal`：
