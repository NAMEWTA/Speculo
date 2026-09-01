# 项目部署探测

按实际存在内容选择，不按语言预设结论。

## 身份与边界

- 读取项目 Agent 指令、仓库根、worktree/dirty 状态、子模块和多仓库关系；
- VCS remote 必须移除 userinfo、token 和 query 后才能作为 identity；
- monorepo 使用仓库 identity 加组件相对路径，不能把两个组件误作同一部署单元；
- 目录名只能作为 project id 候选，不能单独证明项目身份。

## 通用入口

- README、部署/运维文档、Makefile、Taskfile、脚本和 CI/CD；
- Dockerfile、Compose、`.dockerignore`、entrypoint 和 healthcheck；
- Kubernetes、Kustomize、Helm、Terraform、Ansible、systemd/launchd；
- 配置 schema、`.env.example`、示例 YAML/TOML/JSON、secret provider 引用；
- migration、seed、backup/restore、volume 和数据保留说明。

## Runtime 线索

| Ecosystem | Static sources | Questions to resolve |
| --- | --- | --- |
| Java/JVM | `pom.xml`、Gradle、wrapper、toolchains、application config | JDK、artifact、profile、JVM flags、中间件、migration |
| Go | `go.mod`、workspace、build tags、main、embed | Go version、CGO、OS/arch、binary flags |
| Node | `package.json`、lockfile、workspace、runtime version | package manager、build/start、Node、process manager |
| Python | `pyproject.toml`、lockfiles、WSGI/ASGI | interpreter、environment、workers、native dependencies |
| Container | Dockerfile stages、Compose、healthcheck、mounts | args、runtime env、ports、volumes、networks、platform |

XML、JSON、YAML 和 TOML 使用可用结构化 parser。读取配置时只提取 key 和结构；示例值不自动视为生产值，真实值不复制到 change。

## 证据等级

- manifest 明确声明：declared；
- lockfile/runtime file 固定：declared with stronger pin；
- 文档无配置支持：unverified；
- 目标命令验证：observed；
- 模型推断：inferred，写依据与置信度。
