# @namewta/speculo

> 将规范驱动开发资产打包为可安装工作流——直接初始化与刷新工具。

Speculo 将 AI 编码工作流打包为可安装资产——commands、skills、workflow packages——通过统一的 CLI 安装到任意项目中。

## 快速开始

```bash
# 在目标项目中初始化 Speculo
npx @namewta/speculo init

# 全局安装
npm install -g @namewta/speculo
speculo init [target]
```

初始化后，目标项目的 `speculo/` 目录包含所有核心资产和选定的 workflow packages。

## 安装

```bash
npm install -g @namewta/speculo
```

要求：Node.js ≥ 22.22.3

## 命令

| 命令 | 说明 |
|---|---|
| `speculo` / `speculo init [target]` | 初始化或直接刷新 Speculo 管理的资产。每次刷新均以当前模板替换 `config.json`、工作区元数据、commands、skills 和本次选中的 workflow 静态包；对选中 workflow 重置受管理状态，仅保留 `changes/` 与 `archive/`，保留 command Markdown 报告但删除 command `state.json`。交互中未选中的当前支持 workflow 完全不变。安装 SpecDev 后还会幂等确保项目根 `.gitignore` 包含 `specdev-worktree/`。 |
| `speculo version` | 显示本地版本并检查 npm 最新版本。 |

v0.7.0 起已移除 `migrate`、`mirror-skills`、`update` 及相关 flags。旧安装请直接重新运行 `speculo init`；不会执行兼容迁移。

## 安装的运行时资产

初始化后，目标项目获得以下可通过 AI agent 调用的资产：

### 6 个 Commands

| Command | 用途 |
|---|---|
| `docs-sync` | 清洁工作区，基于可复现 Git 区间同步项目文档与 Agent 手册 |
| `archive-and-consolidate` | 知识生命周期治理：归档过期内容、合并分散知识、清理过时资产 |
| `git-repository-audit` | 对一个或多个本地 Git 仓库执行只读、可复现的审计 |
| `handoff` | 持久化精简且可恢复的上下文，供另一 Agent 接手 |
| `retro` | 回顾分析，可创建 `gh issue` |
| `status` | 已安装 workflow、活跃变更与异常摘要 |

### 6 个 Skills

| Skill | 用途 |
|---|---|
| `archive-and-consolidate` | 归档过期内容、合并分散知识、清理过时资产 |
| `docs-sync` | 文档审计，以及 AGENTS.md / CLAUDE.md 手册的增量维护或完整重建 |
| `github-npm-ops` | GitHub issue/PR 分类与 npm 操作 |
| `speculo-retro` | 回顾分析 |
| `typescript-standards-builder` | 为当前项目生成 TypeScript/JavaScript/React/Node 工程规范 Skill |
| `writing-great-skills` | Agent Skill 编写参考 |

### 2 个 Workflow Packages

| Workflow | Work 条目 | 说明 |
|---|---:|---|
| **specdev** | 14 | 本地优先的规范驱动开发：归档、代码审查、诊断、认知指导、设计访谈、实现、初始化、目标编排、原型、架构审查、Spec、Ticket、分诊与寻路 |
| **person** | 1 | 基于人物方法论的咨询 workflow（Mao Zedong Cognitive OS） |

每个 workflow 以 `INDEX.md` 作为自动生成的 work 目录。Work 条目遵循 `<Letter>-<work_name>/<Letter>-<work_name>.md` 命名，配合渐进式展示子文件，并通过 `workspace.json` 中的 `<Path>{roots.xxx}/...</Path>` 指针解析运行时路径。

## 文档

- [AGENTS.md](./AGENTS.md) — AI 代理手册（权威）
- [CHANGELOG.md](./CHANGELOG.md) — 发布历史
- [.agents/skills/](./.agents/skills/) — Speculo 维护者内部编写工具（编写契约自包含于 `_shared/` 与各 skill 的 `references/`）
- [README.md](./README.md) — English version

## 致敬与开源传承

Speculo 站在先行者的肩膀上——也包括我自己的失败。我们怀着深深的敬意，隆重致谢：

- **[SpecForge](https://github.com/NAMEWTA/specforge)** —— 作者自己的上一代项目。一个 CLI 驱动的 SDD 工具，它的失败教会了我们最重要的一课：AI 时代的工具，CLI 不是入口，文档才是。让人类学命令去管理 AI 的文档，是本末倒置。
- **[Matt Pocock Skills](https://github.com/mattpocock/skills)** —— 定义了 AI 辅助开发工作流的开创性项目，启发了"可打包 agent 技能"这一核心理念。
- **[Khazix Skills](https://github.com/KKKKhazix/khazix-skills)** —— 丰富的实用 agent 技能生态，展现了社区驱动工作流共享的力量。
- **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** —— 轻量级 spec 驱动开发框架，其 changes/ 目录结构与归档机制深刻影响了 Speculo 的持久化契约设计。
- **[Superpowers](https://github.com/obra/superpowers)** —— 完整的 agentic 开发方法论，其技能编排与子代理调度为 workflow 包设计提供了重要参考。

Speculo 融合各家之长——从失败中学会"文档即入口"，从 Matt 继承技能方法论，从 OpenSpec 借鉴工程化管理，从 Superpowers 学习编排思想——形成基于包的 workflow 管理、持久化契约以及直接刷新生命周期。我们将传承他们的精神，继续前行。

## 许可证

MIT — 详见 [LICENSE](./LICENSE)
