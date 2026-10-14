# Wayfinder 本地 Tracker 适配

最新版 Wayfinder 以 issue tracker 为物理载体。SpecDev 的默认 tracker 是 change state 内的本地 Markdown/JSON；本文件只映射物理原语，不改写 Wayfinder 的地图、Ticket、战争迷雾或遍历语义。

| Tracker 原语 | 本地实现 |
|---|---|
| 地图 issue | `<Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>` |
| 子 issue | `<Path>{roots.state}/specdev/changes/{change}/investigation/{investigation-id}.md</Path>` |
| label | Ticket frontmatter 的 `wayfinder:research|prototype|grilling|task` |
| 阻塞关系 | Ticket frontmatter 的 `blocked_by` |
| assignment | 原 investigation Ticket 的 `## Assignment` 实际领取记录 |
| solution comment | `<Path>{roots.state}/specdev/changes/{change}/investigation/comments/{investigation-id}/NN-solution.md</Path>` |
| 关闭 issue | Ticket frontmatter 的 `status: closed` 与 `resolution` |

## 查询前沿

扫描当前地图的全部子 Ticket。一个 Ticket 同时满足以下条件时属于**前沿**：

1. `status: open`；
2. `blocked_by` 中的每个 Ticket 都是 `status: closed`；
3. 该 Ticket 没有仍有效的实际 Assignment。

按文件名中的数字 ID 升序返回。地图正文不缓存开放 Ticket 列表；每次选择前沿都从 Ticket 与 claim 事实重新查询。

## 原子领取

实际领取时在该 Ticket 的 `## Assignment` 写 Owner、Session、Claimed-At 与依据，缺省单 writer；并发必须由真实单写入者协调或有可证明隔离，普通文件 rename 不证明互斥。重读确认未被他人领取，冲突选下一前沿。完成/释放时记录真实处置，不因超时删除他人领取。未领取不建空槽，地图只导航，不建中央 claim registry。

## 解决方案评论

Ticket 正文只保存问题。答案写入下一个未占用的 solution comment 文件，资产从评论链接，不粘贴进 Ticket。关闭 Ticket 后，地图的“已做出的决策”只追加名称链接和一句概括；`out-of-scope` 不进入决策索引。

**完成标准**：地图、Ticket、claim、阻塞和 solution comment 可以重建相同前沿；同一事实没有第二份可写副本。
