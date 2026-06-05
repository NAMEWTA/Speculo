# Lint And Git

## Lint 命令

默认验证命令：

```bash
pnpm ai-hero-cli internal lint
```

如果项目文档或用户指定了其他命令，使用项目命令。

## Lint 规则摘要

linter 通常会检查：

- 每个练习都有子文件夹，例如 `problem/`、`solution/`、`explainer/`
- 至少存在 `problem/`、`explainer/` 或 `explainer.1/` 之一
- 主子文件夹中存在非空 `readme.md`
- 没有 `.gitkeep`
- 没有 `speaker-notes.md`
- `readme.md` 中没有失效链接
- `readme.md` 中没有 `pnpm run exercise`
- 每个含代码的子文件夹都有超过 1 行的 `main.ts`

## 修复流程

1. 运行 lint。
2. 根据错误补齐目录、`readme.md` 或需要的 `main.ts`。
3. 删除不允许的 `.gitkeep` 或 `speaker-notes.md`，但只删除本次创建或用户明确要求处理的文件。
4. 修复失效链接或记录需要用户确认的链接变更。
5. 重跑 lint，直到通过或出现外部阻塞。

## 移动或重命名练习

重新编号或移动练习时使用 `git mv`，保留 git 历史。

示例：

```bash
git mv exercises/01-retrieval/01.03-embeddings exercises/01-retrieval/01.04-embeddings
```

移动后更新数字前缀并重新运行 lint。

## 提交

只有用户或调用方明确要求提交时才运行 `git commit`。

提交前检查：

- `git status --short`
- 只包含本次练习脚手架相关改动，或提交命令明确指定路径
- lint 已通过，或 commit message/交付说明中写明未通过原因
