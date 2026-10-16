# 来源

本技能吸收官方文档、gh CLI、以及现有 GitHub 向 agent skill。那些 skill 偏 issue/PR/workflow；本技能偏**账号仓库生命周期**。

## GitHub 官方

- 归档：https://docs.github.com/en/repositories/archiving-a-github-repository/archiving-repositories
- 删除：https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository
- 恢复已删仓：https://docs.github.com/en/repositories/creating-and-managing-repositories/restoring-a-deleted-repository
- PAT：https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- Fine-grained 权限与 REST 对照：https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens
- Token 过期与吊销：https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation
- 凭证类型：https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/github-credential-types
- Star REST：https://docs.github.com/en/rest/activity/starring

设置页：

- Fine-grained PAT：https://github.com/settings/personal-access-tokens
- 新建 Fine-grained：https://github.com/settings/personal-access-tokens/new
- Classic PAT：https://github.com/settings/tokens

## gh CLI

- 手册：https://cli.github.com/manual/
- `gh repo archive` / `gh repo delete` / `gh repo list`
- `gh api`、`gh api graphql`
- `gh skill`（安装/发布 agent skills，不是管仓库卫生）：https://github.blog/changelog/2026-04-16-manage-agent-skills-with-github-cli/

## 同类 skill（参考，不替代本技能）

- `shalomb/agent-skills` → `skills/github-cli`：通用 gh，强调 **不要猜 flag**，复杂操先读 reference。偏 issue/PR/Actions/GraphQL。
- `odyssey4me/agent-skills` → `skills/github`：`gh` + 只读 Python 包装；写操作直接 `gh`。偏 issue/PR/workflow。
- Agent Skills 规范：https://agentskills.io/specification
- `gh skill` 跨 Copilot / Claude Code / Cursor / Codex 安装：GitHub CLI v2.90+

## 方法要点（从官方 + 实操）

- 规划与执行分开（破坏性清单必须用户点名）。
- Fine-grained：归档/删除 = Repository **Administration=write**；star = Account **Starring=write**。二者独立。
- 403 以 `X-Accepted-Github-Permissions` 为准，不以 GET repo 的 `permissions.admin` 为准。
- 改同一条 PAT 的权限后无需重新 `gh auth login`；新建 PAT 必须换 token。
- 删除公有仓不删别人的 fork；约 90 天可申请恢复。
