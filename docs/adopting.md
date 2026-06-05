# 接入 Speculo（使用者向）

本文档面向框架使用者：你想把 Speculo 接入自己的项目，让 AI Coding 工具按统一 workflow、command 和 `.speculo/` 状态契约工作。

## 快速接入

```bash
speculo init my-project
```

`init` 会复制以下资产到目标项目根目录：

- `.speculo/`
- `commands/`
- `skills/`
- `workflows/`

如果目标项目已有同名文件或目录，`init` 会失败并列出冲突路径，不会覆盖。

## 更新框架资产

```bash
speculo update my-project
```

`update` 只覆盖目标项目的 `commands/`、`skills/`、`workflows/`。它不会覆盖 `.speculo/`，因此当前 change 状态和历史产物会保留。

## 接入后的目录

```text
my-project/
├── workflows/
│   ├── dev/
│   └── doc/
├── commands/
├── skills/
└── .speculo/
    ├── .config/
    │   ├── RULES.md
    │   ├── LESSONS.md
    │   ├── context/
    │   └── adr/
    ├── dev-status.json
    ├── doc-status.json
    ├── dev/
    ├── doc/
    ├── commands/
    └── archive/
```

## 第一次使用

1. 不确定从哪开始：让 AI 读取 `workflows/dev/00-INDEX.md`。
2. 查看当前状态：让 AI 执行 `commands/status.md`。
3. 做开发任务：从 `workflows/dev/00-INDEX.md` 进入，按 `dev/01`、`dev/02`、`dev/I`、`dev/03`、`dev/H`、`dev/R`、`dev/D` 推荐下一步。
4. 做文档写作任务：从 `workflows/doc/00-INDEX.md` 进入，按 `doc/F`、`doc/B`、`doc/S`、`doc/E` 推荐横向 workflow。
5. 归档完成的 change：执行 `commands/archive.md`；AI 必须先列清单并等待用户确认。

## 项目规则

`.speculo/.config/RULES.md` 用于记录项目硬约束，AI 只读取和遵守，不自动修改。

`.speculo/.config/LESSONS.md` 用于记录跨任务可复用的经验。workflow 收尾时，如果发现对后续任务有价值的经验，可以在用户允许或项目规则允许的情况下追加。

当前分发包默认提供轻量规则、经验、上下文和 ADR 目录。项目级术语表和 ADR 使用 `.speculo/.config/context/` 与 `.speculo/.config/adr/`；workflow 只有在用户确认后才写入这些路径。
