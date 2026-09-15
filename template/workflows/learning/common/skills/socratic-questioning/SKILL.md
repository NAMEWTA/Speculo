---
name: socratic-questioning
description: 苏格拉底问答、反问授课或用提问教；当学习者卡住、不知道下一步、指定提问/5E/费曼/生产性失败，或 Q-question 需要出题与讲解配方时使用。
---

# Socratic Questioning

本 skill 只生成提问、诊断与讲解文本。工件所有权仍归 `Q-question` 的 `inquiry/`；不得写入 `lessons/` 或 `homework/`。

1. 只由 `Q-question` 调用。按稳定 Change ID 读取当前 locator，禁止依赖旧路径。无 Change 时允许 Q 创建 lightweight inquiry Change，不假装 A 已完成。
2. 读取调用方给出的 topic、OBJ、baseline、指定 `teaching_method` 和已有 inquiry 索引；按 `<Path>{roots.workflows}/learning/common/rules/questioning-policy.md</Path>` 选择配方，不要整读 archive。
3. 先判断能否提问：真新手或高元素交互时返回降级探针或「先走 L-lesson」建议，而不是硬出机制题。
4. 默认 `socratic` 五槽：澄清、机制证据、假设反例、迁移视角、元问题/下一步。用户指定 `5e-recipe` / `feynman` / `productive-failure` / custom 时只改题目，不改 inquiry 文件协议。
5. 一批写入 `inquiry/IQ-*.md`：Q1–Q5、空 A、`Response: pending`。`Response: ready` 后只追加 Teaching 与 Inquiry Lesson；不改写答案，不写 `lessons/`、`homework/`、mastered、`Submission`、`verdict`。
6. Teaching 每题含思路复原、`aligned|partial|off|uncertain`、中文详解、`Explain (English)`、纠错、未见知识、来源。Inquiry Lesson 把 5 题收成一课并给 keep-alive 钩子。需要完整 30–40 分钟讲义或正式测评时只返回路由，不自动激活 L/H/R。

## 题槽

| 槽 | 动作 | Paul 类 |
| --- | --- | --- |
| Q1 | 澄清/定义 | clarification |
| Q2 | 机制/证据 | evidence |
| Q3 | 假设/反例 | assumptions |
| Q4 | 迁移/视角 | viewpoints |
| Q5 | 元问题/下一步 | question-the-question |

## 完成标准

- 一批 Q/A 成对；讲解在作答之后；
- 指定教法只改变题目，不改变 Response 协议；
- 输出可被 Q-question 直接追加进 `IQ-*.md`。
