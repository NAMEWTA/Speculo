# 接入 Speculo（使用者向）

本文档面向框架使用者：你想把 Speculo 接入自己的项目，让 AI Coding 工具按统一 workflow、command 和 `speculo/.speculo/` 状态契约工作。

## 快速接入

```bash
speculo init my-project
```

`init` 会把以下资产复制到目标项目的 `speculo/` 目录下（统一收纳在一个 `speculo/` 目录里，不散落到项目根目录）：

- `template/.speculo/`
- `template/commands/`
- `template/skills/`
- `template/workflows/`

如果目标项目的 `speculo/` 下已有同名文件或目录，`init` 会失败并列出冲突路径，不会覆盖。

## 更新框架资产

```bash
speculo init my-project
```

当 `speculo/` 目录已存在时，`init` 会自动进入更新模式：只覆盖 `commands/`、`skills/`、`workflows/`，不会覆盖 `speculo/.speculo/`，因此当前 change 状态和历史产物会保留。`vendor/` 在 `--all` 时覆盖刷新，默认更新时只增量合并缺失技能。

## 接入后的目录

```text
my-project/
└── speculo/
    ├── workflows/
    │   ├── dev/
    │   ├── doc/
    │   └── person/
    ├── commands/
    ├── skills/
    ├── vendor/
    └── .speculo/
        ├── AGENTS.md
        ├── .config/
        │   ├── RULES.md
        │   ├── LESSONS.md
        │   ├── context/
        │   └── adr/
        ├── dev-status.json
        ├── doc-status.json
        ├── person-status.json
        ├── dev/
        ├── doc/
        ├── person/
        ├── commands/
        └── archive/
            └── AGENTS.md
```

## 第一次使用

1. 不确定从哪开始：让 AI 读取 `speculo/workflows/dev/AGENTS.md`。
2. 查看当前状态：让 AI 执行 `speculo/commands/status.md`。
3. 做开发任务：从 `speculo/workflows/dev/AGENTS.md` 进入，按 `dev/01`、`dev/02`、`dev/I`、`dev/03`、`dev/04`、`dev/H`、`dev/R`、`dev/M`、`dev/A`、`dev/D` 推荐下一步。
4. 做文档写作任务：从 `speculo/workflows/doc/AGENTS.md` 进入，按 `doc/F`、`doc/B`、`doc/S`、`doc/E` 推荐横向 workflow。
5. 做人物方法论咨询：从 `speculo/workflows/person/AGENTS.md` 进入，按 `person/M` 推荐下一步。
6. 收尾并归档单个 change：从 `dev/04`（`speculo/workflows/dev/04-finalize/04-finalize.md`）进入，先完成前验证再归档；批量归档多个已完成 change 用 `speculo/commands/archive.md`。AI 执行归档前必须先列清单并等待用户确认。

## 项目规则

`speculo/.speculo/.config/RULES.md` 用于记录项目硬约束，AI 只读取和遵守，不自动修改。

`speculo/.speculo/.config/LESSONS.md` 用于记录跨任务可复用的经验。workflow 收尾时，如果发现对后续任务有价值的经验，可以在用户允许或项目规则允许的情况下追加。

当前分发包默认提供轻量规则、经验、上下文和 ADR 目录。项目级术语表和 ADR 使用 `speculo/.speculo/.config/context/` 与 `speculo/.speculo/.config/adr/`；workflow 只有在用户确认后才写入这些路径。

`dev/D-docs-sync` 会基于 git diff、`speculo/.speculo/archive/` 和 `.config/` 生命周期审计同步 tracked assets。`RULES.md` 仍是用户维护资产：workflow 只提出建议，写入需要明确确认。需要清理过期 `.config` 文件时，先运行 `speculo/commands/config-prune.md` 的 dry-run 报告。
