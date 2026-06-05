# Decision Grill Phase

## 输入

- `.speculo/dev/<change>/context-map.md`
- 用户当前方案或目标
- 本 workflow 入口文件中的内置领域拷问指引
- 同目录 `CONTEXT-FORMAT.md`、`ADR-FORMAT.md`

## 产物

- `.speculo/dev/<change>/decision-log.md`，由 `../_templates/grill-decision-log-template.md` 填写
- 可选：经用户确认后更新 `.speculo/.config/context/CONTEXT.md`、`.speculo/.config/context/CONTEXT-MAP.md` 或 `.speculo/.config/adr/*.md`

## 填写引导

1. 遵循 `01-grill-with-docs.md` 的内置指引，再按需读取同目录格式文档。
2. 每次只问一个会改变决策树的问题，并给出推荐答案。
3. 对术语冲突、代码现实冲突和 ADR 候选直接指出。
4. 用户确认后，把决策写入 `decision-log.md`。
5. 只有用户明确同意时，才把术语写入 `.speculo/.config/context/` 或创建 `.speculo/.config/adr/` 下的 ADR。
6. 当用户使用的术语与 `.speculo/.config/context/` 中已有定义冲突时，立即指出冲突并要求在当前问题中消解。
7. 当用户使用含混或一词多义的术语时，提议一个精确的规范术语。
8. 当讨论领域关系时，用具体场景压力测试边界情况。
9. 当用户描述某个东西如何运作时，检查代码是否一致；若矛盾，直接指出。
10. 只有同时满足“难以逆转”“缺少上下文会令人意外”“真实权衡的结果”三个条件时，才提议 ADR。

## 边界

- 不输出 PRD；PRD 由 `../02-prd/02-prd.md` 负责。
- 不把未确认的 ADR 候选写成正式 ADR。
- 不修改 `.speculo/.config/RULES.md` 或用户未明确授权的项目规则文档。

## 完成准则

- 每个关键问题都有结论、推荐答案或 blocked 原因
- `.status.json` 的 `decision_status` 已更新
- `decision-log.md` 无残留 `[TODO:]`
