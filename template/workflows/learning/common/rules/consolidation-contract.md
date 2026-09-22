# 主题整合与冷归档

`C-consolidate` 接受用户选定的 active 或 closed、尚未冷归档的 Change；已冷归档树保持不可变，只能先由用户显式恢复后再参与。C 先输出包含源 ID、当前/旧 locator、时间、哈希、关系、冲突和目标 topic 的 dry-run，用户确认后在锁内原子移动整个目录到 `children/<child-id>/`，失败则回滚。不得选择祖先与后代形成循环，也不得拆开已有综合子树。

综合 claim 必须带 `source_change_id`、Lesson/Homework anchor、外部 `source_id`、evidence status（`draft|supported|contested|unresolved`）和验证时间；C 只有在第二次确认后才更新 `context/domains/<domain>/topics/<topic-id>/`。父 Change 的 effective date 是所有选中源 `updated_at` 的最大值；原始创建/更新时间仍保留。A 只接受用户 close/confirm，在没有活动子树和根锁后把整个树移动到 `archive/YYYY-MM/<root-change>`；不检查作业或掌握，不做综合。
