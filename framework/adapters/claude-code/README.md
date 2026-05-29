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
- 运行 `/speculo-dev`、`/speculo-doc`、`/speculo-ops`，应分别进入对应 `00-INDEX.md` 导航。
- 运行 `/speculo-archive` 时，Claude 必须先列待归档清单并等待用户确认。

## 卸载

删除项目根的 `CLAUDE.md`、`AGENTS.md`、`.claude/commands/speculo-*.md` 即可。是否删除 `workflows/`、`commands/`、`skills/`、`adapters/` 与 `.speculo/` 取决于项目是否继续使用 Speculo。

## 文件说明

- `CLAUDE.md.example` — 复制到项目根的 `CLAUDE.md`，仅一行透传到 `AGENTS.md`，避免双写
- `.claude/commands/` — 复制到项目根的 `.claude/commands/`，注册 `/speculo-*` 触发命令
