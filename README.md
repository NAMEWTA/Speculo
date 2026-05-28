# Speculo

> 以结构化文档驱动 AI Coding 的标准化赋能体系
> **SDD (Specification-Driven Development for AI)**

**版本：** v2.0
**核心原则：** 工具无关 · 即插即用 · workflow 自治

---

## 这是什么

Speculo 是一个**纯结构化文档**框架，它通过一套约定俗成的目录骨架 + 机器可读 frontmatter 契约，让 AI Coding 在任何工具（Claude Code / Cursor / Aider / Codex / Continue / Cline ...）里都能按标准化、可追溯、可复用的工作流执行编码与写作任务。

**Speculo 不是一个工具，是一套规范。** 它本身零代码、零运行时、零依赖。

---

## 仓库布局

```
Speculo/
├── README.md          ← 你现在看的这个
├── docs/              ← 框架文档（不复制给用户）
│   ├── Speculo-architecture.md   架构总览（必读）
│   ├── adopting.md               使用者：如何接入
│   ├── quick-reference.md        使用者：内置能力速查
│   ├── persistence-contract.md   机器契约
│   ├── workflow-authoring.md     扩展者：写新 workflow
│   ├── skill-authoring.md        扩展者：写新 skill
│   └── command-authoring.md      扩展者：写新 command
└── framework/         ← 用户复制单元
    ├── adapters/      ← 工具适配层
    ├── commands/      ← 一次性独立命令
    ├── workflows/     ← 多阶段编排工作流
    ├── skills/        ← 原子能力
    └── .speculo/      ← 项目持久化骨架
```

---

## 三分钟接入

```bash
# 1. 复制框架资产
cp -r Speculo/framework/* my-project/

# 2. 复制你所用工具的 adapter
cp -r Speculo/framework/adapters/claude-code/.claude my-project/.claude
# 或
cp Speculo/framework/adapters/agents/AGENTS.md.example my-project/AGENTS.md

# 3. 激活默认配置
cd my-project/.speculo/.config
mv RULES.md.example RULES.md
# ... 其他 .example 按需激活
```

详见 [`docs/adopting.md`](docs/adopting.md)。

---

## 核心概念

| 构件 | 形态 | 适用场景 |
|------|------|----------|
| **workflow** | 文件夹 + 编号阶段 | 多阶段业务交付（PRD → 设计 → 实现 → 测试 → 评审） |
| **command** | 单 `.md` 文件 | 一次性独立动作（归档、状态查询、debug） |
| **skill** | 文件夹 + `SKILL.md` | 可被复用的原子能力（代码评审、测试生成） |

判据：
- 多阶段编排 → **workflow**
- 单步可完成 → **command**
- 可复用能力 → **skill**

详见 [`docs/Speculo-architecture.md`](docs/Speculo-architecture.md) 第四节。

---

## 文档导航

- **使用者必读：** [`adopting.md`](docs/adopting.md) · [`quick-reference.md`](docs/quick-reference.md)
- **架构原理：** [`Speculo-architecture.md`](docs/Speculo-architecture.md)
- **机器契约：** [`persistence-contract.md`](docs/persistence-contract.md)
- **扩展开发：** [`workflow-authoring.md`](docs/workflow-authoring.md) · [`skill-authoring.md`](docs/skill-authoring.md) · [`command-authoring.md`](docs/command-authoring.md)

---

## License

[TODO: 协议]
