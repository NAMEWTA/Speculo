# Command 工具箱

[手册首页](../README.md) · [Workflow 指南](../workflows/README.md) · [终端 CLI](../cli.md)

Command 是你明确交给 AI 的一次任务。它的入口是 `COMMAND.md`，不是终端里的 `speculo <command>` 子命令。每个 Command 页面都有使用场景、输入、操作示例、产物与完成边界。

## 如何调用

```text
明确调用 command/status，汇总这个项目的当前情况。
```

如果宿主没有找到入口：

```text
请读取 .agents/speculo/commands/status/COMMAND.md，并按它汇总当前项目情况。
```

希望在宿主技能列表直接看到 Command，可使用 `--skills all`，或只曝光 `command/status` 等业务 ID。实际快捷调用语法由宿主决定，不要求所有 App 支持 `/status`。

<a id="navigation"></a>
## 项目导航与会话协作

| Command | 什么时候用 | 产物与边界 |
|---|---|---|
| [coordination-init](coordination-init.md) | 设置全项目默认编排方式 | 配置一次，实际任务可覆盖 |
| [status](status.md) | 不知道当前进度、异常或下一步 | 会话概览，可明确要求保存；不修复 |
| [handoff](handoff.md) | 切换会话或执行者 | 更新 change/handoff.md；跨对象另存会话摘要 |

<a id="documentation"></a>
## 文档、规范与知识整理

| Command | 什么时候用 | 产物与边界 |
|---|---|---|
| [docs-sync](docs-sync.md) | 全面核对、重组项目文档 | audit/update/commit 分开，默认 audit |
| [engineering-standards-builder](engineering-standards-builder.md) | 从真实项目生成可复用工程规范 Skill | 一个根路由与必要的领域 Skill，按需调用 |
| [archive-and-consolidate](archive-and-consolidate.md) | 选择归档或知识整理入口 | 路由 SpecDev/Learning，由领域执行 |

<a id="git"></a>
## Git 分析与历史管理

| Command | 什么时候用 | 产物与边界 |
|---|---|---|
| [git-repository-audit](git-repository-audit.md) | 分析明确范围的本地历史 | 一个 Markdown 报告，不 fetch 或改 Git |
| [git-history-squash](git-history-squash.md) | 明确要求压缩一段历史 | plan、本地 apply、远端 publish 分别核验 |
| [upstream-fork-sync](upstream-fork-sync.md) | 评估 fork 与上游差异 | 冻结检查点与定制风险，不自动集成 |

<a id="exchange"></a>
## 源码交换与产品反馈

| Command | 什么时候用 | 产物与边界 |
|---|---|---|
| [source-code-zip](source-code-zip.md) | 需要可审查的源码 ZIP | 先预览，再本地打包，不自动上传 |
| [retro](retro.md) | 向 Speculo 反馈实际产品摩擦 | 本地提案；确认后才向固定仓库提 Issue |

## 报告存在哪里

命令定义在 `.agents/speculo/commands/`；需要持久化的命令报告通常在解析后的 `roots.state/commands/<id>/`。默认安装对应 `.agents/speculo/.speculo/commands/`。有些 audit/dry-run 只在会话返回，有些命令有自己的运行目录，以各页说明为准。

报告不会覆盖历史，同日同主题冲突时用递增编号。命令读取或报告中的“已批准”不产生新权限；已有有效授权复用，新增范围和明确的高影响动作按原入口核对。
