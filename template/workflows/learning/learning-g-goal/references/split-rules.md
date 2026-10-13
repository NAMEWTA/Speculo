# 拆课规则（split-lesson）

每课最多 10 问。10 问仍说不清，说明课拆得不够，应继续拆课而不是继续问。`split-lesson` 不是 `C-consolidate`。

## 计数

- 计数键是 `lesson_id`，不是 wave，不是 Change，不是 mine unit。
- 文件：`goal/probes/GP-<lesson>-b01.md` 承载 Q1–Q5；`GP-<lesson>-b02.md` 承载 Q6–Q10。
- 两批都必须走 socratic-questioning skill 的 5 槽（澄清 / 证据 / 反例 / 视角 / 元问题）。`b02` 只把审问对象挖深，不改槽位，不改 `audience=mine` 协议。
- 第 11 问非法。出现 `b03` 非法。满 10 后 `mine-more` 非法，只走 `split-lesson`。
- `re-dispatch-L` 改写同一课，**不重置**该课 `question_budget_used`。已经问过的题仍算在原课上。
- split 出的新课各自获得新的 10 问预算。原课收窄覆盖后，剩余预算冻结，不再追加问题。
- `validate-learning` 按 `lesson_id` 统计 Q 数，`>10` 报错；出现 `b03` 报错。

## 「10 问仍解释不清」的操作定义

满足任一即可由 miner 填写 `split-proposal`（Lead 裁决）：

1. 该课声称覆盖的矩阵格子仍有 `uncovered`，且 `b02` 的 Q5 / Q10 仍建议 `mine-more`。
2. 合格读者读完 Lesson + 两批 probe，仍说不出该课声称覆盖的函数目的、主路径或失败路径、或方法副作用。
3. 若把缺口继续写进同一课，`time_budget` 将超过 40 分钟（违反 L 合同）。

不触发 split：

- 只是缺 L 合同章节（直觉 / 机制 / 边界 / 例子 / 文字等价物）→ `re-dispatch-L`，同一课补丁。
- 格子可以诚实标 `deferred(reason)` → `defer`，不再提问。
- 格子本就该 `covered-by-parent` → 改矩阵，不开新课。

## `re-dispatch-L` 与 split 的分界

| 证据 | Lead 处置 | 谁执笔 |
| --- | --- | --- |
| 同一 OBJ，缺动机 / 机制 / 边界 / 例子 / 文字等价物 | `re-dispatch-L` | 原课的 L 子代理补丁 `lessons/L-*.md` |
| 一课声称覆盖超过 1 个容器，或 10 问后仍有解不开的函数簇 | `split-lesson` | Lead 改 chain；新 L 子代理写新课 |
| 源码里没有该符号，或超出 Scope | `defer(reason)` | Lead 改矩阵 |
| 需要改 `course.md` OBJ | 停止并 `replan` | 用户激活 G-goal + A |
| 当前 unit 加新课后将超过 15 节 | 新课进下一 unit，本 unit 先收束 | Lead |

Miner 只填表，不选择处置。

## `split-lesson` 不是整合

- Miner 不得改 `course.md`，不得改 `chain.md`，不得写 `lessons/`。它只在 probe 里填写 `split-proposal`：建议新课标题、从原课拿走哪些格子、为什么 10 问不够。
- Lead 若判断 OBJ 不变、只是课粒度粗：可在 `chain.md` 追加子节点。新课优先进入**当前或下一个 mine unit**；若当前 unit 加进去会超过 15 节，必须开新 unit，不得把第 16 节塞进当前扇出。
- Lead 若判断必须改 `course.md` 的 OBJ：停止，要求用户激活 G-goal `replan`（跟随 A）。`/goal` 不得偷偷改写 A 的目标。
- max split depth = 2。超过则 `defer(reason=needs-replan)`，写 verify 草稿，回到 G-goal `replan`。
- 禁止把 split 做成 `C-consolidate`，禁止搬到 `children/`，禁止写 `synthesis/` 或 `context/`，禁止调用 `relocate-learning.mjs`。

## HARD NO

- 同一 `lesson_id` 第 11 问非法
- 满 10 问后禁止 `mine-more`
- `split-lesson` 不得调用 `C-consolidate` 或 `relocate-learning.mjs`
- 当前 unit 加新课会超过 15 时，新课进入下一 unit
