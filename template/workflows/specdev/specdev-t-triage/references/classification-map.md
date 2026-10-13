# Classification Map

T-triage 本地分类与 GitHub type 标签的对照。publish 与 capture 只打本表允许的标签；intake 仍把 8 值写在 `<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>`，v1 不回写源 Issue。

## SpecDev 分类

Change 级 `classification`：`bug | feature | refactor | investigation | operations | documentation | review | mixed`。

票级 `kind` 与上相同，去掉 `mixed`。缺省合法：publish 时继承 Change 分类；Change 为 `mixed` 时确认表必须给出每张纳入票的 `kind`。capture 每条记录必须自带 `kind`，禁止 `mixed`。

## GitHub type 标签

优先使用目标仓库已有标签。确认表展示实际将打的字符串。

| SpecDev | GitHub type（优先） | 降级 | 标题前缀 |
|---|---|---|---|
| `bug` | `bug` | — | `bug:` |
| `feature` | `feature-request` | `enhancement` | `feature:` |
| `refactor` | `enhancement`，若仓库已有 `refactor` 则额外打 `refactor` | — | `refactor:` |
| `investigation` | `question` | `enhancement` | `investigate:` |
| `operations` | `operations` | `enhancement` | `ops:` |
| `documentation` | `documentation` | — | `docs:` |
| `review` | `enhancement` | — | `review:` |
| `mixed` | 禁止直接发布 | 拆到票级 `kind` | — |

每个已发布 Issue 恰好一个 type 标签（`refactor` 的额外 `refactor` 不算第二 type）。capture 的 inbox Issue 同样恰好一个 type 标签。

## 固定附加标签

- `specdev:published`：publish 计数与去重。不得打到 capture 的 inbox Issue。
- `specdev:captured`：capture inbox 计数与去重。不得打到 publish 的票 Issue 或父索引。与 `specdev:published` 互斥。
- `origin:local` 或 `origin:intake`：来源。本地对话/粘贴/项目文件为 `local`；冻结自 GitHub Issue/PR 为 `intake`。capture 固定 `origin:local`。
- 父 Change 索引 Issue 另打 `specdev:change`。`mixed` 的父 Issue 不打 type。capture 不得打 `specdev:change`。

## 可选标签

- `area:*`：仅当 tickets-map / `expected_changes` 能唯一推断顶层目录时才打；不确定则不问不打。
- `priority:*`：由 triage `risk` 映射：`critical→priority:critical`，`high→priority:high`，`medium→priority:medium`，`low→priority:low`。确认表可改。

## 禁止标签

不得打到自发布 Issue、父索引或 capture inbox Issue 上：

`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`、`duplicate`、`invalid`、`stale`。

cancelled 票若被纳入 publish，使用 close reason `not_planned`，不打 `wontfix`。

## 标题

```text
<前缀> <ticket.title>
```

不把内部 id `T-01` 写入标题。内部 id 只出现在正文 Provenance 和 `<Path>{roots.state}/specdev/changes/{change}/publish.md</Path>`。capture 标题同样不加内部 id；capture id 只出现在正文 Provenance 和 `<Path>{roots.state}/specdev/capture.md</Path>`。
