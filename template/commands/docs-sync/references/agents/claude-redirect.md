# CLAUDE.md Redirect Contract

## 规则

需要 Claude 适配且有独立 AGENTS 作用域的目录使用轻量导入文件，新增或明确归工具所有的 `CLAUDE.md` 内容为：

```
# CLAUDE.md

@AGENTS.md
```

此格式与 [`../agents-contract.md`](../agents-contract.md) 的规定一致（该契约为权威）：`AGENTS.md` 始终是唯一的权威代理手册，`CLAUDE.md` 永远只是宿主导入入口。

## 设计缘由

- Claude Code 会读取 `CLAUDE.md` 获取项目/模块级指令。
- 内容全部在 `AGENTS.md` 中，`CLAUDE.md` 只是入口指针。
- 零维护成本：`AGENTS.md` 更新时不需要同步 `CLAUDE.md`。

## 生成条件

- 目录有独立手册且需要 Claude 适配 → 生成 `CLAUDE.md`
- scripts-docs 同样按独立作用域和 Claude 适配需求判断，不无条件生成
- 目录已有多行非重定向 `CLAUDE.md` → 向用户确认后改写为重定向，原内容全量迁移到 `AGENTS.md`（处置与 agents-contract 一致）
- 目录已有精确匹配的工具生成桥接 → 可更新导入；用户修改或 owner 不明时保留并报告差异

## 不生成 CLAUDE.md 的目录

- 没有独立作用域约束且无需手册的目录
- 忽略目录（`node_modules` 等）
- `.git` 目录
- 任何已在 `.gitignore` 中的目录

## 文件格式

- 三行：`# CLAUDE.md` 标题、空行、@AGENTS.md 导入
- 无 frontmatter、无额外内容
- 文件以换行符结尾（POSIX 约定）
