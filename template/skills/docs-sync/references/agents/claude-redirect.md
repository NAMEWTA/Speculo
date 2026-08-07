# CLAUDE.md Redirect Contract

## 规则

每个 manifest 目录的 `CLAUDE.md` 是轻量重定向文件，内容固定为：

```
# CLAUDE.md

Speculo agent handbook: see [AGENTS.md](./AGENTS.md).
```

此格式与 [`../agents-contract.md`](../agents-contract.md) 的规定一致（该契约为权威）：`AGENTS.md` 始终是唯一的权威代理手册，`CLAUDE.md` 永远只是入口指针。

## 设计缘由

- Claude Code 会读取 `CLAUDE.md` 获取项目/模块级指令。
- 内容全部在 `AGENTS.md` 中，`CLAUDE.md` 只是入口指针。
- 零维护成本：`AGENTS.md` 更新时不需要同步 `CLAUDE.md`。

## 生成条件

- 目录有 manifest 文件 → 生成 `CLAUDE.md`
- 目录是 scripts-docs → 生成 `CLAUDE.md`
- 目录已有多行非重定向 `CLAUDE.md` → 向用户确认后改写为重定向，原内容全量迁移到 `AGENTS.md`（处置与 agents-contract 一致）
- 目录已有重定向 `CLAUDE.md` → 可覆盖（保持最新格式）

## 不生成 CLAUDE.md 的目录

- 无 manifest 目录 → 这些目录本就不该有 AGENTS.md
- 忽略目录（`node_modules` 等）
- `.git` 目录
- 任何已在 `.gitignore` 中的目录

## 文件格式

- 三行：`# CLAUDE.md` 标题、空行、一句英文重定向
- 无 frontmatter、无额外内容
- 文件以换行符结尾（POSIX 约定）
