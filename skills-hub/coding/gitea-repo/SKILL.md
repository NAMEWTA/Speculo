---
name: gitea-repo
description: 查询或管理已确认 Gitea/Forgejo 实例的 issue、PR、标签、里程碑和 Release，并排查 API 请求。
license: MIT
---

# Gitea / Forgejo 仓库 API

从请求、已有上下文和 remote 确定实例、owner/repo、对象与动作。非 GitHub remote 不足以证明它是 Gitea；SSH 端口也不是 API 端口。先确认目标主机，再为它选择凭据。

## 按任务使用

| 任务 | 需要核对的内容 |
| --- | --- |
| 查询 issue、PR、标签、里程碑、Release | [端点与命令](references/endpoint-map.md)，筛选条件、分页与覆盖 |
| 创建或修改仓库对象 | 对象身份、请求体、授权范围和写入后读回 |
| 合并 PR | 当前 head/base、合并条件、方式与源分支处理，不能把“关闭”当成合并 |
| 认证或 scope 失败 | [认证](references/auth-and-scopes.md)，区分凭据、端点权限和对象可见性 |
| 全量列表或异常响应 | [分页与错误](references/pagination-and-errors.md)，区分部分结果和完整覆盖 |

现有连接器合适时直接使用；也可用本包 Python 3.10+ 工具。`SKILL_DIR` 是本文件目录，先用本机实际解释器查看帮助：

```bash
python3 "$SKILL_DIR/scripts/gitea_api.py" --help
python3 "$SKILL_DIR/scripts/gitea_api.py" --host https://gitea.example.com --repo owner/repo --json issue list --state closed --all
```

`--json` 位于子命令之前。创建正文优先用 `--body-file`，避免 shell 改变换行或执行文本里的特殊字符。Windows 使用实际 Python/py launcher，并按当前 shell 传递独立参数。

## 平台知识

同仓 issue 与 PR 共用编号；普通 issue 列表使用 `type=issues`。标签引用的是 ID，先完成标签列表分页再按名称解析。合并请求中的 `Do` 大小写和支持方式，以实例 API 为准。

实例自己的 Swagger 是当前字段依据，Forgejo 的差异也要按其版本确认。脚本的专用命令不覆盖所有 API；没有对应命令时可使用已核对的通用 `api` 入口，不编造 flag 或假定功能不存在。

全量查询继续分页到服务端给出的结束条件，标明失败页和不完整范围。实例可能限制实际页长，不能仅因返回少于请求数量就认定取完。

## 认证与可靠写入

优先使用已绑定该 host 的凭据来源或 `GITEA_TOKEN`，不把 token 放在参数、URL、日志或回复里。不要向重定向主机转发凭据；TLS 与权限失败应查清原因。

缺少 `read:user` 时，`/user` 失败不表示令牌对指定仓库无效；做相应只读查询即可，不用创建资源测试写权限。

在已有授权范围内执行准确的对象与动作。创建、评论或合并响应不确定时，先查询是否已生效再决定重试；删除、关闭和归档的含义不能互换。

交付对象链接、实际结果、覆盖范围和未完成项。写入后独立读回目标状态；请求发出或 HTTP 局部成功不替代资源结果。
