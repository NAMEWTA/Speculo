# 分页、错误与字段陷阱

## 分页

- 查询参数：`page`（从 1 开始）、`limit`
- 实例限额见 `GET /settings/api`：常见 `max_response_items=50`，`default_paging_num=30`
- 超过上限会被服务端截断；脚本 `--all` 按页继续直到空页，不能以本页少于请求的 `limit`（默认 50）判断结束；服务端可设置更小上限。重复非空页或意外响应格式时报错，不静默返回“全量”；不再用 200 页上限静默截断
- 响应头：
  - `x-total-count`：总数
  - `Link`：`rel="next"` / `rel="last"`
- issue/PR 列表核对 `state` 默认值；要全部状态显式传 `state=all`，其他列表不能套用该参数

## 错误体

Gitea 常见 JSON：

```json
{"message":"...","url":"https://gitea.example.com/api/swagger"}
```

把 `message` 原样告诉用户。缺 scope 的 403 会写出 `required=[read:user], token scope=...`，据此判断是令牌权限问题还是仓库权限问题。

## 字段陷阱

1. **合并 PR 用 `Do`**：`POST .../pulls/{index}/merge` 体为 `{"Do":"merge"}`。小写 `do` 会被忽略。可选值：`merge`、`squash`、`rebase`、`rebase-merge`。删除源分支需显式 `delete_branch_after_merge`；API 不会自动套用仓库「合并后删分支」的 UI 默认值。
2. **创建 issue 的 labels 是 ID**：`{"labels":[1,2]}`。名字必须先 `GET .../labels` 再替换。`assignees` 才是用户名数组。
3. **issue 列表混有 PR**：不带 `type=issues` 时，PR 也会出现在 `/issues` 里，且带 `pull_request` 字段。
4. **`/user` 与 `/version` 可能 403**：相关 scope 与实例权限可能不同，不代表令牌整体无效。按本次任务实际接口判断，不为无关探测扩大权限。
5. **Git HTTP 与 API 认证不能混用**：仓库 clone/push 的凭据配置不证明 API 范围；自带脚本的 `Authorization: token` 不需要用户名。
6. **deadline 只取日期**：issue/PR 的 `due_date` 忽略时刻。
7. **已合并 PR 的状态受限制**：先读回真实对象，不把前置条件失败（如 412）当作可无限重试的网络故障。
8. **删除 issue 是永久删除**，不是 close。默认只 PATCH `state=closed`。
9. **不要把令牌放进 URL**。日志、代理、浏览器历史都会留下查询串。
10. **方案跟随 `GITEA_HOST` / remote**。SSH remote 只提供待确认主机：统一以 HTTPS 作为候选，不复制 SSH 端口、不推断 HTTP。实例使用其他 API 地址时要求明确 --host；自签证书先采用受信 CA 配置，不能自动加 --insecure。
