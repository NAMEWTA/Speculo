# State Write Phase

## 输入

- 更新后的 tracked assets
- `speculo/.speculo/dev/docs-sync-state.json`
- `speculo/.speculo/dev/<change>/docs-sync-report.md`
- 当前 `HEAD`

## 产物

- 更新后的 `speculo/.speculo/dev/docs-sync-state.json`
- 完整的 `speculo/.speculo/dev/<change>/docs-sync-report.md`

## 填写引导

1. 运行项目级校验；命令根据项目工具链决定。
2. 如果当前为 `bootstrap` 模式，验证通过后把推导出的 `tracked_assets`、本次创建/更新的 `synced_assets` 和当前 `HEAD` 一起写入 state，建立首次同步基线。
3. 如果所有差异都无需资产修改，仍把 `last_sync_sha` 推进到当前 `HEAD`，并把 `synced_assets` 置为 `[]`。
4. 如果修改了资产，验证通过后再推进 state。
5. 写回 state 时按 `state-json-schema.md` 字段顺序，2 空格缩进，尾部换行。
6. 原子化写入：先写 `speculo/.speculo/dev/docs-sync-state.json.tmp`，再 rename。
7. 按 report 模板向用户报告范围、归档来源、改动资产、新基线和验证命令。
8. 如果存在 `propose-only` 或 prune 候选，不因候选未执行阻塞基线推进；但必须在 report 中列出后续确认项。

## 边界

- 验证失败时不推进 `last_sync_sha`。
- `bootstrap` 模式没有成功创建或确认首批 `tracked_assets` 时不推进 `last_sync_sha`。
- 不把敏感信息、绝对路径或完整 diff 写入 state。
- 不把 archive 提取详情、用户确认原文或 prune 候选全文写入 state；这些只写 report。

## 完成准则

- state 已原子写入或明确记录阻塞原因
- report 已包含同步范围、读取归档、改动资产、`.config` 审计、验证结果
- `.status.json` 的 `docs_sync_status` 已更新
