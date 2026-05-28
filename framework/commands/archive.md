---
id: archive
type: command
name: Archive Changes
description: 归档已完成的 change 到 archive/<cat>/<YYYY-MM>/
keywords: [archive, 归档, 清理]
---

# Archive 命令

⚠️ **本命令是破坏性目录移动操作。AI 必须先列出待归档清单并征求用户确认才能执行。**

## 归档路径模式

产物归档至：`../.speculo/commands/<YYYY-MM-DD>-archive-<topic>/`

## 调用的 skills

无

## 执行步骤

[TODO: 详细执行步骤：
1. 扫描 `../.speculo/<cat>/*/.status.json`，找出 `change_status: completed` 的变更
2. 列出待归档清单（默认筛选条件由用户或参数控制，如 `--before=YYYY-MM-DD`）
3. 向用户展示清单 + 询问确认
4. 用户确认后：
   - `mv` 每个 change 目录到 `../.speculo/archive/<cat>/<YYYY-MM>/<change-name>/`
   - 从对应 `../.speculo/<cat>-status.json` 的 `active` 段完全移除
   - 把本次归档操作记录写入 `../.speculo/commands/<YYYY-MM-DD>-archive-<topic>/report.md`
5. 报告归档结果
]

## 产物模板（report.md）

> **服务命令：** `archive.md`
> **产物文件名：** `report.md`

```markdown
# Archive Report

## 执行时间
[TODO: ISO 时间戳]

## 归档清单
[TODO: 列出本次归档的所有 change，格式 "<source-path> → <dest-path>"]

## 用户确认记录
[TODO: 记录用户确认的原始内容]

## 执行结果
[TODO: 成功 / 失败 / 部分成功]
```
