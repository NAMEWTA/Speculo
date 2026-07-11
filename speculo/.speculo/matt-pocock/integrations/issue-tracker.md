# Issue Tracker: GitHub

仓库 issue 以 GitHub Issues 形式管理，所有操作使用 `gh` CLI。仓库从 `git remote -v` 推断（`github.com/NAMEWTA/Speculo`）。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文使用 heredoc。
- **阅读 issue**：`gh issue view <number> --comments`，通过 `jq` 过滤评论并获取标签。
- **列出 issues**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，配合适当的 `--label` 和 `--state` 过滤器。
- **评论 issue**：`gh issue comment <number> --body "..."`
- **应用 / 移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

## PR 作为分类处理面

**PR 作为请求处理面：否。** 外部 PR 不进入 triage 队列。

## 当 skill 说"发布到问题跟踪器"时

创建一个 GitHub issue。

## 当 skill 说"获取相关工单"时

运行 `gh issue view <number> --comments`。

## Wayfinding 操作

供 `/wayfinder` 使用。

- **地图**：标记为 `wayfinder:map` 的单个 issue，包含 Notes / Decisions-so-far / Fog 正文。`gh issue create --label wayfinder:map`。
- **子工单**：链接到地图的 issue。标签：`wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。认领后分配给驱动开发者。
- **阻塞**：使用 GitHub 原生 issue 依赖，或回退到子工单正文顶部的 `Blocked by: #<n>` 行。
- **前沿查询**：列出地图的开放子工单，排除有开放阻塞者或已分配的；按地图顺序取第一个。
- **认领**：`gh issue edit <n> --add-assignee @me`
- **解决**：`gh issue comment <n> --body "<answer>"`，然后 `gh issue close <n>`，追加到地图 Decisions-so-far。
