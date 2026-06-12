# Project Rules

记录跨所有 Speculo workflow 必须遵守的项目硬约束。

本文件由用户维护。AI 可以读取并遵守，但不得自动修改，除非用户明确要求。

## Rules

- [TODO: 添加项目必须遵守的规则。]
- **Rule 0 — 持久化铁律：所有 Speculo workflow、command、skill 的输出和持久化内容，必须且只能存放在 `speculo/.speculo/` 目录中。绝对禁止写入 `temp/`、系统临时目录、项目根目录的 `.speculo/` 或其他任何非规范位置。**
- 所有 Speculo change 目录必须以 `YYYY-MM-DD-<kebab-name>` 命名（例：`2026-06-12-user-auth`）。
- 所有 Speculo command 产物目录必须以 `YYYY-MM-DD-<cmd-name>-<topic>` 命名。
