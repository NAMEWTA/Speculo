# Decision Grill Phase

## 输入

- `context-map.md`
- 用户当前方案或目标
- Skill wrapper：`../../../skills/grill-with-docs/SKILL.md`

## 产物

- `decision-log.md`，由 `../_templates/grill-decision-log-template.md` 填写
- 可选：经用户确认后更新项目 `CONTEXT.md` 或 `docs/adr/*.md`

## 填写引导

1. 读取 `../../../skills/grill-with-docs/SKILL.md`，再按需读取其 `source/` 下格式文档。
2. 每次只问一个会改变决策树的问题，并给出推荐答案。
3. 对术语冲突、代码现实冲突和 ADR 候选直接指出。
4. 用户确认后，把决策写入 `decision-log.md`。
5. 只有用户明确同意时，才把术语写入项目 `CONTEXT.md` 或创建 ADR。

## 边界

- 不输出 PRD；PRD 由 `../02-prd/02-prd.md` 负责。
- 不把未确认的 ADR 候选写成正式 ADR。
- 不修改 `.speculo/.config/RULES.md`。

## 完成准则

- 每个关键问题都有结论、推荐答案或 blocked 原因
- `.status.json` 的 `decision_status` 已更新
- `decision-log.md` 无残留 `[TODO:]`
