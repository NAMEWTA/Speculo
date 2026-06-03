# Claude Code Adapter

将 Speculo 接入 Claude Code 的开箱即用粘合层。

## 接入步骤

```bash
cp adapters/agents/AGENTS.md.example AGENTS.md
cp adapters/claude-code/CLAUDE.md.example CLAUDE.md
mkdir -p .claude
cp -R adapters/claude-code/.claude/commands .claude/
```

`CLAUDE.md` 只透传到 `AGENTS.md`，避免同一套行为规则维护两份。`.claude/commands/` 下的 `/speculo-*` 命令只作为快捷入口，实际执行规则仍以项目根的 `workflows/` 与 `commands/` 文档为准。

## 验证

- 在 Claude Code 中运行 `/speculo-status`，应读取 `commands/status.md`。
- 运行 `/speculo-dev`，应读取 `workflows/dev/00-INDEX.md` 并识别 `dev/01`、`dev/02`、`dev/03`、`dev/I`、`dev/H`。
- 运行 `/speculo-dev-i` 或 `/speculo-dev-h`，应分别进入垂直切片和 diagnose 入口。
- 运行 `/speculo-doc`、`/speculo-ops`，应进入当前预留的 doc/ops `00-INDEX.md`。
- 运行 `/speculo-archive` 时，Claude 必须先列待归档清单并等待用户确认。
- 运行 `/speculo-caveman`、`/speculo-grill-me`、`/speculo-handoff`、`/speculo-write-skill`、`/speculo-scaffold-exercises`，应读取对应 `commands/*.md`。

## 卸载

删除项目根的 `CLAUDE.md`、`AGENTS.md`、`.claude/commands/speculo-*.md` 即可。是否删除 `workflows/`、`commands/`、`skills/`、`adapters/` 与 `.speculo/` 取决于项目是否继续使用 Speculo。

## 文件说明

- `CLAUDE.md.example` — 复制到项目根的 `CLAUDE.md`，仅一行透传到 `AGENTS.md`，避免双写
- `.claude/commands/` — 复制到项目根的 `.claude/commands/`，注册 `/speculo-*` 触发命令
