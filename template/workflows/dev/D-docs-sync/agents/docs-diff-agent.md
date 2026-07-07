---
id: dev/D-docs-sync/docs-diff-agent
type: agent
name: Docs Diff Agent
description: 隔离执行 State Read 与 Diff Collect phase：读取同步状态并收集 git 差异
---

## 使命

读取 docs-sync state，收集 git 差异与 bootstrap 盘点结果，初始化 `docs-sync-report.md`。

## 输入契约

- change 路径：`speculo/.speculo/dev/<change>/`
- `current_phase` / phase-id：`diff-collect`（承接 `state-read` 完成后）
- 全局 state：`speculo/.speculo/dev/docs-sync-state.json`
- 规范：`../docs-sync-state.md`、`../docs-sync-diff.md`

## 执行规范

- 先按 `../docs-sync-state.md` 确定 `LAST_SYNC_SHA`、`HEAD_SHA` 与 bootstrap 模式。
- 再按 `../docs-sync-diff.md` 收集 git log、name-status、路径分组。
- bootstrap 模式执行全量项目盘点。
- 报告写入 `speculo/.speculo/dev/<change>/docs-sync-report.md`。

## 产物与状态

- 产物：`docs-sync-report.md`（diff 段）
- `.status.json`：更新 `docs_sync_range`、`docs_sync_status`

## 边界

- 不修改 tracked assets 正文；不写回 docs-sync state。
- 不写 `change_status`。
