---
schema_version: 1
artifact: publish
change: <YYYY-MM-DD-topic>
mode: publish
repo: owner/repo
publish_action: pending
include_cancelled: false
parent_issue: null
origin: local
published_at: null
updated_at: <ISO-8601>
---

# Publish: <change>

## 发布计划

- **目标 repo：** `owner/repo`
- **origin：** local / intake
- **含 cancelled：** false
- **父 Issue：** 默认（纳入票 ≥ 2 时创建）/ 强制开 / 强制关
- **排除票：** 无 / T-0N
- **确认记录：** 无 / 本次授权时间与操作员

publish 不改写 Ticket、Spec、Evidence、Goal 或 change completed 事实。

## 账本

| ticket | kind | labels | number | url | marker | sha256 | state |
|---|---|---|---|---|---|---|---|
| T-01 | bug | bug, specdev:published, origin:local | — | — | specdev:<change>:T-01:published | — | planned |

`state`：`planned | created | commented | closed | skipped:cancelled | skipped:excluded | failed`。

`sha256` 覆盖实际发出的 Issue 正文 + 关闭评论。漂移只警告，不自动重发。

## 计数

- **published_closed：** 0
- **published_open：** 0
- **skipped：** 0
- **failed：** 0

计数权威是本文件，不是 GitHub 搜索。`published_issues` = closed + created（仍 open 的失败中途行）。

## 重试

无 / 失败行的已完成步骤和下一步。已成功的票不回滚。
