# AGENTS.md Adapter

通用 AGENTS.md 生态适配器，覆盖 Cursor / Aider / Codex / Cline / Continue 等所有读 `AGENTS.md` 的 AI 工具。

## 接入步骤

```bash
cp adapters/agents/AGENTS.md.example AGENTS.md
```

复制后按项目情况补充 `AGENTS.md` 顶部的项目简介即可。Speculo 的工作流入口、状态约定和归档边界已经写在 example 中，不需要为不同工具维护多份规则。

## 验证

- 打开任意支持 `AGENTS.md` 的 AI Coding 工具，询问“当前 Speculo 状态是什么”。
- 正确行为：AI 先读取 `commands/status.md`，再读取 `.speculo/*-status.json`。
- 做开发任务时，AI 应先读取 `workflows/dev/00-INDEX.md`，再按 `dev/01`、`dev/02`、`dev/03`、`dev/I`、`dev/H` 选择入口。
- 若工具未自动读取 `AGENTS.md`，在会话开头显式要求“请先读取项目根 AGENTS.md”。
