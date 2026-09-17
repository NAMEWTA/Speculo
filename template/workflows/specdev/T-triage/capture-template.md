---
schema_version: 1
artifact: capture-index
mode: capture
repo: owner/repo
updated_at: <ISO-8601>
---

# Capture

## 捕获计划

- **目标 repo：** `owner/repo`
- **origin：** local
- **排除 id：** 无 / `<YYYY-MM-DD-slug>`
- **确认记录：** 无 / 本次授权时间与操作员

capture 不创建 Change，不写 `current_work`，不关闭 Issue。GitHub 是 inbox，不是开发权威。

## 账本

| id | kind | title | labels | number | url | marker | sha256 | state |
|---|---|---|---|---|---|---|---|---|
| 2026-09-17-login-timeout | bug | bug: login timeout on empty session | bug, specdev:captured, origin:local | — | — | specdev:capture:2026-09-17-login-timeout | — | planned |

`state`：`planned | open | skipped:duplicate | intaken | waived | failed`。

`sha256` 覆盖实际发出的 Issue 正文。漂移只警告，不自动重发。

## 计数

- **inbox_open：** 0
- **inbox_intaken：** 0
- **inbox_waived：** 0
- **skipped：** 0
- **failed：** 0

计数权威是本文件，不是 GitHub 搜索。`inbox_open` 不计 `published_issues`。

## 重试

无 / 失败行的已完成步骤和下一步。已成功的记录不回滚。
