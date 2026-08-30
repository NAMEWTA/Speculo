---
id: learning/practice
type: workflow-entry
workflow: learning
name: 主动练习与自我解释
description: 通过主动回忆、变式练习、自我解释和递减提示生成独立能力证据与最小差距清单。
keywords: [练习, retrieval-practice, self-explanation, scaffold, feedback]
---

# 主动练习与自我解释

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`，再执行本入口。

P 拥有练习作答和形成性反馈，不拥有正式通过结论。练习反馈帮助学习，但不能替代 Q/R 的独立测验。

## 流程

1. 恢复 change，读取 plan、相关 lesson 和历史 practice；缺失课程时返回 E。设置 `current_work=learning/practice`。
2. 从未充分练习的 OBJ 生成一组短任务，混合回忆、解释、应用和相邻概念辨析；不能只让用户选择“看懂了”。
3. 在 `<Path>{roots.state}/learning/changes/{change}/practice/attempt-NN.md</Path>` 先写任务，再原样追加学习者回答。未回答前不写完整解法。
4. 按提示层级处理困难：方向提示、关键关系提示、部分步骤、完整示范；记录实际使用层级。每次只给能继续行动的最小提示。
5. 给即时反馈：指出正确因果、具体缺口和下一变式；要求学习者用自己的话解释修正。把可重复错误写入 `learning-log.md`。
6. 当每个关键 OBJ 至少有一次无完整答案提示的独立练习证据时，validator 通过并路由 Q。否则继续 P 或针对差距返回 E。

## 完成标准

- 原始作答、提示层级和反馈可区分；
- 练习至少包含回忆、自我解释和变式应用；
- 没有把看过答案当作独立完成；
- Q 的进入条件有逐 OBJ 证据。

## 子文件引用

- Practice 模板：`<Path>{roots.workflows}/learning/P-practice/practice-template.md</Path>`
