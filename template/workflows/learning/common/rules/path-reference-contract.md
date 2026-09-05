# Learning v2 路径与引用

稳定标识是 `change_id`、`lesson_id`、`homework_id`、`review_id` 和 `topic_id`；`locator` 只是当前位置：`changes/<id>`、`changes/<parent>/children/<id>` 或 `archive/YYYY-MM/<root>`。跨工件引用同时写 stable ID 和 `<Path>{roots.state}/learning/</Path>` 下的当前 locator。

`locations.json` 保存历史 locator、relocation 时间/原因和源目录哈希。新工件不得把旧路径当作永久链接；validator 必须跟随位置登记解析。源 Markdown 的相对链接在移动后由 owner 修正为 alias/ID 引用，已经提交的 Homework、Review 和 archive 内容不改写。
