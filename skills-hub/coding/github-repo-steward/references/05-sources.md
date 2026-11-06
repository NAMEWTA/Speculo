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
- 工具版本与支持选项以当前安装的 `gh help` 和官方文档为准。

## 方法要点（从官方 + 实操）

- 先核对目标与影响，按已有授权执行；仅建议的请求不包含删除授权。
- Fine-grained：归档/删除 = Repository **Administration=write**；star = Account **Starring=write**。二者独立。
- 403 结合响应、权限头与组织策略诊断；GET repo 的 `permissions.admin` 不代表 token 具有相同能力。
- 改同一条 PAT 的权限后无需重新 `gh auth login`；新建 PAT 必须换 token。
- 删除影响及恢复条件查对应官方文档，不承诺可恢复；恢复功能不能替代备份。
