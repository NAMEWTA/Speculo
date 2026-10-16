---
name: gitea-repo
description: 管理已确认 Gitea/Forgejo 实例的 issue、PR、标签、里程碑和 Release。用于该平台的仓库查询、具名变更和 API 排错；不处理 GitHub/GitLab 或普通 Git 提交。
license: MIT
compatibility: Requires Python 3.10+, confirmed Gitea/Forgejo host and scoped credentials; API operations need network access.
metadata:
  author: NAMEWTA
  wta-format-reviewed: '2026-10-06'
---
# Gitea / Forgejo 仓库 API

## 输入与输出契约

定位 host、owner/repo、操作、具名对象与授权范围；可从已确认的上下文复用，不重复索取。只有 remote、还未确认平台时先做只读辨认；没有目标 host 就不读取令牌。

查询返回对象编号、筛选条件、页数/覆盖和失败页；写操作另给请求动作、返回 ID 与独立读回状态。未取得响应与明确失败分开，输出中不含令牌。

示例：“列出这台 Forgejo 的 owner/repo 所有关闭 issue，不做修改。”应进入本技能；“给 GitHub 项目提交一个修复 PR。”不应由本技能接管。

需要 Python 3.10+、目标实例网络和相应权限。技能目录以本文件位置为准；Windows 检查 python / py -3，macOS/Linux 检查 python3，路径参数始终作为独立参数传入，不用 shell 字符串拼接。

```bash
python3 "$SKILL_DIR/scripts/gitea_api.py" --host https://gitea.example.com --repo owner/repo issue list
```

## 定位与信任

实例按显式 --host、GITEA_HOST、已确认 remote 定位；仓库按 --repo、GITEA_REPO、remote 定位。非 GitHub remote 不证明它是 Gitea；SSH 端口也不等于 API 端口。凭据必须绑定确认的 host，不能从一个实例转发到另一个实例或重定向目标。

令牌优先 GITEA_TOKEN 或凭据工具，不在命令行、日志、快照或回复打印。--token 兼容接口不是推荐用法。认证失败不关闭 TLS；--insecure 只有对具体实例的明确证书例外授权才可使用。缺权限不绕过服务端限制。

## 按需参考

| 任务 | 入口 |
|---|---|
| issue/PR/标签/里程碑/Release | [端点与命令](references/endpoint-map.md) |
| 401/403、令牌来源 | [认证与 scopes](references/auth-and-scopes.md) |
| 全量列表、分页和状态码 | [分页与错误](references/pagination-and-errors.md) |

先读脚本 --help；--json 是全局参数，放在子命令前。实例当前 swagger 才是该版本字段依据；脚本不支持的字段不能编造成已执行。原生 PowerShell 编码和管道按本机版本验证，传 JSON 文件优于多层 shell 转义。

## 操作与停止条件

读取不扩大成写入。issue/PR 共用编号，普通 issue 列表使用 type=issues；标签 ID 按全量分页解析。合并字段 Do 区分大小写。列表失败、重复页或权限不足时标记部分覆盖，不假定不足一页即全部。

缺 read:user 不代表令牌整体失效；对已指定仓库做只读查询，不能推断写权限。创建、评论、合并发生超时或不确定响应时先查状态，不盲重试；不能为了诊断创建资源。删除/合并须有具体对象和动作授权，“关闭”不是“删除”。

## 交付

报告实例、仓库、对象编号/链接、分页覆盖、实际动作、读回结果和失败原因。保留未完成项；不以请求发送成功代替资源状态验收。
