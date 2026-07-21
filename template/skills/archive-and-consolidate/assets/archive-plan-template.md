# Archive Plan

> 生成时间：<YYYY-MM-DD HH:MM>
> Workflow：<workflow-name>
> 模式：<archive-single | archive-batch>

## 预检摘要

| 检查项 | 状态 |
|--------|------|
| changes_root 可访问 | <pass/fail> |
| archive_root 可访问 | <pass/fail> |
| status.json 可解析 | <pass/fail> |
| 候选 change 数量 | <N> |
| 预检通过数 | <N> |
| 预检阻塞数 | <N> |

## 逐项归档计划

| # | Change | 源路径 | 目标路径 | 状态 | 备注 |
|---|--------|--------|---------|------|------|
| 1 | 2026-07-15-add-auth | changes/2026-07-15-add-auth/ | archive/2026-07/2026-07-15-add-auth/ | ready | verification: verified |
| 2 | 2026-07-10-fix-timezone | changes/2026-07-10-fix-timezone/ | archive/2026-07/2026-07-10-fix-timezone/ | blocked | target already exists |

## 状态变更

归档执行后将对 `status.json` 做如下变更：

- `active` 数组移除：`["2026-07-15-add-auth", "2026-07-10-fix-timezone"]`
- 每个归档 change 的 `.status.json` 更新：`change_status: archived`, `archived: true`

## 阻塞项详情

<如有 blocked 项，逐一说明原因和建议操作>
