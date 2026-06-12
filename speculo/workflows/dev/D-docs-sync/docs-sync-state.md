# State Read Phase

## 输入

- `speculo/.speculo/dev/docs-sync-state.json`
- `git rev-parse HEAD`
- `../_templates/docs-sync-state-template.json`

## 产物

- `speculo/.speculo/dev/docs-sync-state.json`
- `speculo/.speculo/dev/<change>/docs-sync-report.md`

## 填写引导

1. 设置 `STATE_FILE="speculo/.speculo/dev/docs-sync-state.json"`。
2. 若 state 文件不存在，复制 `../_templates/docs-sync-state-template.json` 为骨架，把 `state_path` 设为 `speculo/.speculo/dev/docs-sync-state.json`。
3. 读取 `last_sync_sha` 和当前 `HEAD`。
4. 若 `tracked_docs` 为空，列出候选文档，请用户确认后写入 state；本次不修改对外文档。
5. 若 `last_sync_sha` 为 `null`，把当前 `HEAD` 建为初始基线；本次不修改对外文档。
6. 若 `last_sync_sha == HEAD`，报告 docs 已同步，无需操作。

## 边界

- 不把 state 写到仓库根目录。
- 不在首次运行时猜测 `tracked_docs`。
- 不修改对外文档。

## 完成准则

- 已确定是否首次运行、无需同步或继续进入 diff collect
- `.status.json` 的 `docs_sync_status` 已更新
