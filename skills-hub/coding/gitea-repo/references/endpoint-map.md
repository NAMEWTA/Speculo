# Gitea /api/v1 端点图

`basePath=/api/v1`。实时契约（优先于本文件）：

- UI：`$HOST/api/swagger`
- JSON：`$HOST/swagger.v1.json`
- 官方分类（可能新于实例）：https://docs.gitea.com/api/

脚本没有的能力，用：

```bash
python3 "$SKILL_DIR/scripts/gitea_api.py" api GET '/repos/{owner}/{repo}/issues/1/timeline'
```

路径占位 `{owner}` `{repo}` 由脚本按当前仓替换。Forgejo 与 Gitea 的许多 `/api/v1` 接口相近，仍须以目标实例 Swagger 核对版本差异。

## gh → Gitea

| gh | Gitea |
|----|-------|
| `gh issue list` | `GET /repos/{owner}/{repo}/issues?type=issues` |
| `gh issue view N` | `GET /repos/{owner}/{repo}/issues/{index}` |
| `gh issue create` | `POST /repos/{owner}/{repo}/issues` |
| `gh issue close` | `PATCH /repos/{owner}/{repo}/issues/{index}` `{"state":"closed"}` |
| `gh issue comment` | `POST /repos/{owner}/{repo}/issues/{index}/comments` |
| `gh pr list` | `GET /repos/{owner}/{repo}/pulls` |
| `gh pr view N` | `GET /repos/{owner}/{repo}/pulls/{index}` |
| `gh pr create` | `POST /repos/{owner}/{repo}/pulls` `{"head","base","title","body"}` |
| `gh pr merge` | `POST /repos/{owner}/{repo}/pulls/{index}/merge` `{"Do":"merge"}` |
| `gh pr diff` | `GET /repos/{owner}/{repo}/pulls/{index}.diff` |
| `gh release list` | `GET /repos/{owner}/{repo}/releases` |
| `gh api user` | `GET /user` |
| `gh search issues` | `GET /repos/issues/search` |
| `gh repo view` | `GET /repos/{owner}/{repo}` |

同仓 issue 与 PR **共用 number/index**。判断 PR：对象带 `pull_request` 字段，或走 `/pulls`。

## 按资源（高频）

### Issue（tag: issue）

- `GET/POST /repos/{owner}/{repo}/issues`
- `GET/PATCH/DELETE /repos/{owner}/{repo}/issues/{index}`
- `GET/POST /repos/{owner}/{repo}/issues/{index}/comments`
- `GET /repos/{owner}/{repo}/issues/{index}/timeline`
- `GET/POST/PUT/DELETE /repos/{owner}/{repo}/issues/{index}/labels`
- `GET/POST /repos/{owner}/{repo}/labels` 与 `/labels/{id}`
- `GET/POST /repos/{owner}/{repo}/milestones` 与 `/milestones/{id}`
- `GET /repos/issues/search` 跨仓搜索；`type=issues|pulls`

`POST /issues` 体：`title`（必填）、`body`、`assignees`（用户名数组）、`labels`（**ID 数组**）、`milestone`（ID）、`due_date`、`closed`、`ref`。

### Pull request（tag: repository）

- `GET/POST /repos/{owner}/{repo}/pulls`
- `GET/PATCH /repos/{owner}/{repo}/pulls/{index}`
- `GET /repos/{owner}/{repo}/pulls/{index}/commits`
- `GET /repos/{owner}/{repo}/pulls/{index}/files`
- `GET/POST/DELETE /repos/{owner}/{repo}/pulls/{index}/merge`
- `GET/POST /repos/{owner}/{repo}/pulls/{index}/reviews`
- `POST /repos/{owner}/{repo}/pulls/{index}/update`（把 base 合进 head）

同仓 PR 的 `head` 用分支名即可；fork 用 `"owner:branch"`。

### 仓库 / 内容 / 发布

- `GET /repos/{owner}/{repo}`
- `GET /repos/search?q=`
- `GET /repos/{owner}/{repo}/branches`、`/tags`、`/commits`
- `GET/POST/PUT/DELETE /repos/{owner}/{repo}/contents/{filepath}`
- `GET/POST /repos/{owner}/{repo}/releases`、`/releases/latest`

### 用户 / 通知 / 杂项

- `GET /user`（需 `read:user`）、`GET/POST /user/repos`
- `GET /version`（缺 `read:misc` 时也可能 403，以实测为准）
- `GET /notifications`
- `GET /settings/api` → `max_response_items`（常见 50）、`default_paging_num`

Project 看板等未列能力先查目标实例 Swagger。接口未提供时明确说明缺口，不能凭 GitHub 的同名功能编造 Gitea 路由。
