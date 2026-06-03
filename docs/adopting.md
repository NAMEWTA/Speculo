# 接入 Speculo（使用者向）

本文档面向**框架使用者**：你想把 Speculo 接入自己的项目，让 AI Coding 工具按统一 workflow、command 和 `.speculo/` 状态契约工作。

## 快速接入

```bash
# 1. 复制 speculo。使用 speculo/. 才会包含 .speculo/ 点目录。
mkdir -p my-project
cp -R Speculo/speculo/. my-project/

# 2. 复制通用 AGENTS.md 规则
cp my-project/adapters/agents/AGENTS.md.example my-project/AGENTS.md

# 3. Claude Code 额外接入
cp my-project/adapters/claude-code/CLAUDE.md.example my-project/CLAUDE.md
mkdir -p my-project/.claude
cp -R my-project/adapters/claude-code/.claude/commands my-project/.claude/

# 4. 激活默认配置（按需挑选）
cd my-project/.speculo/.config
mv RULES.md.example RULES.md
mv ARCHITECTURE.md.example ARCHITECTURE.md
# 其他 .example 按需激活
```

## 接入后的目录

```
my-project/
├── AGENTS.md
├── CLAUDE.md                  # 仅 Claude Code 需要
├── .claude/commands/          # 仅 Claude Code 需要
├── workflows/
│   ├── dev/
│   ├── doc/                    # 预留入口
│   └── ops/                    # 预留入口
├── commands/
├── skills/
└── .speculo/
    ├── .config/
    ├── dev-status.json
    ├── dev/
    ├── commands/
    └── archive/
```

## 第一次使用

1. 不确定从哪开始：让 AI 读取 `workflows/dev/00-INDEX.md`、`workflows/doc/00-INDEX.md` 或 `workflows/ops/00-INDEX.md`。
2. 查看当前状态：让 AI 执行 `commands/status.md`。
3. 做开发任务：从 `workflows/dev/00-INDEX.md` 进入，按 `dev/01`、`dev/02`、`dev/03`、`dev/I`、`dev/H` 推荐下一步。
4. 写文档：从 `workflows/doc/00-INDEX.md` 进入；当前 doc 分类为预留入口，可按 `docs/workflow-authoring.md` 扩展。
5. 发版/部署/事故：从 `workflows/ops/00-INDEX.md` 进入；当前 ops 分类为预留入口，可按 `docs/workflow-authoring.md` 扩展。
6. 归档完成的 change：执行 `commands/archive.md`；AI 必须先列清单并等待用户确认。

## 常见问题

### 为什么不能用 `cp -R speculo/* my-project/`？

因为 shell 的 `*` 默认不包含 `.speculo/` 这样的点目录。必须复制 `speculo/.`，否则状态骨架不会进入项目。

### 要不要把 `docs/` 复制到业务项目？

通常不用。`docs/` 是 Speculo 框架维护文档；业务项目只需要复制 `speculo/` 的内容。

### 可以只使用 AGENTS.md，不用 Claude adapter 吗？

可以。Claude adapter 只是给 Claude Code 增加 `/speculo-*` 快捷命令；核心规则在 `AGENTS.md` 与 `speculo/` 文档中。
