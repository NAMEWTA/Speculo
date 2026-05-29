---
id: status
type: command
name: Global Status
description: 按需聚合全局工作流状态（替代物理 STATUS.json）
keywords: [status, 状态, 进度]
---

# Status 命令

## 归档路径模式

可选产物归档至：`../.speculo/commands/<YYYY-MM-DD>-status-<topic>/`
（若仅是回显报告、不需要持久化时可不归档）

## 调用的 skills

无

## 执行步骤

1. 读取 `../.speculo/dev-status.json`、`../.speculo/doc-status.json`、`../.speculo/ops-status.json`。缺失任一文件时报告缺失路径，并建议按 `docs/adopting.md` 重新复制 `.speculo` 骨架或创建空索引 `{"active":[]}`。
2. 对每个索引的 `active[]` 条目，读取 `../.speculo/<cat>/<change>/.status.json`。读取失败时把该 change 标记为 `broken-index`，不要擅自删除索引项。
3. 扫描 `../.speculo/{dev,doc,ops}/*/.status.json`，找出 `change_status: completed` 且尚未位于 `../.speculo/archive/` 的待归档 change。
4. 聚合输出：
   - 各分类 active 数量、completed 待归档数量、broken-index 数量
   - 最近更新的 5 个 change（按 `updated_at` 倒序）
   - 当前可能阻塞项：`phase_history` 最后一项为 `blocked`，或 `updated_at` 超过 14 天未变化
   - 推荐下一步：优先处理 broken-index，其次处理 blocked，再推荐继续最近 active change 的 `current_phase`
5. 用户要求持久化快照时，把报告写入 `../.speculo/commands/<YYYY-MM-DD>-status-<topic>/snapshot.md`；否则只在对话中返回。

## 产物模板（snapshot.md，可选）

> **服务命令：** `status.md`
> **产物文件名：** `snapshot.md`

```markdown
# Status Snapshot

## 快照时间
[TODO: ISO 8601 时间戳。]

## 分类汇总
[TODO: dev/doc/ops 各自 active 数量、completed 待归档数量]

## 最近活跃 Changes
[TODO: 列出最近 5 个更新的 change + 当前 phase]

## 可能僵尸 Changes
[TODO: 超过 N 天未更新的 change 清单]
```
