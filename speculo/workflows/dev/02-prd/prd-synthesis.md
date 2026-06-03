# PRD Synthesis Phase

## 输入

- `overview.md`
- 可选的 `context-map.md`、`decision-log.md`、用户故事或 issue
- Skill wrapper：`../../../skills/to-prd/SKILL.md`

## 产物

- `prd.md`，由 `../_templates/prd-template.md` 填写

## 填写引导

1. 读取 `../../../skills/to-prd/SKILL.md`。
2. 综合已有上下文，不重复访谈已明确的信息。
3. 与用户确认模块候选和需要测试的行为。
4. 默认只生成本地 `prd.md`；只有 tracker 已配置且用户明确要求时才发布 issue。
5. PRD 中避免易过时的具体文件路径和代码片段，除非它们表达不可替代的决策。

## 边界

- 不进行 issue 切片；切片由 `../04-to-issues/04-to-issues.md` 负责。
- 不修改业务代码。
- 不把 change 标记为 completed。

## 完成准则

- `prd.md` 无残留 `[TODO:]`
- `test_targets`、`prd_slug`、`issue_tracker_mode` 已写入 `.status.json`
