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

[TODO: 详细执行步骤：
1. 读 `../.speculo/dev-status.json`、`../.speculo/doc-status.json`、`../.speculo/ops-status.json` 三个索引
2. 读每个 active change 的 `../.speculo/<cat>/<change>/.status.json` 获取详细 phase 信息
3. 聚合输出全局状态报告：
   - 按分类汇总 active changes 数量
   - 列出最近更新的 5 个 change
   - 列出"已 completed 但未 archived"待归档数量
   - 列出超过 N 天未更新的"可能僵尸"change（提醒用户）
4. 报告可选写入 `../.speculo/commands/<YYYY-MM-DD>-status-<topic>/snapshot.md`
]

## 产物模板（snapshot.md，可选）

> **服务命令：** `status.md`
> **产物文件名：** `snapshot.md`

```markdown
# Status Snapshot

## 快照时间
[TODO]

## 分类汇总
[TODO: dev/doc/ops 各自 active 数量、completed 待归档数量]

## 最近活跃 Changes
[TODO: 列出最近 5 个更新的 change + 当前 phase]

## 可能僵尸 Changes
[TODO: 超过 N 天未更新的 change 清单]
```
