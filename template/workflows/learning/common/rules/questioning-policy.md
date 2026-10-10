# 苏格拉底问答政策

反问批次只允许写在 `Q-question` 拥有的 `inquiry/` 内。`L-lesson` 仍然禁止 Q/A、答案、verdict、mastered。本政策改出题与讲解，不改 H 的 `Submission` 协议。

`audience=mine` 的 probes 只写入 `G-goal` 拥有的 `goal/probes/`。审问对象是已写 Lesson 与源码，不是学习者；禁止 `inquiry/`、`Response:`、`Submission:`、verdict、mastered。tutor 批次仍只写 `inquiry/`。

先读取 `<Path>{roots.workflows}/learning/common/rules/inquiry-depth-policy.md</Path>`，将提问动作与内容覆盖分开；工程主题按需读取 `<Path>{roots.workflows}/learning/common/rules/production-inquiry.md</Path>`。本文件的作答协议只属于 tutor；explore 不用空 A 或 Response，也不借 teaching_method 改协议。

<!-- portable:recipes:start -->
## 配方

用户可指定 `teaching_method`；缺省为 `socratic`。配方只改变 Q1–Q5 的写法，不改变文件协议。

| teaching_method | Q1 | Q2 | Q3 | Q4 | Q5 |
| --- | --- | --- | --- | --- | --- |
| `socratic` | 澄清/定义 | 机制/证据 | 假设与反例 | 迁移/他者视角 | 元问题/下一步 |
| `5e-recipe` | Engage | Explore | Explain-prompt | Elaborate | Evaluate-as-question |
| `feynman` | 用自己的话定义 | 举生活例子 | 指出类比失效 | 教给外行 | 还缺哪一块 |
| `productive-failure` | 未教过的难题 | 你怎么试 | 卡在哪 | 规范解会怎么走 | 和你的差在哪 |
| 用户自定 | 编译进同一 5 槽，缺槽用 `socratic` 补 |

每题标注 `objective_id`、`bloom_level`、`socratic_move`、`expected_evidence`、`difficulty`。数量默认 5，可由用户改，但必须 Q/A 成对连续。

<!-- portable:recipes:end -->

## mine 数量上限

`audience=mine` 每课最多两批 10 问：`b01` = Q1–Q5，`b02` = Q6–Q10。第 11 问非法。第三批必须返回 `split-proposal` 而不是再出题。满 10 后禁止 `mine-more`。`re-dispatch-L` 不重置该课 `question_budget_used`。tutor 的 `inquiry/` 仍是一批约 5 题，Response 协议不变。

## 文件协议

- 出题文件含空 A 与精确行 `Response: pending`。
- 学习者作答后写 `Response: ready`，再次激活 Q。
- Teaching / Inquiry Lesson 只能追加在 ready 之后；不得改写 Q/A。
- 闭环后 `Response: closed`。重答新建 `IQ-…-batch-NN`，旧文件只读。
- 禁止 `Submission:`、禁止 H 的 `verdict: correct|partial|incorrect` 字段名。教学判定用 `aligned|partial|off|uncertain`。
- 禁止写入 `lessons/` 或 `homework/`。
- `audience=mine` 禁止上述 learner 协议字段，也禁止 miner 写 `lessons/`。

<!-- portable:teaching:start -->
## 讲解与后续探究

`## Teaching` 每题必须有：思路复原、判定、中文详解、`Explain (English)`、纠错路径、先前未覆盖知识、来源锚点。
`## Inquiry Lesson` 把本批收成一节短课：地图、机制、边界、稳定误区、下一步激活钩子。
每一份 Teaching 结尾保留 keep-alive 钩子（新证据产生的下一批种子、缺失目标或可选补课/作业/复习），同时说明本轮停止原因。不得把本批说成知识终点，也不得为了续问反复询问已答内容或在用户要求结束后继续。钩子只是建议，不自动执行后续。

重要的未覆盖知识应说明为什么容易遗漏、忽略的影响和验证方法；教学判断不是作业评分或掌握认证。真新手先用降级探针与中性脚手架；连续三题卡住仍无进展时必须调整教法，但不必等到三题才提供帮助。

<!-- portable:teaching:end -->

## 新手逃逸与 Change

baseline 显示真新手或主题元素交互很高时，先降难度探针，或建议激活 `L-lesson` 再建模型。不强制 question-first。卡住连续三题仍无进展时给脚手架，而不是直接灌完整答案进 Q 文本。

无可用 Change 且用户已激活本 Work 时，允许创建 lightweight inquiry Change；不得因缺少 A 产物而拒绝开问，也不得复活已退役的 `Q-quiz`。
