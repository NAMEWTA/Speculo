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

产物目录：`speculo/.speculo/commands/<YYYY-MM-DD>-archive-<topic>/`

报告文件：`speculo/.speculo/commands/<YYYY-MM-DD>-archive-<topic>/report.md`

- `<YYYY-MM-DD>` 使用当前日期。
- `<topic>` 从归档范围或用户主题提取，使用小写 kebab-case；无法判断时使用 `changes`。
- 禁止把命令报告写入 `temp/`、系统临时目录或工作区内其他非规范位置。

## 调用的 skills

无

## 执行步骤

1. **预扫描：** 列出 `speculo/.speculo/<cat>/`（内置分类至少包括 `dev`、`doc` 与 `person`）下所有符合 `YYYY-MM-DD-<kebab-name>` 格式的 change 目录。对每个目录检查 `.status.json` 是否存在：
   - 存在且 `change_status: completed` → 加入待归档候选。
   - 存在但 `change_status` 为其他值 → 跳过（非完成状态）。
   - **不存在 `.status.json`** → 标记为 `broken-change: missing .status.json`，**不归档、不删除、不移动**，在清单中单独列出并跳过。
2. 排除已经位于 `speculo/.speculo/archive/` 下的目录；若目标归档路径已存在，标记为冲突并停止，不覆盖。
3. 列出完整清单（分三组）：
   - **待归档：** 源路径、目标路径、当前分类、`updated_at`、最后 phase、是否仍在 `<cat>-status.json active[]`。
   - **broken-change：** 缺少 `.status.json` 的 change 目录路径。
   - **冲突：** 目标路径已存在的 change。
4. 向用户展示清单并等待明确确认。没有确认时只输出计划，不移动目录、不改索引。对于 `broken-change`，提示用户需先通过对应 workflow 入口（`../workflows/dev/AGENTS.md`、`../workflows/doc/AGENTS.md` 或 `../workflows/person/AGENTS.md`）补建 `.status.json`，或将 `change_status` 手动置为 `completed` 后再归档。
5. 用户确认后逐项执行（仅对待归档项）：
   - 创建 `speculo/.speculo/archive/<cat>/<YYYY-MM>/`
   - 移动 change 目录到 `speculo/.speculo/archive/<cat>/<YYYY-MM>/<change-name>/`
   - 从对应 `speculo/.speculo/<cat>-status.json` 的 `active[]` 删除该 change
   - 写入本次命令报告 `speculo/.speculo/commands/<YYYY-MM-DD>-archive-<topic>/report.md`
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

## 跳过清单
[TODO: 列出被跳过的 broken-change（缺少 .status.json）和冲突项]

## 用户确认记录
[TODO: 记录用户确认的原始内容]

## 执行结果
[TODO: 成功 / 失败 / 部分成功]
```
