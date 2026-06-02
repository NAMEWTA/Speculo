# Slice Issues Phase

## 输入

- `prd.md`、`decision-log.md`、`diagnosis.md`、现有 issue 或用户计划
- 可选 issue tracker 配置和标签词汇表
- Skill wrapper：`../../../skills/to-issues/SKILL.md`

## 产物

- `slices.md`，由 `../_templates/issues-slices-template.md` 填写

## 填写引导

1. 读取 `../../../skills/to-issues/SKILL.md`。
2. 先本地起草切片，按垂直切片原则覆盖端到端行为。
3. 用编号列表向用户确认粒度、依赖、HITL/AFK 标记和是否需要发布。
4. 按依赖顺序记录切片；发布外部 issue 时也按依赖顺序发布。

## 边界

- 不关闭或修改父级 issue。
- 不默认发布到外部 tracker。
- 不写实现代码。

## 完成准则

- `slices.md` 无残留 `[TODO:]`
- `.status.json` 已记录 `slice_count`、`hitl_slice_count` 和 `issue_tracker_mode`
