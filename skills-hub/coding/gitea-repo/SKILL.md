---
name: gitea-repo
description: 查询或管理 Gitea/Forgejo 的 issue、PR、标签、里程碑和 Release，或排查该平台 API 请求。
license: MIT
---

# Gitea / Forgejo 仓库

从用户请求和已知 remote 确定实例、仓库与动作。复用已确认范围；非 GitHub remote 不代表它一定是 Gitea，SSH 端口也不是 API 端口。

优先已有平台工具，或使用本包的 Python 3.10+ 辅助脚本。`SKILL_DIR` 是本文件目录：

```bash
python3 "$SKILL_DIR/scripts/gitea_api.py" --help
python3 "$SKILL_DIR/scripts/gitea_api.py" --host https://gitea.example.com --repo owner/repo issue list
```

令牌使用已绑定该实例的凭据来源或 `GITEA_TOKEN`，不放进参数、日志或回复，也不转发到其他主机。权限失败不关闭 TLS 或绕过服务器限制。

按任务读取 [端点与命令](references/endpoint-map.md)、[认证与 scopes](references/auth-and-scopes.md) 或 [分页与错误](references/pagination-and-errors.md)。实例自身的当前 API 文档是版本依据；脚本没有的能力使用实际可用 API，不编造参数。
`--json` 是脚本的全局参数，放在子命令前；传 JSON 文件比多层 shell 转义更可靠。

全量查询覆盖分页并标明失败部分。issue/PR 共用编号，普通 issue 列表用 `type=issues`。不要用创建资源来诊断权限。
按用户授权执行具名写入；“关闭”不等于“删除”。创建、评论或合并响应不确定时先查询实际对象再重试，避免重复副作用。

返回相关对象链接、实际结果和未完成项；写入后读回，不能用 HTTP 请求已发出代替资源状态。
