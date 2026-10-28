# Speculo

把软件开发、学习、运维、决策和内容创作的方法，交给你当前使用的 AI App 或 CLI。Speculo 提供可读取的 Skill、显式 Command 和可恢复的项目产物；当前 Agent 在真实能力与授权范围内选择直接执行、普通工具并行或有价值的委派，用户明确要求与已批准的执行安排优先。

[English](README.md) · **[完整使用手册](docs/README.md)** · [快速入门](docs/getting-started.md) · [全部能力](docs/capabilities.md) · [常见问题](docs/troubleshooting.md)

## 开始使用

需要 Node.js `>=22.22.3 <25`。在希望使用 Speculo 的项目目录运行：

```bash
npm install -g @namewta/speculo
speculo init . --workflows specdev,learning --skill-targets agents --skills domain/specdev,domain/learning
speculo doctor .
```

然后对 AI 说：

```text
请读取项目 AGENTS.md，使用 specdev/init-setup，只读了解当前项目的入口和测试方式。
```

需要所有领域与公开入口时使用 `--workflows all --skills all`；使用 `.claude/skills/` 的宿主可指定 `--skill-targets claude`；`--skill-targets agents,claude` 将同一份能力清单应用到两个位置。安装、曝光和实际执行是不同步骤，见[安装教程](docs/getting-started.md)与 [CLI 参考](docs/cli.md)。

安装器在同一层级展示 **Skills Hub 分类**与 **Workflows**；进入分类选择 Skill，或直接切换 Workflow，返回时保留已有选择。完整包可用 `--hub-skills automation/herdr,automation/orca` 选择，与 workflow 入口共用 `--skill-targets`。取消勾选会卸载未修改的受管包；workflow 运行数据和冲突包保留。项目只接收已选择的 Hub 包。


交互启动会检查 CLI 自身更新，网络查询最多等待 2 秒；发现新版时明确显示「当前版本号、最新版本号」，可选择「立即更新」或「下次更新」。核验通过的 npm 全局或 Volta 安装更新后会用新版继续原命令；选择下次更新则立即继续原交互，下次启动再次提醒。详见[升级说明](docs/cli.md#刷新与升级)。

## 按领域查看完整教程

5 个 workflow、39 个 Work。每篇指南解释每个 Work 的用途、适用场景、输入、产物、调用示例和下一步。

| 领域 | Work 数 | 能帮你做什么 |
|---|---:|---|
| [SpecDev · 软件开发](docs/workflows/specdev.md) | 16 | 需求探索、规格、原型、Ticket、Goal、实现、审查、诊断与交付 |
| [Learning · 学习](docs/workflows/learning.md) | 9 | 课程规划、完整讲解、先答后讲、主动探究、作业、复习与整合 |
| [OPS · 运维部署](docs/workflows/ops.md) | 5 | 控制端准备、可信接入、主机环境、项目部署和离线资产视图 |
| [Person · 分析决策](docs/workflows/person.md) | 2 | 双向钢人论证，以及特定方法论的诊断、战略与行动咨询 |
| [Media · 内容创作](docs/workflows/media.md) | 7 | 简报、案例拆解、画风提示词、视频、本地草稿和数据复盘 |

不必每次跑完整条流程。完整获批 Spec 和 Ready Ticket 都可以直接进入实现；执行方式与 current/worktree 独立选择。见[领域路线对照](docs/workflows/README.md)。

短时同步只读委派可即时返回与调用可靠关联的结果；需要恢复或审计的任务只保存 TASK.md 与 REPORT.md，已知的会话日志路径可写在报告的可选 Session log 行。宿主原生、CLI、Herdr、Orca 均按实际需求选择。见[Agent 的任务交接](docs/agent-handoffs.md)。

## 按 Command 类别找工具

9 个 Command 是交给 AI 的明确请求，不是 `speculo xxx` 终端子命令。

| 类别 | 教程 |
|---|---|
| [导航与交接](docs/commands/README.md#navigation) | [coordination-init](docs/commands/coordination-init.md)、[status](docs/commands/status.md)、[handoff](docs/commands/handoff.md) |
| [文档与知识维护](docs/commands/README.md#documentation) | [project-maintenance](docs/commands/project-maintenance.md)：文档、知识与归档 |
| [Git 分析与历史](docs/commands/README.md#git) | [仓库审计](docs/commands/git-repository-audit.md)、[历史压缩](docs/commands/git-history-squash.md)、[上游评估](docs/commands/upstream-assess.md) |
| [源码交换与反馈](docs/commands/README.md#exchange) | [源码 ZIP](docs/commands/source-code-zip.md)、[Speculo 产品反馈](docs/commands/speculo-feedback.md) |

## 数据、权限与其他使用方式

方法正文安装到 `.agents/speculo/`，运行时数据位于 `.agents/speculo/.speculo/`；宿主投影可放在 `.agents/skills/` 和 `.claude/skills/`。现有用户指令、第三方 Skill 和人工修改按所有权保留。[基本概念](docs/concepts.md)说明这些目录与调用方式。

读取、发现或安装不授权提交、推送、发布、部署和归档。已有具体授权会复用，新增副作用按其入口核对。Speculo 不提供模型运行服务、沙箱或后台常驻编排器。

普通 SpecDev Work 可以使用明确项目、方法与数据根[直接调用](docs/workflows/specdev.md#不安装-cli-时如何使用)；网页 AI 可以选择 [12 份 Canonical 单文件](docs/canonical.md)。刷新与故障处理见 [CLI](docs/cli.md) 和[事务恢复](docs/transaction-recovery.md)。

## 了解项目与参与维护

[架构与目录](docs/architecture.md) · [维护者指南](docs/contributing.md) · [版本变化](CHANGELOG.md) · [LICENSE](LICENSE) · [第三方声明](THIRD-PARTY-NOTICES.md)

仓库使用 `pnpm@11.1.3`；版本以 [package.json](package.json) 为准。docs 持续描述当前产品与使用方法，不保存一次性开发实施报告。
