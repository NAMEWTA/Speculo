# Speculo

> 以结构化文档驱动 AI Coding 的标准化赋能体系  
> **SDD (Specification-Driven Development for AI)**

[![CI](https://github.com/NAMEWTA/Speculo/actions/workflows/ci.yml/badge.svg)](https://github.com/NAMEWTA/Speculo/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@namewta/speculo.svg)](https://www.npmjs.com/package/@namewta/speculo)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/node/v/@namewta/speculo.svg)](./package.json)

**版本：** v2.6
**核心原则：** 工具无关 · CLI 接入 · workflow 自治

## 这是什么

Speculo 是一套结构化文档框架。它通过可复制的 `commands/`、`workflows/`、`skills/` 和 `.speculo/` 状态骨架，让 AI Coding 在不同工具中按标准化、可追溯、可复用的方式执行开发、文档和运维任务。

仓库同时提供一个很小的 CLI：

- `speculo init [target]`：把框架资产安装到目标项目。若 `speculo/` 不存在则全新安装全部资产（冲突时失败）；若已存在则自动更新 `commands/`、`skills/`、`workflows/` 并保留 `.speculo/` 状态和产物。

## 仓库布局

```text
Speculo/
├── README.md
├── docs/                       # 框架文档
├── src/                        # speculo CLI
├── test/                       # CLI 测试
└── template/                   # 包内框架资产源
    ├── commands/               # 一次性独立命令
    ├── workflows/              # 多阶段工作流
    ├── skills/                 # command 可调用的可复用 skill
    ├── vendor/                 # 原生第三方 AgentSkills 收集目录
    └── .speculo/               # 项目状态与产物骨架
```

## 三分钟接入

```bash
# 全局安装 CLI（npm 包名为 @namewta/speculo，命令名为 speculo）
npm install -g @namewta/speculo

# 安装框架资产到目标项目（首次）
speculo init my-project

# 后续更新框架资产（speculo/ 已存在时自动进入更新模式，不覆盖 .speculo 状态）
speculo init my-project
```

首次 `init` 会带上 `.speculo/.config/RULES.md` 和 `.speculo/.config/LESSONS.md` 作为最小项目规则/经验库；后续执行不会覆盖它们。

详见 [docs/adopting.md](docs/adopting.md)。

## 内置入口

- `workflows/dev/AGENTS.md`：开发工作流导航
- `workflows/dev/01-grill-with-docs/01-grill-with-docs.md`：领域澄清与决策拷问
- `workflows/dev/02-prd/02-prd.md`：全景理解与 PRD
- `workflows/dev/03-tdd/03-tdd.md`：TDD 实现
- `workflows/dev/I-to-issues/I-to-issues.md`：`dev/I` 垂直切片分解
- `workflows/dev/H-diagnose/H-diagnose.md`：`dev/H` hotfix / diagnose
- `workflows/dev/R-review/R-review.md`：`dev/R` Spec / Engineering / Standards 三维度 diff 审查
- `workflows/dev/M-domain-modeling/M-domain-modeling.md`：`dev/M` 主动领域建模，维护 CONTEXT 与 ADR
- `workflows/dev/A-improve-architecture/A-improve-architecture.md`：`dev/A` 架构深化机会扫描与 HTML 审查报告
- `workflows/dev/D-docs-sync/D-docs-sync.md`：`dev/D` 基于 git diff、归档产物和 `.config` 生命周期同步文档/知识资产
- `workflows/doc/AGENTS.md`：文档写作 workflow 导航
- `workflows/person/AGENTS.md`：人物方法论 workflow 导航
- `.speculo/AGENTS.md`：状态骨架、项目知识和归档的读取指引
- `.speculo/archive/AGENTS.md`：已完成 change 归档读取指引
- `commands/status.md`：聚合当前状态
- `commands/archive.md`：归档 completed change
- `commands/config-prune.md`：dry-run 审计 `.config` 过期知识资产
- `commands/{caveman,grill-me,handoff,write-a-skill,scaffold-exercises}.md`：生产力命令
- `commands/retro.md`：复盘 Speculo 使用痛点并经确认提改进 issue

## 开发

```bash
pnpm install
pnpm build
pnpm test
```

运行环境锁定为 Node `22.22.3`、pnpm `11.1.3`。

## 致谢 / Acknowledgements

Speculo 的设计受益于以下项目的理念与实践：

- **[Matt Pocock / skills](https://github.com/mattpocock/skills)** — 技能封装与渐进披露模式的重要参考
- **[NAMEWTA / specforge](https://github.com/NAMEWTA/specforge)** — 同属 SDD 工具链的兄弟项目，规格生成与验证的互补实践

## 文档导航

- 使用者必读：[adopting.md](docs/adopting.md) · [quick-reference.md](docs/quick-reference.md)
- 架构原理：[Speculo-architecture.md](docs/Speculo-architecture.md)
- 机器契约：[persistence-contract.md](docs/persistence-contract.md)
- 扩展开发：[workflow-authoring.md](docs/workflow-authoring.md) · [skill-authoring.md](docs/skill-authoring.md) · [command-authoring.md](docs/command-authoring.md)

## License

[MIT](./LICENSE) © wta
