# 星标列表与批量调整

星标属于当前账号，不属于仓库管理权限。Fine-grained token 的写操作需要用户级 Starring write 以及仓库 Metadata read；读操作按对应端点要求授权。以 [Starring REST 文档](https://docs.github.com/en/rest/activity/starring) 和实际错误为准。

## 列出并整理

```bash
gh api --paginate -H "Accept: application/vnd.github.star+json" user/starred \
  --jq '.[] | [.starred_at, .repo.full_name, (.repo.language // "-"), (.repo.description // "")] | @tsv'
```

需要时按主题、用途或用户标准整理，标出自有仓库及已归档项目。不要把旧项目自动当作无价值，也不要混淆“用户星标的仓库”与“给一个仓库点星的人”。

## 查询与修改

```bash
gh api -i -X GET user/starred/OWNER/REPO
gh api -i -X PUT user/starred/OWNER/REPO
gh api -i -X DELETE user/starred/OWNER/REPO
```

查询成功的 204 表示已星标；可访问且身份正确的查询返回 404 表示未星标。写操作按实际响应和随后读回判断；不要把 DELETE 的所有 404 都报告成“本来就没星标”。

批量处理以用户给出的完整仓库身份为边界，逐项保留实际结果。响应不确定先读回，已生效的项目不重复执行。权限错误只阻断相应动作，不把未处理项报为成功。

## 凭据与权限问题

CLI 与连接器可能对应不同账号、token 或应用安装范围。开始前选定正确身份；不能在 403 后改用另一身份来绕过拒绝。核对错误、`X-Accepted-Github-Permissions`、组织策略及凭据覆盖范围，让有权者修正授权后再继续。不要把 token 或完整敏感响应写进报告。
