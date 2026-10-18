# Speculo 使用手册

Speculo 把需求澄清、软件开发、学习、运维、决策和内容制作的方法整理成 AI 可以读取的文件。你提供目标与材料，当前 AI App 或 CLI 按所选方法推进，产物留在项目中，方便检查、暂停和继续。

它适合“让 AI 按明确步骤帮我完成工作”的场景。安装器负责把方法放进项目；实际阅读、提问、写作、编码和工具调用由你使用的 AI 宿主完成。

## 第一次使用，从这里开始

1. 阅读[快速入门](getting-started.md)，完成安装，并让 AI 执行第一个只读任务。
2. 阅读[基本概念与调用方式](concepts.md)，分清 workflow、Work、Command 和终端 CLI。
3. 从下面选一个领域，复制该页的示例，把主题、路径和目标替换成自己的。
4. 需要切换会话时使用 [handoff](commands/handoff.md)；不知道进度时使用 [status](commands/status.md)。

本手册以当前仓库实现为依据，主要使用中文；英文项目首页也直接链接到这些指南。示例中的业务数据和路径均需换成你的实际对象。文档链接用于 GitHub 浏览，安装后的入口路径则在[入门](getting-started.md)中说明。

## 按你想做的事选择

| 你现在想做什么 | 先看哪里 |
|---|---|
| 给项目加功能、修 Bug、写规格、审查代码 | [SpecDev：软件开发](workflows/specdev.md) |
| 系统学习一个主题、上课、问答、做作业、复习 | [Learning：学习](workflows/learning.md) |
| 接入服务器、准备环境、部署项目、查看资产 | [OPS：运维与部署](workflows/ops.md) |
| 权衡选择、分析复杂问题、形成行动方案 | [Person：分析与决策](workflows/person.md) |
| 写内容、拆解案例、准备画风提示词、做视频与本地草稿 | [Media：内容创作](workflows/media.md) |
| 整理文档、生成交接、打包源码、审计 Git 等一次性任务 | [Command 工具箱](commands/README.md) |
| 全局初始化并跨 workflow 派遣任务，追踪输入、报告与历史 | [外部 Agent 的任务交接](agent-handoffs.md) |
| 不使用本地项目，只想在网页 AI 中使用一个方法 | [Canonical 单文件使用](canonical.md) |

[所有 workflow 的路线对照](workflows/README.md) · [38 个 Work 与 11 个 Command 全目录](capabilities.md)

## 安装、恢复与维护

| 文档 | 回答的问题 |
|---|---|
| [CLI 使用参考](cli.md) | 如何选择领域、曝光 Skill、刷新安装、检查路径？ |
| [常见问题](troubleshooting.md) | 找不到技能、只有核心功能、任务停住时怎么办？ |
| [安装事务与恢复](transaction-recovery.md) | 安装中断、锁、漂移和旧版本数据如何处理？ |
| [架构与数据布局](architecture.md) | 方法源、投影、业务数据、生成物分别放在哪里？ |
| [维护者指南](contributing.md) | 如何修改源码和文档、运行对应验证？ |
| [Media 可复现示例](media/example/README.md) | 如何从简报得到预览和本地草稿？ |
| [许可声明](provenance/THIRD-PARTY-NOTICES.md)与[来源映射](provenance/upstream-matrix.md) | 哪些内容来自第三方，许可在哪里？ |

## 文档维护原则

`docs/` 保存当前产品介绍、使用教程、参考、排障和可复现示例。使用示例可以保留来源与观测证据，但不能把某次运行说成用户机器上的现状。开发计划、一次性实施报告、PR 验收流水和迭代待办不作为现行使用文档保存；版本变化查看仓库根的 [CHANGELOG](../CHANGELOG.md) 和 Git 历史。

更新一个能力时，同时核对它的源入口、该领域指南、[能力目录](capabilities.md)和两个项目首页中的链接。规则以 `template/` 中的当前入口及合同为准，手册负责解释使用方法，不建立第二套状态或授权规则。
