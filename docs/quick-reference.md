# Speculo 内置能力速查（使用者向）

一页速查：所有内置 workflow、command、skill 和 CLI 入口。

## CLI

| 命令 | 用途 |
|------|------|
| `speculo init [target]` | 安装到 `speculo/` 目录下（`speculo/{.speculo,commands,skills,workflows}/`）；冲突时失败，不覆盖 |
| `speculo update [target]` | 覆盖 `speculo/` 下的 `commands/`、`skills/`、`workflows/`；保留 `speculo/.speculo/` 状态和配置 |

## Workflows

### dev

| ID | 入口 | 一句话用途 |
|----|------|----------|
| `dev/index` | `workflows/dev/00-INDEX.md` | 智能导航 + 状态汇报 + 推荐下一步 |
| `dev/grill-with-docs` | `workflows/dev/01-grill-with-docs/01-grill-with-docs.md` | `dev/01`：领域术语、CONTEXT、ADR 与方案拷问 |
| `dev/prd` | `workflows/dev/02-prd/02-prd.md` | `dev/02`：zoom-out 全景理解与 PRD 综合 |
| `dev/tdd` | `workflows/dev/03-tdd/03-tdd.md` | `dev/03`：垂直切片 TDD 实现 |
| `dev/finalize` | `workflows/dev/04-finalize/04-finalize.md` | `dev/04`：完成前验证、状态收尾与归档 |
| `dev/I-to-issues` | `workflows/dev/I-to-issues/I-to-issues.md` | `dev/I`：垂直切片 issue 分解，可嵌入其他 dev workflow |
| `dev/H-diagnose` | `workflows/dev/H-diagnose/H-diagnose.md` | `dev/H`：hotfix / bug / 性能回退诊断 |
| `dev/R-review` | `workflows/dev/R-review/R-review.md` | `dev/R`：Spec / Engineering / Standards 三维度 diff 审查 |
| `dev/D-docs-sync` | `workflows/dev/D-docs-sync/D-docs-sync.md` | `dev/D`：基于 git diff 同步对外文档 |

### doc

| ID | 入口 | 一句话用途 |
|----|------|----------|
| `doc/index` | `workflows/doc/00-INDEX.md` | 文档写作、塑形、编辑与素材管理导航 |
| `doc/M-mao-zedong-cognitive-os` | `workflows/doc/M-mao-zedong-cognitive-os/M-mao-zedong-cognitive-os.md` | `doc/M`：以毛泽东方法论为底座的认知咨询 |
| `doc/teach` | `workflows/doc/T-teach/T-teach.md` | `doc/T`：设计交互式课程：使命→资源→课程→参考→记录 |
| `doc/writing-fragments` | `workflows/doc/F-writing-fragments/F-writing-fragments.md` | `doc/F`：追问式访谈采集 fragment 素材 |
| `doc/writing-beats` | `workflows/doc/B-writing-beats/B-writing-beats.md` | `doc/B`：逐个 beat 推进文章旅程 |
| `doc/writing-shape` | `workflows/doc/S-writing-shape/S-writing-shape.md` | `doc/S`：读取素材堆并塑造成文章 |
| `doc/edit-article` | `workflows/doc/E-edit-article/E-edit-article.md` | `doc/E`：重组章节并逐节编辑文章 |

## Commands

| ID | 入口 | 一句话用途 |
|----|------|----------|
| `status` | `commands/status.md` | 按需聚合全局工作流状态 |
| `archive` | `commands/archive.md` | 归档已完成变更（强制确认） |
| `caveman` | `commands/caveman.md` | 启用或关闭超压缩沟通模式 |
| `grill-me` | `commands/grill-me.md` | 对计划或设计进行逐问式压力测试 |
| `handoff` | `commands/handoff.md` | 生成脱敏交接文档 |
| `write-a-skill` | `commands/write-a-skill.md` | 创建或审查新的 Speculo skill 草稿 |
| `retro` | `commands/retro.md` | 复盘 Speculo 使用痛点，确认后用 gh 提改进 issue |
| `scaffold-exercises` | `commands/scaffold-exercises.md` | 创建课程练习目录骨架并运行练习 lint |

## Skills

根 `skills/` 保留 command 或 workflow 需要直接调用的可复用原子能力。dev workflow 专属方法已经融合进各自 workflow 目录。

| ID | 入口 | 一句话用途 |
|----|------|----------|
| `caveman` | `skills/caveman/SKILL.md` | 超压缩沟通模式 |
| `grill-me` | `skills/grill-me/SKILL.md` | 逐问式压力测试 |
| `handoff` | `skills/handoff/SKILL.md` | 生成交接文档 |
| `scaffold-exercises` | `skills/scaffold-exercises/SKILL.md` | 创建练习目录骨架 |
| `github-npm-ops` | `skills/github-npm-ops/SKILL.md` | GitHub 运营、npm 发布、release workflow 与失败恢复 |
| `speculo-write` | `skills/speculo-write/SKILL.md` | 创建或改造 Speculo workflow、skill、command |
| `speculo-retro` | `skills/speculo-retro/SKILL.md` | 复盘 Speculo 使用痛点并产出 issue-ready 改进提案 |
