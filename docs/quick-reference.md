# Speculo 内置能力速查（使用者向）

一页速查：所有内置 workflow、command、skill 和 CLI 入口。

## CLI

| 命令 | 用途 |
|------|------|
| `speculo init [target]` | 安装 `.speculo/`、`commands/`、`skills/`、`workflows/`；冲突时失败，不覆盖 |
| `speculo update [target]` | 覆盖 `commands/`、`skills/`、`workflows/`；保留 `.speculo/` 状态和配置 |

## Workflows

### dev

| ID | 入口 | 一句话用途 |
|----|------|----------|
| `dev/index` | `workflows/dev/00-INDEX.md` | 智能导航 + 状态汇报 + 推荐下一步 |
| `dev/grill-with-docs` | `workflows/dev/01-grill-with-docs/01-grill-with-docs.md` | `dev/01`：领域术语、CONTEXT、ADR 与方案拷问 |
| `dev/prd` | `workflows/dev/02-prd/02-prd.md` | `dev/02`：zoom-out 全景理解与 PRD 综合 |
| `dev/tdd` | `workflows/dev/03-tdd/03-tdd.md` | `dev/03`：垂直切片 TDD 实现 |
| `dev/I-to-issues` | `workflows/dev/I-to-issues/I-to-issues.md` | `dev/I`：垂直切片 issue 分解，可嵌入其他 dev workflow |
| `dev/H-diagnose` | `workflows/dev/H-diagnose/H-diagnose.md` | `dev/H`：hotfix / bug / 性能回退诊断 |

## Commands

| ID | 入口 | 一句话用途 |
|----|------|----------|
| `status` | `commands/status.md` | 按需聚合全局工作流状态 |
| `archive` | `commands/archive.md` | 归档已完成变更（强制确认） |
| `caveman` | `commands/caveman.md` | 启用或关闭超压缩沟通模式 |
| `grill-me` | `commands/grill-me.md` | 对计划或设计进行逐问式压力测试 |
| `handoff` | `commands/handoff.md` | 生成脱敏交接文档 |
| `write-a-skill` | `commands/write-a-skill.md` | 创建或审查新的 Speculo skill 草稿 |
| `scaffold-exercises` | `commands/scaffold-exercises.md` | 创建课程练习目录骨架并运行练习 lint |

## Skills

根 `skills/` 只保留 command 会直接调用的可复用能力。dev workflow 使用到的原子方法已经融合进各自 workflow 目录。

| ID | 入口 | 一句话用途 |
|----|------|----------|
| `caveman` | `skills/caveman/SKILL.md` | 超压缩沟通模式 |
| `grill-me` | `skills/grill-me/SKILL.md` | 逐问式压力测试 |
| `handoff` | `skills/handoff/SKILL.md` | 生成交接文档 |
| `write-a-skill` | `skills/write-a-skill/SKILL.md` | 创建 Agent skill |
| `scaffold-exercises` | `skills/scaffold-exercises/SKILL.md` | 创建练习目录骨架 |
