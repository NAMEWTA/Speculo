---
id: status
type: command
name: Global Status
description: 按需聚合全局工作流状态（替代物理 STATUS.json）
keywords: [status, 状态, 进度]
---

# Status 命令

## 归档路径模式

可选产物目录：`speculo/.speculo/commands/<YYYY-MM-DD>-status-<topic>/`

快照文件：`speculo/.speculo/commands/<YYYY-MM-DD>-status-<topic>/snapshot.md`

- `<YYYY-MM-DD>` 使用当前日期。
- `<topic>` 从状态范围或用户主题提取，使用小写 kebab-case；无法判断时使用 `snapshot`。
- 禁止把状态快照写入 `temp/`、系统临时目录或工作区内其他非规范位置。

（若仅是回显报告、不需要持久化时可不归档）

## 调用的 skills

无

## 执行步骤

1. 读取已存在的 `speculo/.speculo/<cat>-status.json`，当前内置分类至少包括 `dev`、`doc` 与 `person`。缺失时报告缺失路径，建议重新运行 `speculo init`，或创建空索引 `{"active":[]}`。
2. 对每个索引的 `active[]` 条目，读取 `speculo/.speculo/<cat>/<change>/.status.json`。读取失败时把该 change 标记为 `broken-index`，不要擅自删除索引项。
3. 扫描 `speculo/.speculo/<cat>/*/.status.json`，找出 `change_status: completed` 且尚未位于 `speculo/.speculo/archive/` 的待归档 change。
4. 聚合输出：
   - 各分类 active 数量、completed 待归档数量、broken-index 数量
   - 最近更新的 5 个 change（按 `updated_at` 倒序）
   - 当前可能阻塞项：`phase_history` 最后一项为 `blocked`，或 `updated_at` 超过 14 天未变化
   - 推荐下一步：优先处理 broken-index，其次处理 blocked，再推荐继续最近 active change 的 `current_phase`
5. 用户要求持久化快照时，把报告写入 `speculo/.speculo/commands/<YYYY-MM-DD>-status-<topic>/snapshot.md`；否则只在对话中返回。

## 产物模板（snapshot.md，可选）

> **服务命令：** `status.md`
> **产物文件名：** `snapshot.md`

```markdown
# Status Snapshot

## 快照时间
[TODO: ISO 8601 时间戳。]

## 分类汇总
[TODO: 按分类列出 active 数量、completed 待归档数量和 broken-index 数量]

## 最近活跃 Changes
[TODO: 列出最近 5 个更新的 change + 分类 + 当前 phase]

## 可能僵尸 Changes
[TODO: 超过 N 天未更新的 change 清单]
```
