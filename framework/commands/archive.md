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

1. 扫描 `../.speculo/{dev,doc,ops}/*/.status.json`，仅选择 `change_status: completed` 的 change。
2. 排除已经位于 `../.speculo/archive/` 下的目录；若目标归档路径已存在，标记为冲突并停止，不覆盖。
3. 列出待归档清单：源路径、目标路径、当前分类、`updated_at`、最后 phase、是否仍在 `<cat>-status.json active[]`。
4. 向用户展示清单并等待明确确认。没有确认时只输出计划，不移动目录、不改索引。
5. 用户确认后逐项执行：
   - 创建 `../.speculo/archive/<cat>/<YYYY-MM>/`
   - 移动 change 目录到 `../.speculo/archive/<cat>/<YYYY-MM>/<change-name>/`
   - 从对应 `../.speculo/<cat>-status.json` 的 `active[]` 删除该 change
   - 写入本次命令报告 `../.speculo/commands/<YYYY-MM-DD>-archive-<topic>/report.md`
6. 若任一移动失败，停止后续移动，报告已完成与未完成清单；不要回滚已经成功移动的目录，除非用户明确要求。

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
