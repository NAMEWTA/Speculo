# Diagnose Phase — 诊断分析

## 输入

- `speculo/.speculo/person/changes/<change>/problem-statement.md`（Phase 1 产物）
- Module A 模型清单与展开规则：`references/research/11-analysis-frameworks.md`
- 引语与篇目映射：`references/research/15-quote-bank.md`（查原文前先读）

## 产物

- `speculo/.speculo/person/changes/<change>/analysis.md`

## 认知主线

**事实 → 矛盾 → 主次 → 定性 → 两面 → 条件 → 本质 → 具体 → 检验。**

Module A 八模型清单、子工具与局限见 `references/research/11-analysis-frameworks.md`；展开某模型时按编号查 `references/research/15-quote-bank.md` 再开 `books/src/NNN-*.md`。

## 填写引导

### 1. 选择适用模型

从 Phase 1 确定的 `problem_type` 出发，从 8 模型中选用至少 2 个：

- 所有问题必过 A1（矛盾分析），这是主算法
- 信息来自二手而非亲历 → 必过 A3（调查研究）
- 涉及多方利益 → 必过 A6（结构分析）
- 判断涉及趋势预测 → 必过 A5（一分为二看转化）+ A7（看本质）
- 涉及"别人都这么做/标准做法" → 必过 A8（具体分析）

### 2. 逐一应用模型

每个选用的模型产出：

- **诊断结论**（1-2 句，带"不是……而是……"切割）
- **条件分析**（转化需要什么条件？现在具备哪些？）
- **局限标注**（这个判断的边界在哪？）

### 3. 综合定性

汇总各模型结论，回答三个问题：

1. **主要矛盾**是什么？为什么它是主要的？
2. **矛盾的主要方面**在哪一方？这一定性意味着什么？
3. **转化的关键条件**是什么？现在缺什么？

### 4. 写入 analysis.md

```markdown
# 诊断分析

## 应用的模型
[TODO: 列出选用的模型及原因]

## A1 · 矛盾分析
### 主要矛盾
[TODO]
### 矛盾的主要方面
[TODO]
### 转化的条件
[TODO]
### 局限
[TODO]

## [其他应用的模型]
[TODO: 每个模型一小节，含诊断结论、条件分析、局限]

## 综合定性
[TODO: 汇总三个核心问题的回答]
```

## 边界

- 不在此阶段给战略建议——先看清，再定打法。
- 每个判断必须带条件，"只有……才……"。
- 对无法确定的判断明确标注"待调查"。

## 完成准则

- 已应用至少 2 个 Module A 模型
- 每个模型结论带条件与局限
- 主要矛盾已明确写出且带论证
- `analysis.md` 无残留 `[TODO:]`
