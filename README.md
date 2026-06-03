# Speculo

> 以结构化文档驱动 AI Coding 的标准化赋能体系  
> **SDD (Specification-Driven Development for AI)**

**版本：** v2.1  
**核心原则：** 工具无关 · 即插即用 · workflow 自治

---

## 这是什么

Speculo 是一个**纯结构化文档**框架。它通过一套可复制的目录骨架、极简 frontmatter、机器可读状态文件和分层 Markdown 工作流，让 AI Coding 在 Claude Code / Cursor / Aider / Codex / Continue / Cline 等工具里按标准化、可追溯、可复用的方式执行开发、文档和运维任务。

**Speculo 不是一个工具，是一套规范。** 它本身零代码、零运行时、零依赖。

---

## 仓库布局

```
Speculo/
├── README.md
├── docs/                       # 框架文档（维护者阅读）
│   ├── Speculo-architecture.md  # 架构总览
│   ├── adopting.md              # 接入指南
│   ├── quick-reference.md       # 内置能力速查
│   ├── persistence-contract.md  # 状态与 frontmatter 契约
│   ├── workflow-authoring.md    # workflow 编写指南
│   ├── skill-authoring.md       # skill 编写指南
│   └── command-authoring.md     # command 编写指南
└── speculo/                   # 用户复制单元
    ├── adapters/                # 工具适配层
    ├── commands/                # 一次性独立命令
    ├── workflows/               # dev 多阶段工作流 + doc/ops 预留入口
    ├── skills/                  # Speculo skill wrapper + 原始 skill source
    └── .speculo/                # 项目状态与产物骨架
```

---

## 三分钟接入

```bash
# 1. 复制框架资产。注意：speculo/. 会包含 .speculo/ 点目录。
mkdir -p my-project
cp -R Speculo/speculo/. my-project/

# 2. 复制通用 AI 指令
cp my-project/adapters/agents/AGENTS.md.example my-project/AGENTS.md

# 3. 若使用 Claude Code，再复制 Claude adapter
cp my-project/adapters/claude-code/CLAUDE.md.example my-project/CLAUDE.md
mkdir -p my-project/.claude
cp -R my-project/adapters/claude-code/.claude/commands my-project/.claude/

# 4. 激活默认配置
cd my-project/.speculo/.config
mv RULES.md.example RULES.md
# 其他 .example 按需激活
```

详见 [`docs/adopting.md`](docs/adopting.md)。

---

## 核心概念

| 构件 | 形态 | 适用场景 |
|------|------|----------|
| **workflow** | 文件夹 + 编号阶段 | 多阶段业务交付（PRD → 设计 → 实现 → 测试 → 评审） |
| **command** | 单 `.md` 文件 | 一次性独立动作（状态查询、归档） |
| **skill** | 文件夹 + `SKILL.md` | 可被复用的原子能力 |

判据：
- 多阶段编排 → **workflow**
- 单步可完成 → **command**
- 可复用能力 → **skill**

---

## 内置入口

- `speculo/workflows/dev/00-INDEX.md`：开发工作流导航
- `speculo/workflows/dev/01-grill-with-docs/01-grill-with-docs.md`：领域澄清与决策拷问
- `speculo/workflows/dev/02-prd/02-prd.md`：全景理解与 PRD
- `speculo/workflows/dev/03-tdd/03-tdd.md`：TDD 实现
- `speculo/workflows/dev/04-to-issues/04-to-issues.md`：`dev/I` 垂直切片分解
- `speculo/workflows/dev/05-diagnose/05-diagnose.md`：`dev/H` hotfix / diagnose
- `speculo/workflows/doc/00-INDEX.md`：文档工作流预留入口
- `speculo/workflows/ops/00-INDEX.md`：运维工作流预留入口
- `speculo/commands/status.md`：聚合当前状态
- `speculo/commands/archive.md`：归档 completed change（强制确认）
- `speculo/commands/{caveman,grill-me,handoff,write-a-skill,scaffold-exercises}.md`：生产力命令

---

## 文档导航

- **使用者必读：** [`adopting.md`](docs/adopting.md) · [`quick-reference.md`](docs/quick-reference.md)
- **架构原理：** [`Speculo-architecture.md`](docs/Speculo-architecture.md)
- **机器契约：** [`persistence-contract.md`](docs/persistence-contract.md)
- **扩展开发：** [`workflow-authoring.md`](docs/workflow-authoring.md) · [`skill-authoring.md`](docs/skill-authoring.md) · [`command-authoring.md`](docs/command-authoring.md)

---

## License

未指定。
