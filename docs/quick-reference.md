# Speculo 内置能力速查（使用者向）

一页速查：所有内置 workflow / command / adapter / skill 入口。

## Workflows

### dev
| ID | 入口 | 一句话用途 |
|----|------|----------|
| `dev/index` | `framework/workflows/dev/00-INDEX.md` | 智能导航 + 状态汇报 + 推荐下一步 |
| `dev/grill-with-docs` | `framework/workflows/dev/01-grill-with-docs/01-grill-with-docs.md` | `dev/01`：领域术语、CONTEXT、ADR 与方案拷问 |
| `dev/prd` | `framework/workflows/dev/02-prd/02-prd.md` | `dev/02`：zoom-out 全景理解与 PRD 综合 |
| `dev/tdd` | `framework/workflows/dev/03-tdd/03-tdd.md` | `dev/03`：垂直切片 TDD 实现 |
| `dev/to-issues` | `framework/workflows/dev/04-to-issues/04-to-issues.md` | `dev/I`：垂直切片 issue 分解，可嵌入其他 dev workflow |
| `dev/diagnose` | `framework/workflows/dev/05-diagnose/05-diagnose.md` | `dev/H`：hotfix / bug / 性能回退诊断 |

### doc
| ID | 入口 | 一句话用途 |
|----|------|----------|
| `doc/index` | `framework/workflows/doc/00-INDEX.md` | 文档工作流预留导航入口 |

### ops
| ID | 入口 | 一句话用途 |
|----|------|----------|
| `ops/index` | `framework/workflows/ops/00-INDEX.md` | 运维工作流预留导航入口 |

## Commands

| ID | 入口 | 一句话用途 |
|----|------|----------|
| `status` | `framework/commands/status.md` | 按需聚合全局工作流状态 |
| `archive` | `framework/commands/archive.md` | 归档已完成变更（强制确认） |
| `caveman` | `framework/commands/caveman.md` | 启用或关闭超压缩沟通模式 |
| `grill-me` | `framework/commands/grill-me.md` | 对计划或设计进行逐问式压力测试 |
| `handoff` | `framework/commands/handoff.md` | 生成脱敏交接文档 |
| `write-a-skill` | `framework/commands/write-a-skill.md` | 创建或审查新的 Speculo skill 草稿 |
| `scaffold-exercises` | `framework/commands/scaffold-exercises.md` | 创建课程练习目录骨架并运行练习 lint |

## Adapters

| Adapter | 入口 | 用途 |
|---------|------|------|
| `agents` | `framework/adapters/agents/AGENTS.md.example` | 通用 AGENTS.md 生态 |
| `claude-code` | `framework/adapters/claude-code/CLAUDE.md.example` | Claude Code 透传到 AGENTS.md |
| `claude-code commands` | `framework/adapters/claude-code/.claude/commands/` | `/speculo-*` 快捷命令 |

## Skills

指定技能已通过 Speculo wrapper 接入。每个 wrapper 位于 `framework/skills/<name>/SKILL.md`，原始技能内容完整保存在同目录 `source/` 下，不直接修改。

| ID | 入口 | 一句话用途 |
|----|------|----------|
| `diagnose` | `framework/skills/diagnose/SKILL.md` | 诊断 Bug、异常和性能回退 |
| `grill-with-docs` | `framework/skills/grill-with-docs/SKILL.md` | 结合 CONTEXT/ADR 拷问方案 |
| `tdd` | `framework/skills/tdd/SKILL.md` | 红绿重构 TDD 实现 |
| `to-issues` | `framework/skills/to-issues/SKILL.md` | 垂直切片 issue 分解 |
| `to-prd` | `framework/skills/to-prd/SKILL.md` | 从当前上下文综合 PRD |
| `zoom-out` | `framework/skills/zoom-out/SKILL.md` | 拉高视角理解模块全景 |
| `caveman` | `framework/skills/caveman/SKILL.md` | 超压缩沟通模式 |
| `grill-me` | `framework/skills/grill-me/SKILL.md` | 逐问式压力测试 |
| `handoff` | `framework/skills/handoff/SKILL.md` | 生成交接文档 |
| `write-a-skill` | `framework/skills/write-a-skill/SKILL.md` | 创建 Agent skill |
| `scaffold-exercises` | `framework/skills/scaffold-exercises/SKILL.md` | 创建练习目录骨架 |
