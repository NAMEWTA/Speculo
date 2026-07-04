# Speculo State AGENTS Guide

本目录是 Speculo 运行时状态、项目知识和归档的唯一持久化根目录。所有 workflow、command 和 skill 调用方写入的持久化产物必须留在 `speculo/.speculo/` 内。

## 读取顺序

1. 先读目标分类索引：`dev-status.json`、`doc-status.json` 或 `person-status.json`。
2. 再按 active 条目读取对应 change 的 `.status.json`：`<cat>/<change>/.status.json`。
3. 需要 workflow 产物时，只读取当前 change 目录下与当前 phase 相关的文件。
4. 需要历史上下文时，读取 `archive/AGENTS.md` 后再扫描归档目录。
5. 需要项目规则、经验、领域术语或 ADR 时，读取 `.config/` 下对应文件；`RULES.md` 默认由用户维护，不自动改写。

> **配置优先：** 执行任何 workflow、command 或 skill 时，只要涉及项目硬约束、跨任务经验、领域上下文、术语定义、ADR 或决策依据，必须优先参考 `.config/` 下的内容；其中 `RULES.md` 的约束高于普通 workflow 文案。只有在用户明确要求或项目规则允许时，才可写入 `.config/`。

## 目录职责

| 路径 | 职责 |
|------|------|
| `<cat>-status.json` | 当前 active change 的薄索引，可由 `<cat>/<change>/.status.json` 重建 |
| `<cat>/<change>/` | 当前 change 的 workflow 产物和 `.status.json` |
| `commands/` | command 产生的报告、快照和一次性操作记录 |
| `.config/` | 项目规则、经验、context 和 ADR |
| `archive/` | completed change 的历史归档 |

## 写入边界

- 新 change 目录必须为 `YYYY-MM-DD-<kebab-name>`。
- command 产物目录必须为 `YYYY-MM-DD-<cmd-name>-<topic>`。
- 不要把状态写到项目根目录的裸 `.speculo/`、`temp/` 或系统临时目录。
- 不要把 archive 当作当前工作目录；需要恢复或迁移历史产物时，先明确说明目标和影响。
