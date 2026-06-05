# Two-Axis Review Phase

## 输入

- `.speculo/dev/<change>/review-sources.md`
- `git diff <fixed-point>...HEAD`
- standards 来源文件
- spec 来源文件或 `no spec available`

## 产物

- `.speculo/dev/<change>/review-report.md`，由 `../_templates/review-report-template.md` 填写

## 填写引导

1. Standards 审查：阅读标准文档，再阅读 diff；报告违反已记录标准的位置，引用标准来源。
2. Spec 审查：阅读 spec，再阅读 diff；报告缺失需求、范围蔓延、看似实现但有问题的需求，引用 spec 原文。
3. 如果可用，使用两个并行子代理分别审查 Standards 与 Spec。
4. 如果没有子代理，分两个独立小节顺序执行，不让 Standards 结论影响 Spec 结论。
5. 最终报告在 `## Standards` 和 `## Spec` 下并排呈现，可以轻微清理措辞，但不要合并或重新排序 findings。
6. 最后一行总结每个维度的 findings 数量和最严重单个问题。

## 边界

- 不修复代码。
- 不把两个维度混成一个优先级列表。
- 缺少 spec 时跳过 Spec 审查，并明确写 `no spec available`。

## 完成准则

- `review-report.md` 已按 Standards / Spec 分区
- 每条 finding 有明确依据
- `.status.json` 的 `review_status` 已更新
