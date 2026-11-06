# Gitea 认证与 Scope

权威说明：[API Usage](https://docs.gitea.com/development/api-usage)、[OAuth2 / PAT scopes](https://docs.gitea.com/development/oauth2-provider/)。以当前实例 Swagger 为准（`$HOST/api/swagger`）。

## 认证方式

| 方式 | 用法 | 本技能 |
|------|------|--------|
| AuthorizationHeaderToken | `Authorization: token <PAT>` | 自带脚本使用的 PAT 方式 |
| Bearer（OAuth2 access token） | `Authorization: bearer <access-token>` | 按凭据类型和实例文档选择，不凭外观推断 |
| HTTP Basic | 实例支持的用户名与凭据 | 管理 token 等接口需核对实例要求，不能假定所有接口通用 |
| `?token=` / `?access_token=` | 查询串 | 不使用；URL 会进入日志和历史，即使实例仍支持也应采用认证头 |
| `X-GITEA-OTP` | 与 Basic + 2FA 一起 | PAT 流程不需要 |
| `Sudo` 头或 `sudo=` | 管理员代其他用户操作 | 需该管理操作的明确授权，不用来绕过拒绝 |

创建/列出 PAT 本身：`POST/GET /api/v1/users/{username}/tokens`，必须 Basic + 登录密码（不能用 PAT 自己管自己）。`sha1` 明文只在创建响应里出现一次。

## 令牌从哪来

优先级：`--token` → `GITEA_TOKEN` → `git credential fill`（`protocol` + `host`，host 含端口，例如 `gitea.example.com:3000`）。

不要把 PAT 写进仓库、技能或脚本常量，也不要打印。

## Scope

scope 与路由映射以实例版本为准；令牌自身范围不能越过账号或仓库权限。常用 scope 如下，`write:*` 包含对应 `read:*`。

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
- `whoami` 缺 `read:user` 不说明所有任务都失败；已授权的仓库读取可以按其接口权限判断，不必为运行无关身份查询扩大 token

## 状态码

| 码 | 含义 | 处理 |
|----|------|------|
| 401 | 令牌无效/过期/未带 | 检查凭据，不要当缺 scope |
| 403 | 已认证但缺 scope 或无权限 | 读 `message`，告知用户补 scope，不要死循环 |
| 404 | 仓库/编号不存在，或无可见性 | 先确认 owner/repo/index |
| 409 | PR 冲突等 | 停下来报告 |
| 412 | 前置条件失败（如已合并 PR 改 state） | 停下来报告 |
| 422 | 校验失败 | 读 `message` / `errors` |

确认缺少权限时暂停受影响的写入并说明所需 scope 或仓库角色；不自动换账号、管理员身份或其他接口规避拒绝。
