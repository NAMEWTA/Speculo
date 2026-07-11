# @namewta/speculo

> 将规范驱动开发资产打包为可安装工作流——安装、更新与迁移工具。

Speculo 将 AI 编码工作流打包为可安装资产——commands、skills、workflow packages 和 vendor skill collections——通过统一的 CLI 安装到任意项目中。

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

### 5 个 Commands

| Command | 用途 |
|---|---|
| `docs-sync` | 清洁工作区，基于可复现 Git 区间同步项目文档 |
| `finalize` | 完成门禁、状态终结与安全归档 |
| `knowledge-prune` | workflow 知识命名空间的 dry-run 审计 |
| `retro` | 回顾分析，可创建 `gh issue` |
| `status` | 已安装 workflow、活跃变更与异常摘要 |

### 10 个 Skills

| Skill | 用途 |
|---|---|
| `agents-md-builder` | 多层 AGENTS.md / CLAUDE.md 手册树构建器 |
| `change-lifecycle` | 变更状态转换、验证与归档 |
| `config-prune` | 配置命名空间裁剪 |
| `docs-sync` | 核心文档审计与同步 |
| `github-npm-ops` | GitHub issue/PR 分类与 npm 操作 |
| `knowledge-prune` | 知识命名空间裁剪 |
| `runtime-context` | Speculo 根的路径解析 |
| `scaffold-exercises` | 练习脚手架 |
| `speculo-retro` | 回顾分析 |
| `worktree-isolation` | Git worktree 隔离 |

### 2 个 Workflow Packages

| Workflow | 路由数 | 说明 |
|---|---|---|
| **matt-pocock** | 10 | 以路由优先方式组合 Matt Pocock 原生 skills（工程 + 生产力） |
| **person** | 1 | 基于人格方法论的咨询工作流 |

### Vendor Skill Collections

- **Matt Pocock skills** — 工程类（ask-matt、implement、wayfinder、tdd、code-review、diagnosing-bugs、prototyping、research、domain-modeling、codebase-design、triage、setup、to-spec、to-tickets、grill-with-docs、improve-codebase-architecture）和生产力类（grill-me、handoff、teach、writing-great-skills）

## 文档

- [AGENTS.md](./AGENTS.md) — AI 代理手册（权威）
- [CHANGELOG.md](./CHANGELOG.md) — 发布历史
- [docs/](./docs/) — commands、skills、workflows 与持久化的编写契约
- [.agents/skills/](./.agents/skills/) — Speculo 维护者内部编写工具
- [README.md](./README.md) — English version

## 致敬

灵感源自并构建于 [Matt Pocock Skills](https://github.com/mattpocock/skills) —— 塑造了 AI 辅助开发工作流的开创性项目。Speculo 在此基础上扩展了基于包的 workflow 管理、持久化契约以及统一的安装/迁移生命周期。

## 许可证

MIT — 详见 [LICENSE](./LICENSE)
