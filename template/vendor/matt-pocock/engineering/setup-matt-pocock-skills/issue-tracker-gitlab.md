# 问题跟踪器：GitLab

该仓库的 Issues 和 PRD 以 GitLab issues 形式存在。所有操作使用 [`glab`](https://gitlab.com/gitlab-org/cli) CLI。

## 约定

- **创建 issue**：`glab issue create --title "..." --description "..."`。多行描述使用 heredoc。传递 `--description -` 以打开编辑器。
- **阅读 issue**：`glab issue view <number> --comments`。使用 `-F json` 获取机器可读输出。
- **列出 issues**：`glab issue list -F json`，配合适当的 `--label` 过滤器。
- **评论 issue**：`glab issue note <number> --message "..."`。GitLab 将评论称为"notes"。
- **应用 / 移除标签**：`glab issue update <number> --label "..."` / `--unlabel "..."`。多个标签可以用逗号分隔或重复标志。
- **关闭**：`glab issue close <number>`。`glab issue close` 不接受关闭评论，因此先用 `glab issue note <number> --message "..."` 发布说明，然后关闭。
- **合并请求**：GitLab 将 PR 称为"merge requests"。使用 `glab mr create`、`glab mr view`、`glab mr note` 等 — 与 `gh pr ...` 形态相同，用 `mr` 替换 `pr`，用 `note`/`--message` 替换 `comment`/`--body`。

从 `git remote -v` 推断仓库 — 在 clone 仓库内运行时 `glab` 会自动推断。

## 将合并请求作为分类处理面

**MR 作为请求处理面：否。** _（如果该仓库将外部合并请求视为功能请求，则设为 `yes`；`/triage` 读取此标志。）_

当设为 `yes` 时，MR 与 issue 一样经过相同的标签和状态处理，使用 `glab mr` 等价命令：

- **阅读 MR**：`glab mr view <number> --comments`，以及 `glab mr diff <number>` 查看 diff。
- **列出待分类的外部 MR**：`glab mr list -F json`，然后仅保留作者不是项目成员/所有者的 MR（贡献者的 MR，而非维护者的进行中工作）。
- **评论 / 标签 / 关闭**：`glab mr note`、`glab mr update --label`/`--unlabel`、`glab mr close`。

与 GitHub 不同，GitLab 的 issue 和 MR 编号是分开的，因此一旦你知道维护者指的是哪个处理面，`#42` 就没有歧义。

## 当 skill 说"发布到问题跟踪器"时

创建一个 GitLab issue。

## 当 skill 说"获取相关工单"时

运行 `glab issue view <number> --comments`。

## Wayfinding 操作

供 `/wayfinder` 使用。**地图**是一个包含**子** issue 作为工单的单个 issue。

- **地图**：一个标记为 `wayfinder:map` 的单个 issue，包含 Notes / Decisions-so-far / Fog 正文。`glab issue create --label wayfinder:map`。（在支持原生 epic 的 GitLab 层级上，epic 可以承载地图；标记的 issue 在任何地方都通用。）
- **子工单**：一个 issue，在其描述顶部放置 `Part of #<map>`，标签为 `wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。一旦认领，工单分配给驱动开发者。
- **阻塞**：GitLab 的**原生阻塞链接** — 规范的、UI 可见的表示。通过 `/blocked_by #<n>` 快速操作添加，以 note 形式发布（`glab issue note <child> --message "/blocked_by #<blocker>"`）。原生阻塞链接是 Premium/Ultimate 功能；在免费层级（或不可用的地方），回退到描述顶部的 `Blocked by: #<n>, #<n>` 行。当每个阻塞者都已关闭时，工单解除阻塞。
- **前沿查询**：`glab issue list -F json`，限定在地图的子工单范围内，排除任何有开放阻塞者的 — 指向开放 issue 的原生 `blocked_by` 链接（`glab api projects/:id/issues/:iid/links`），或 `Blocked by` 行中的开放 issue — 或被分配的；按地图顺序取第一个。
- **认领**：`glab issue update <n> --assignee @me` — 会话的首次写入。
- **解决**：`glab issue note <n> --message "<answer>"`，然后 `glab issue close <n>`，然后将上下文指针（gist + 链接）追加到地图的 Decisions-so-far 中。
