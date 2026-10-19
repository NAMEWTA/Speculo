# Learning v2 路径与引用

稳定标识是 `change_id`、`lesson_id`、`homework_id`、`review_id` 和 `topic_id`；`locator` 只是当前位置：`changes/<id>`、`changes/<parent>/children/<id>` 或 `archive/YYYY-MM/<root>`。跨工件引用同时写 stable ID 和 `<Path>{roots.state}/learning/</Path>` 下的当前 locator。

`locations.json` 保存历史 locator、relocation 时间/原因和源目录哈希。新工件不得把旧路径当作永久链接；validator 必须跟随位置登记解析。旧 locator 用历史登记解析到同一 stable ID，再查当前位置；迁移不自动修写源 Markdown 链接，已经提交的 Homework、Review 和 archive 内容保持原文。当前新工件使用 Change 相对引用，跨 Change 使用稳定 ID 加工件相对路径；原始材料中的旧链接不构成新的写入地址。
