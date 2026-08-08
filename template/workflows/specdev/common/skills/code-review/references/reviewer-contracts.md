# Isolated Reviewer Contracts

## 标准轴

输入仅包含固定 diff/log、标准来源和 Fowler baseline。报告仓库规则违规和判断性 smell，引用来源与代码块，区分 hard violation 与 heuristic，并跳过工具链已强制执行的纯格式项。

## 规范轴

输入仅包含固定 diff/log 与规范来源。报告缺失或不完整需求、超出范围行为和语义/失败/边界错误，并引用具体规范来源。

## 隔离与结果

平台支持独立 reviewer 时可并行；否则创建两个不共享发现的完整输入包并顺序执行。汇总者只整理格式，不删除、合并或跨轴重排 finding。每轴独立返回 `pass | request-changes | skipped`；一轴通过不抵消另一轴失败。
