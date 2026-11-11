# 仓库盘点

## 获取完整的可见范围

技能自带脚本使用 GraphQL cursor 分页列出指定用户拥有的仓库：

```bash
"$SKILL_DIR/scripts/inventory.sh"
"$SKILL_DIR/scripts/inventory.sh" --user LOGIN
"$SKILL_DIR/scripts/inventory.sh" --stars
```

明确登录账号、目标 owner 和当前凭据可见范围。过滤原创、fork、已归档仓在完整结果上进行；不要把固定 `--limit 200` 的截断列表称为全量。`--stars` 始终列当前登录账号的星标，不随 `--user` 切换。分页中断时报告已取范围与缺口。

## 补充与任务有关的证据

```bash
gh api "repos/$ACCOUNT_LOGIN/$REPO_NAME" --jq '{open_issues_count,archived,disabled,has_pages,homepage,pushed_at}'
gh run list -R "$ACCOUNT_LOGIN/$REPO_NAME" --limit 1 --json workflowName,status,conclusion,updatedAt
gh api --paginate "repos/$ACCOUNT_LOGIN/$REPO_NAME/pulls?state=open&per_page=100" --jq '.[].number'
```

`open_issues_count` 包含 PR。需要分开统计时使用同一范围的完整 PR 数，或分别查询 issue 与 PR 的总数；不要减去 `gh pr list` 默认截断页面的条数。列表在查询过程中可能变化，应说明统计时点。

最后一次 Actions run 的结论只代表那次运行。它可能属于不同分支；“没有读取到 run”也可能是权限、保留期限或查询范围，不直接写成“无 CI”。

## 解释状态

直接呈现最后推送日期、归档状态、fork 上游、开放问题及实际依赖。推送频率只能说明活动，不能单独证明项目已废弃：成熟库、镜像、文档和实验仓的正常节奏不同。

需要分类时说明用户关心的标准和事实依据。例如“已归档”“仍被部署引用”“有独特未合并提交”比固定超过九十天判定停滞更有决策价值。stars 数量也不决定保留价值。

结果按本次目的选择列：清理评估关注用途和独特数据，维护排查关注 issue/PR、CI 与发布，账号概览关注可见性和主题。报告仓库链接、覆盖范围、关键发现与有依据的建议即可；星标可另按主题整理。
