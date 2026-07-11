# 问题跟踪器：GitHub

该仓库的 Issues 和 PRD 以 GitHub issues 形式存在。所有操作使用 `gh` CLI。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文使用 heredoc。
- **阅读 issue**：`gh issue view <number> --comments`，通过 `jq` 过滤评论并获取标签。
- **列出 issues**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，配合适当的 `--label` 和 `--state` 过滤器。
- **评论 issue**：`gh issue comment <number> --body "..."`
- **应用 / 移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

从 `git remote -v` 推断仓库 — 在 clone 仓库内运行时 `gh` 会自动推断。

## 将 Pull requests 作为分类处理面

**PR 作为请求处理面：否。** _（如果该仓库将外部 PR 视为功能请求，则设为 `yes`；`/triage` 读取此标志。）_

当设为 `yes` 时，PR 与 issue 一样经过相同的标签和状态处理，使用 `gh pr` 等价命令：

- **阅读 PR**：`gh pr view <number> --comments`，以及 `gh pr diff <number>` 查看 diff。
- **列出待分类的外部 PR**：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，然后仅保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE` 的（排除 `OWNER`/`MEMBER`/`COLLABORATOR`）。
- **评论 / 标签 / 关闭**：`gh pr comment`、`gh pr edit --add-label`/`--remove-label`、`gh pr close`。

GitHub 在 issue 和 PR 之间共享同一个编号空间，因此一个裸的 `#42` 可能是两者之一 — 通过 `gh pr view 42` 解析，并回退到 `gh issue view 42`。

## 当 skill 说"发布到问题跟踪器"时

创建一个 GitHub issue。

## 当 skill 说"获取相关工单"时

运行 `gh issue view <number> --comments`。

## Wayfinding 操作

供 `/wayfinder` 使用。**地图**是一个包含**子** issue 作为工单的单个 issue。

- **地图**：一个标记为 `wayfinder:map` 的单个 issue，包含 Notes / Decisions-so-far / Fog 正文。`gh issue create --label wayfinder:map`。
- **子工单**：作为 GitHub 子 issue 链接到地图的 issue（在子 issue 端点上使用 `gh api`）。在子 issue 不可用的地方，将子工单添加到地图正文的任务列表中，并在子工单正文顶部放置 `Part of #<map>`。标签：`wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。一旦认领，工单分配给驱动开发者。
- **阻塞**：GitHub 的**原生 issue 依赖** — 规范的、UI 可见的表示。通过 `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>` 添加边，其中 `<blocker-db-id>` 是阻塞者的数字**数据库 id**（`gh api repos/<owner>/<repo>/issues/<n> --jq .id`，_不是_ `#number` 或 `node_id`）。GitHub 报告 `issue_dependencies_summary.blocked_by`（仅开放阻塞者 — 实时关卡）。在依赖不可用的地方，回退到子工单正文顶部的 `Blocked by: #<n>, #<n>` 行。当每个阻塞者都已关闭时，工单解除阻塞。
- **前沿查询**：列出地图的开放子工单（`gh issue list --state open`，限定在地图的子 issue / 任务列表范围内），排除任何有开放阻塞者（`issue_dependencies_summary.blocked_by > 0`，或 `Blocked by` 行中的开放 issue）或被分配的；按地图顺序取第一个。
- **认领**：`gh issue edit <n> --add-assignee @me` — 会话的首次写入。
- **解决**：`gh issue comment <n> --body "<answer>"`，然后 `gh issue close <n>`，然后将上下文指针（gist + 链接）追加到地图的 Decisions-so-far 中。
