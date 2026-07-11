# CLAUDE.md Redirect Contract

## 规则

每个 manifest 目录的 `CLAUDE.md` **有且只有一行**：

```
读取同层级的AGENTS.md文档。
```

## 设计缘由

- Claude Code 会读取 `CLAUDE.md` 获取项目/模块级指令。
- 如果 `CLAUDE.md` 已有内容，不应覆盖。
- 如果 `CLAUDE.md` 不存在，生成一行重定向。
- 内容全部在 `AGENTS.md` 中，`CLAUDE.md` 只是入口指针。
- 零维护成本：`AGENTS.md` 更新时不需要同步 `CLAUDE.md`。

## 生成条件

- 目录有 manifest 文件 → 生成 `CLAUDE.md`
- 目录是 scripts-docs → 生成 `CLAUDE.md`
- 目录已有 `CLAUDE.md` 且内容 > 1 行 → **不覆盖**，汇报用户
- 目录已有 `CLAUDE.md` 且内容 = 1 行重定向 → 可覆盖（保持最新）

## 不生成 CLAUDE.md 的目录

- 无 manifest 目录 → 这些目录本就不该有 AGENTS.md
- 忽略目录（`node_modules` 等）
- `.git` 目录
- 任何已在 `.gitignore` 中的目录

## 文件格式

```
读取同层级的AGENTS.md文档。
```

- 无 frontmatter
- 无标题
- 无额外内容
- 无换行（只有一行文本）
- 文件以换行符结尾（POSIX 约定）
