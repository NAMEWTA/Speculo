# @namewta/speculo

> 将规范驱动开发资产打包为可安装工作流——安装、更新与迁移工具。

Speculo 将 AI 编码工作流打包为可安装资产——commands、skills、workflow packages——通过统一的 CLI 安装到任意项目中。

## 快速开始

```bash
# 在目标项目中初始化 Speculo
npx @namewta/speculo init

# 安装所有 workflow packages
npx @namewta/speculo init --all

# 全局安装
npm install -g @namewta/speculo
speculo init [--all] [target]
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
| `speculo init [--all] [target]` | 安装或刷新 Speculo 核心资产与选定的 workflow packages。已有 `speculo/.speculo/` 状态永不被覆盖。 |
| `speculo migrate [--apply] [target]` | 预览（或执行）从 v2 或过渡期 v3 状态到当前 v3 契约的迁移。默认 dry-run；`--apply` 执行分阶段、可回滚的迁移。 |
| `speculo update` | 已弃用。委托给 `speculo init --all`。 |

## 安装的运行时资产

初始化后，目标项目获得以下可通过 AI agent 调用的资产：

### 4 个 Commands

| Command | 用途 |
|---|---|
| `docs-sync` | 清洁工作区，基于可复现 Git 区间同步项目文档 |
| `archive-and-consolidate` | 知识生命周期治理：归档过期内容、合并分散知识、清理过时资产 |
| `retro` | 回顾分析，可创建 `gh issue` |
| `status` | 已安装 workflow、活跃变更与异常摘要 |

### 6 个 Skills

| Skill | 用途 |
|---|---|
| `agents-md-builder` | 多层 AGENTS.md / CLAUDE.md 手册树构建器 |
| `archive-and-consolidate` | 归档过期内容、合并分散知识、清理过时资产 |
| `docs-sync` | 核心文档审计与同步 |
| `github-npm-ops` | GitHub issue/PR 分类与 npm 操作 |
| `speculo-retro` | 回顾分析 |
| `dev-worktree` | Git worktree 开发隔离 |

### 2 个 Workflow Packages

| Workflow | Work 条目 | 说明 |
|---|---:|---|
| **specdev** | 7 | 全周期规范驱动开发：init-setup、diagnose-bugs、grill-with-docs、implement、spec、tickets、wayfinder |
| **person** | 1 | 基于人物方法论的咨询 workflow（Mao Zedong Cognitive OS） |

每个 workflow 以 `INDEX.md` 作为自动生成的 work 目录。Work 条目遵循 `<Letter>-<work_name>/<Letter>-<work_name>.md` 命名，配合渐进式展示子文件，并通过 `workspace.json` 中的 `<Path>{roots.xxx}/...</Path>` 指针解析运行时路径。

## 文档

- [AGENTS.md](./AGENTS.md) — AI 代理手册（权威）
- [CHANGELOG.md](./CHANGELOG.md) — 发布历史
- [docs/](./docs/) — commands、skills、workflows 与持久化的编写契约
- [.agents/skills/](./.agents/skills/) — Speculo 维护者内部编写工具
- [README.md](./README.md) — English version

## 致敬与开源传承

Speculo 站在先行者的肩膀上——也包括我自己的失败。我们怀着深深的敬意，隆重致谢：

- **[SpecForge](https://github.com/NAMEWTA/specforge)** —— 作者自己的上一代项目。一个 CLI 驱动的 SDD 工具，它的失败教会了我们最重要的一课：AI 时代的工具，CLI 不是入口，文档才是。让人类学命令去管理 AI 的文档，是本末倒置。
- **[Matt Pocock Skills](https://github.com/mattpocock/skills)** —— 定义了 AI 辅助开发工作流的开创性项目，启发了"可打包 agent 技能"这一核心理念。
- **[Khazix Skills](https://github.com/KKKKhazix/khazix-skills)** —— 丰富的实用 agent 技能生态，展现了社区驱动工作流共享的力量。
- **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** —— 轻量级 spec 驱动开发框架，其 changes/ 目录结构与归档机制深刻影响了 Speculo 的持久化契约设计。
- **[Superpowers](https://github.com/obra/superpowers)** —— 完整的 agentic 开发方法论，其技能编排与子代理调度为 workflow 包设计提供了重要参考。

Speculo 融合各家之长——从失败中学会"文档即入口"，从 Matt 继承技能方法论，从 OpenSpec 借鉴工程化管理，从 Superpowers 学习编排思想——形成基于包的 workflow 管理、持久化契约以及统一的安装/迁移生命周期。我们将传承他们的精神，继续前行。

## 许可证

MIT — 详见 [LICENSE](./LICENSE)
