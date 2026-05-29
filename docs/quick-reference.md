# Speculo 内置能力速查（使用者向）

一页速查：所有内置 workflow / command / adapter / skill 入口。

## Workflows

### dev
| ID | 入口 | 一句话用途 |
|----|------|----------|
| `dev/index` | `framework/workflows/dev/00-INDEX.md` | 智能导航 + 状态汇报 + 推荐下一步 |
| `dev/prd` | `framework/workflows/dev/01-prd/01-prd.md` | 需求定义与评审 |
| `dev/design` | `framework/workflows/dev/02-design/02-design.md` | 架构与 API 设计 |
| `dev/implement` | `framework/workflows/dev/03-implement/03-implement.md` | 编码实现，可拆任务 |
| `dev/test` | `framework/workflows/dev/04-test/04-test.md` | 单元与端到端测试 |
| `dev/review` | `framework/workflows/dev/05-review/05-review.md` | 代码与安全评审 |
| `dev/handoff` | `framework/workflows/dev/06-handoff/06-handoff.md` | 交接 doc/ops + 归档准备 |

### doc
| ID | 入口 | 一句话用途 |
|----|------|----------|
| `doc/index` | `framework/workflows/doc/00-INDEX.md` | 智能导航 + 状态汇报 + 推荐下一步 |
| `doc/readme` | `framework/workflows/doc/01-readme/01-readme.md` | README 撰写 |
| `doc/changelog` | `framework/workflows/doc/02-changelog/02-changelog.md` | Changelog 维护 |
| `doc/api-doc` | `framework/workflows/doc/03-api-doc/03-api-doc.md` | API 文档编写 |

### ops
| ID | 入口 | 一句话用途 |
|----|------|----------|
| `ops/index` | `framework/workflows/ops/00-INDEX.md` | 智能导航 + 状态汇报 + 推荐下一步 |
| `ops/release` | `framework/workflows/ops/01-release/01-release.md` | 发版流程 |
| `ops/deploy` | `framework/workflows/ops/02-deploy/02-deploy.md` | 部署与回滚 |
| `ops/monitor` | `framework/workflows/ops/03-monitor/03-monitor.md` | 发版后观测窗口 |
| `ops/incident` | `framework/workflows/ops/04-incident/04-incident.md` | 事故响应 |
| `ops/postmortem` | `framework/workflows/ops/05-postmortem/05-postmortem.md` | 事后复盘与 LESSONS 沉淀 |

## Commands

| ID | 入口 | 一句话用途 |
|----|------|----------|
| `status` | `framework/commands/status.md` | 按需聚合全局工作流状态 |
| `archive` | `framework/commands/archive.md` | 归档已完成变更（强制确认） |

## Adapters

| Adapter | 入口 | 用途 |
|---------|------|------|
| `agents` | `framework/adapters/agents/AGENTS.md.example` | 通用 AGENTS.md 生态 |
| `claude-code` | `framework/adapters/claude-code/CLAUDE.md.example` | Claude Code 透传到 AGENTS.md |
| `claude-code commands` | `framework/adapters/claude-code/.claude/commands/` | `/speculo-*` 快捷命令 |

## Skills

`framework/skills/` 当前为预留目录。新增 skill 必须使用 `framework/skills/<name>/SKILL.md` 作为入口，并保持自包含。
