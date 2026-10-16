# 仓库盘点

## 列出自己的仓

全量盘点使用技能自带脚本，GraphQL cursor 自动分页，保留当前 token 可见范围：

```bash
"$SKILL_DIR/scripts/inventory.sh"
"$SKILL_DIR/scripts/inventory.sh" --user LOGIN
```

过滤原创、fork、已归档仓在完整结果上进行；不要把固定 `--limit 200` 的截断列表称为全量。
`--stars` 始终列当前登录账号的星标，不随 `--user` 切换。分页中断时报部分结果，不忽略退出码。

JSON 字段不够时再打 API：

```bash
gh api "repos/$ACCOUNT_LOGIN/$REPO_NAME" --jq '{open_issues_count,archived,disabled,has_pages,homepage,pushed_at}'
gh pr list -R "$ACCOUNT_LOGIN/$REPO_NAME" --state open --json number --jq length
gh run list -R "$ACCOUNT_LOGIN/$REPO_NAME" --limit 1 --json workflowName,status,conclusion,updatedAt
```

`open_issues_count` **包含 PR**。要「真正的 issue」用 issues 数减去 open PR 数。

## 状态口径

按「今天」的日历算最近推送（`pushedAt`）：

| 标签 | 口径 |
|---|---|
| 活跃 | 近 14 天有 push，且未归档 |
| 维护中 | 近 60 天有 push |
| 较静默 | 近 90 天有 push |
| 停滞 | 超过 90 天无 push |
| 已归档 | `isArchived=true` |
| 空仓 | `isEmpty=true` |
| Fork | `isFork=true`，表里写上游 `parent.owner.login/parent.name` |

Actions：最近一次 run 的 `conclusion`：success / failure / cancelled / 无 CI。

## 输出表（给用户）

自有仓：

| 仓库 | 类型 | 可见性 | 状态 | 语言 | 最近推送 | Stars | Issues/PR | Actions | 说明 |
|---|---|---|---|---|---|---|---|---|---|

Star 列表另表，见 `03-stars.md`。

## 只读脚本

```bash
"$SKILL_DIR/scripts/inventory.sh"
"$SKILL_DIR/scripts/inventory.sh" --stars
```
