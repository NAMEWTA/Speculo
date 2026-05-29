# Speculo 全目录覆盖率快照

> 生成时间：2026-05-29T12:00:00+08:00
> 任务参考：基于 `temp/project/` 参考框架提炼重写后的全项目补齐结果
> 关联文档：[`inspiration-trace.md`](./inspiration-trace.md)

## 1. 工作流覆盖矩阵

| 分类 | Phase | 入口文件 | 子规范数 | 模板数 | 状态 |
|------|-------|---------|---------|--------|------|
| dev | 01-prd | `framework/workflows/dev/01-prd/01-prd.md` | 2 | 2 | 可执行 |
| dev | 02-design | `framework/workflows/dev/02-design/02-design.md` | 2 | 2 | 可执行 |
| dev | 03-implement | `framework/workflows/dev/03-implement/03-implement.md` | 2 | 2 | 可执行 |
| dev | 04-test | `framework/workflows/dev/04-test/04-test.md` | 2 | 2 | 可执行 |
| dev | 05-review | `framework/workflows/dev/05-review/05-review.md` | 2 | 2 | 可执行 |
| dev | 06-handoff | `framework/workflows/dev/06-handoff/06-handoff.md` | 1 | 1 | 可执行 |
| doc | 01-readme | `framework/workflows/doc/01-readme/01-readme.md` | 1 | 1 | 可执行 |
| doc | 02-changelog | `framework/workflows/doc/02-changelog/02-changelog.md` | 1 | 1 | 可执行 |
| doc | 03-api-doc | `framework/workflows/doc/03-api-doc/03-api-doc.md` | 2 | 2 | 可执行 |
| ops | 01-release | `framework/workflows/ops/01-release/01-release.md` | 1 | 1 | 可执行 |
| ops | 02-deploy | `framework/workflows/ops/02-deploy/02-deploy.md` | 2 | 2 | 可执行 |
| ops | 03-monitor | `framework/workflows/ops/03-monitor/03-monitor.md` | 1 | 1 | 可执行 |
| ops | 04-incident | `framework/workflows/ops/04-incident/04-incident.md` | 1 | 1 | 可执行 |
| ops | 05-postmortem | `framework/workflows/ops/05-postmortem/05-postmortem.md` | 1 | 1 | 可执行 |

## 2. 命令与适配器覆盖

| 区域 | 文件/目录 | 状态 | 说明 |
|------|----------|------|------|
| commands | `framework/commands/status.md` | 可执行 | 聚合 dev/doc/ops 索引与 active change 状态 |
| commands | `framework/commands/archive.md` | 可执行 | 强制确认后归档 completed change |
| adapters | `framework/adapters/agents/AGENTS.md.example` | 可复制 | 通用 AGENTS.md 入口 |
| adapters | `framework/adapters/claude-code/CLAUDE.md.example` | 可复制 | Claude Code 透传入口 |
| adapters | `framework/adapters/claude-code/.claude/commands/speculo-*.md` | 可复制 | Claude Code 快捷命令入口 |
| state | `framework/.speculo/{dev,doc,ops}-status.json` | 可解析 | 初始 `active` 为空 |

## 3. 当前验证口径

| 检查项 | 期望 |
|--------|------|
| JSON | `framework/.speculo/**/*.json` 全部可解析 |
| v2.1 frontmatter | workflow 不出现 `phases` / `template` / `uses_skills` / `depends_on` / `status_extensions` 字段 |
| 正文章节 | 每个 workflow 入口都有 `## 阶段` / `## 依赖` / `## 状态扩展字段` / `## 完成与状态更新` |
| TODO | 非模板文件不残留无说明占位符；模板 TODO 必须是 `[TODO: ...]` |
| 路径 | workflow/docs 中不出现绝对 Markdown 链接 |
| 接入 | `cp -R framework/. <project>/` 后 `.speculo/` 必须存在 |

## 4. 仍然保留的有意占位

- `framework/.speculo/.config/*.example` 保留 `[TODO: ...]`，供用户激活后填写项目事实。
- `framework/workflows/*/_templates/*.md` 保留 `[TODO: ...]`，供 workflow 生成产物时整块覆盖。
- `framework/commands/*` 的内联产物模板保留 `[TODO: ...]`，供 command 产物生成时覆盖。
