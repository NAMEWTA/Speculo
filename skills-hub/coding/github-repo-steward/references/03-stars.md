# Star 列表与批量取消

Star 是**账号级**操作。Fine-grained PAT 要开 **Account permissions → Starring → Read and write**。只开了仓库 Administration 不能 unstar。

## 列出

```bash
gh api --paginate -H "Accept: application/vnd.github.star+json" user/starred \
  --jq '.[] | [
      .starred_at,
      .repo.full_name,
      (.repo.stargazers_count|tostring),
      (.repo.language // "-"),
      (if .repo.archived then "archived" else "active" end),
      (if .repo.fork then "fork" else "orig" end),
      (.repo.description // "")
    ] | @tsv'
```

给用户时按主题分组，每条一句话说明。标出 `OWNER == 当前 login` 的自有仓。

## 查询单个

```bash
gh api -X GET user/starred/OWNER/REPO
# 204 = 已 star；404 = 未 star
```

## 加 / 取消

```bash
gh api -X PUT    user/starred/OWNER/REPO    # star → 204
gh api -X DELETE user/starred/OWNER/REPO    # unstar → 204；本来没 star → 404
```

用户给一批仓时：逐个调用，汇总 `ok / already_not_starred / fail`。任一 403 立刻停，报告 `X-Accepted-Github-Permissions`（通常是 `starring=write,metadata=read`）。

不要把 403 报成已取消。用 GET 复核。

## MCP

`github__unstar_repository` / `github__star_repository` 走的是 GitHub App/MCP 凭证，可能和 `gh` 不是同一权限集。一边 403 时试另一边；两边都 403 就让用户改 PAT 或 MCP 安装权限。
