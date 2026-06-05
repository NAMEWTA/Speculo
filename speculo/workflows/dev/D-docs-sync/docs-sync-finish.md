# State Write Phase

## 输入

- 更新后的 tracked docs
- `.speculo/dev/docs-sync-state.json`
- `.speculo/dev/<change>/docs-sync-report.md`
- 当前 `HEAD`

## 产物

- 更新后的 `.speculo/dev/docs-sync-state.json`
- 完整的 `.speculo/dev/<change>/docs-sync-report.md`

## 填写引导

1. 运行项目级校验；命令根据项目工具链决定。
2. 如果所有差异都无需文档修改，仍把 `last_sync_sha` 推进到当前 `HEAD`，并把 `synced_docs` 置为 `[]`。
3. 如果修改了文档，验证通过后再推进 state。
4. 写回 state 时按 `state-json-schema.md` 字段顺序，2 空格缩进，尾部换行。
5. 原子化写入：先写 `.speculo/dev/docs-sync-state.json.tmp`，再 rename。
6. 按 report 模板向用户报告范围、改动文档、新基线和验证命令。

## 边界

- 验证失败时不推进 `last_sync_sha`。
- 不把敏感信息、绝对路径或完整 diff 写入 state。

## 完成准则

- state 已原子写入或明确记录阻塞原因
- report 已包含同步范围、改动文档、验证结果
- `.status.json` 的 `docs_sync_status` 已更新
