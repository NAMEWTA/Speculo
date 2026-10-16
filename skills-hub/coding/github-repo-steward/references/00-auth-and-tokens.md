# 鉴权与 PAT

权威：`gh` 当前登录态。不要假设 MCP GitHub 与 `gh` 是同一 token。

## 先看什么

```bash
gh auth status
gh api -i user | rg -i 'x-oauth|x-accepted-github-permissions|github-authentication-token-expiration'
```

| token 前缀 | 种类 |
|---|---|
| `github_pat_` | Fine-grained PAT |
| `ghp_` | Classic PAT |
| `gho_` | OAuth app |
| `ghu_` / `ghs_` | GitHub App |

Fine-grained 没有 `X-OAuth-Scopes`。缺权限时看 **403 响应头** `X-Accepted-Github-Permissions`。

## 按动作选择最小权限（不是全部必选）

Fine-grained PAT（https://github.com/settings/personal-access-tokens ）：

| 位置 | 权限 | 级别 | 用途 |
|---|---|---|---|
| Repository | Metadata | Read | 列仓、读描述（通常自动带上） |
| Repository | Contents | Read and write | clone/push；只读盘点可 Read |
| Repository | Administration | **Read and write** | 归档、取消归档、改设置、**删除仓库** |
| Account | **Starring** | **Read and write** | 列自己的 star 一般可读；**加/取消 star 必须 write** |

Repository access 优先仅选本次具名仓库；只有明确需要账号全量覆盖且用户同意时才选择 `All repositories`。只读盘点不要同时要求归档、删除、star 的写权限。

Classic PAT（https://github.com/settings/tokens ）：

| scope | 用途 |
|---|---|
| `public_repo` 或 `repo` | 读/写公开仓；`repo` 含私有 |
| `delete_repo` | 删除仓库（必须单独勾） |
| 无独立 starring scope | classic 的 `public_repo`/`repo` 通常已含 star |

## 改现有 token vs 新建

- **改现有 Fine-grained 权限**：token 字符串不变，`gh` 不用重新 login。用户保存后直接重试。
- **新建 token**：通过交互式 `gh auth login` 或受保护的 stdin/凭据管理器提供，不把 token 字面值拼进命令；然后，再 `gh auth status`。旧 token 不会自动换。
- 用过期日 + 前缀辨认「当前环境到底在用哪一条」。`Github-Authentication-Token-Expiration` 响应头是可靠标识。

辨认当前 token：过期时间、`github_pat_` 前缀、login。用户若改了另一条 token，这边会继续 403。

## 403 诊断

```
HTTP 403
X-Accepted-Github-Permissions: administration=write
message: Resource not accessible by personal access token
```

把 header 里的 permission 原样翻译给用户：

| header | 用户要开的项 |
|---|---|
| `administration=write` | Repository permissions → Administration → Read and write |
| `starring=write,metadata=read` | Account permissions → Starring → Read and write |
| `contents=write` | Repository permissions → Contents → Read and write |

`permissions.admin: true` 出现在 GET repo JSON 里，**不代表** 这个 PAT 能归档/删除。那是「你作为用户对该仓的角色」，不是 token 能力。

## 不要做的事

- 不要把 token 写入 skill、仓库、issue、gist。
- 不要用 `gh auth refresh` 去「升级」fine-grained PAT（交互式、且对 PAT 无效）。
- 不要在 403 时改删网页上的别的仓。
- GitHub 会自动吊销：推到公开仓/gist 的 token、一年未使用的 token。
