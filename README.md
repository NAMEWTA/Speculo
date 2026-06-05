# Speculo

> 以结构化文档驱动 AI Coding 的标准化赋能体系  
> **SDD (Specification-Driven Development for AI)**

**版本：** v2.3  
**核心原则：** 工具无关 · CLI 接入 · workflow 自治

## 这是什么

Speculo 是一套结构化文档框架。它通过可复制的 `commands/`、`workflows/`、`skills/` 和 `.speculo/` 状态骨架，让 AI Coding 在不同工具中按标准化、可追溯、可复用的方式执行开发、文档和运维任务。

仓库同时提供一个很小的 CLI：

- `speculo init [target]`：把框架资产安装到目标项目；遇到已有文件冲突时失败，不覆盖。
- `speculo update [target]`：覆盖目标项目的 `commands/`、`skills/`、`workflows/`；保留 `.speculo/` 下的状态和产物。

## 仓库布局

```text
Speculo/
├── README.md
├── docs/                       # 框架文档
├── src/                        # speculo CLI
├── test/                       # CLI 测试
└── speculo/                    # 包内框架资产源
    ├── commands/               # 一次性独立命令
    ├── workflows/              # 多阶段工作流
    ├── skills/                 # command 可调用的可复用 skill
    └── .speculo/               # 项目状态与产物骨架
```

## 三分钟接入

```bash
# 已安装 CLI 后
speculo init my-project

# 更新框架资产，不覆盖 .speculo 状态
speculo update my-project
```

`init` 会带上 `.speculo/.config/RULES.md` 和 `.speculo/.config/LESSONS.md` 作为最小项目规则/经验库；`update` 不会覆盖它们。

详见 [docs/adopting.md](docs/adopting.md)。

## 内置入口

- `workflows/dev/00-INDEX.md`：开发工作流导航
- `workflows/dev/01-grill-with-docs/01-grill-with-docs.md`：领域澄清与决策拷问
- `workflows/dev/02-prd/02-prd.md`：全景理解与 PRD
- `workflows/dev/03-tdd/03-tdd.md`：TDD 实现
- `workflows/dev/I-to-issues/I-to-issues.md`：`dev/I` 垂直切片分解
- `workflows/dev/H-diagnose/H-diagnose.md`：`dev/H` hotfix / diagnose
- `workflows/dev/R-review/R-review.md`：`dev/R` 双维度 diff 审查
- `workflows/dev/D-docs-sync/D-docs-sync.md`：`dev/D` git diff 驱动文档同步
- `workflows/doc/00-INDEX.md`：文档写作 workflow 导航
- `commands/status.md`：聚合当前状态
- `commands/archive.md`：归档 completed change
- `commands/{caveman,grill-me,handoff,write-a-skill,scaffold-exercises}.md`：生产力命令

## 开发

```bash
pnpm install
pnpm build
pnpm test
```

运行环境锁定为 Node `22.22.3`、pnpm `11.1.3`。

## 文档导航

- 使用者必读：[adopting.md](docs/adopting.md) · [quick-reference.md](docs/quick-reference.md)
- 架构原理：[Speculo-architecture.md](docs/Speculo-architecture.md)
- 机器契约：[persistence-contract.md](docs/persistence-contract.md)
- 扩展开发：[workflow-authoring.md](docs/workflow-authoring.md) · [skill-authoring.md](docs/skill-authoring.md) · [command-authoring.md](docs/command-authoring.md)

## License

未指定。
