# Gitea 认证与 Scope

权威说明：[API Usage](https://docs.gitea.com/development/api-usage)、[OAuth2 / PAT scopes](https://docs.gitea.com/development/oauth2-provider/)。以当前实例 Swagger 为准（`$HOST/api/swagger`）。

## 认证方式

| 方式 | 用法 | 本技能 |
|------|------|--------|
| AuthorizationHeaderToken | `Authorization: token <PAT>` | **默认，必须用这个** |
| Bearer（OAuth2 access token） | `Authorization: bearer <JWT>` | 仅当凭据是 JWT 时 |
| HTTP Basic | `username:password` 或 `username:PAT` | 只用于 `/users/:name/tokens` 管理令牌 |
| `?token=` / `?access_token=` | 查询串 | **禁止**。官方在 1.23 移除 |
| `X-GITEA-OTP` | 与 Basic + 2FA 一起 | PAT 流程不需要 |
| `Sudo` 头或 `sudo=` | 管理员冒充其他用户 | 仅管理员，默认不用 |

创建/列出 PAT 本身：`POST/GET /api/v1/users/{username}/tokens`，必须 Basic + 登录密码（不能用 PAT 自己管自己）。`sha1` 明文只在创建响应里出现一次。

## 令牌从哪来

优先级：`--token` → `GITEA_TOKEN` → `git credential fill`（`protocol` + `host`，host 含端口，例如 `gitea.example.com:3000`）。

不要把 PAT 写进仓库、技能或脚本常量，也不要打印。

## Scope

无 scope 的令牌**不能**访问 API（含公开仓）。`write:*` 包含对应 `read:*`。

| Scope | 覆盖的路由 | 典型能力 |
|-------|------------|----------|
| `issue` | issues / labels / milestones 及相关评论附件 | 列/建/改 issue、评论、标签、里程碑 |
| `repository` | `/repos/*` **不含** `/repos/.../issues/*` | PR、文件、分支、Release、协作者 |
| `user` | `/user/*`、`/users/*` | `GET /user`、关注、星标 |
| `organization` | orgs / teams | 组织与团队 |
| `notification` | `/notifications` | 通知 |
| `package` | `/packages/*` | 包 |
| `admin` | `/admin/*` | 站点管理（非管理员账号看不到） |
| `activitypub` / `misc` | 很少用 | 日常可忽略 |
| `all` | 全部读写 | 仅在用户明确要求时创建 |

关键分裂：

- 列 issue 要 `read:issue` 或 `write:issue`
- 建 PR / 合 PR 要 `write:repository`
- `GET /user` 要 `read:user`。缺它时 **403**，body 类似：`token does not have at least one of required scope(s), required=[read:user]`
- `whoami` 遇到这次 403 时改为探测 `GET /repos/{owner}/{repo}`，不要判断令牌整体无效

## 状态码

| 码 | 含义 | 处理 |
|----|------|------|
| 401 | 令牌无效/过期/未带 | 检查凭据，不要当缺 scope |
| 403 | 已认证但缺 scope 或无权限 | 读 `message`，告知用户补 scope，不要死循环 |
| 404 | 仓库/编号不存在，或无可见性 | 先确认 owner/repo/index |
| 409 | PR 冲突等 | 停下来报告 |
| 412 | 前置条件失败（如已合并 PR 改 state） | 停下来报告 |
| 422 | 校验失败 | 读 `message` / `errors` |

管理员 sudo：请求头 `Sudo: <username>` 或查询参数 `sudo=`。
