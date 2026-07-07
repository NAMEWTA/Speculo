# Speculo Architecture

**版本：** v2.6
**更新日期：** 2026-07-03
**核心原则：** 工具无关 · CLI 接入 · workflow 自治

## 设计理念

Speculo 是一个 SDD（Specification-Driven Development for AI）框架：以结构化文档作为单一真相来源，通过物理目录和渐进披露组织 AI Coding 的 workflow、command、skill 与持久化产物。

核心原则：

- **工具无关**：框架资产是普通 Markdown 和 JSON 状态文件，不绑定某个 AI Coding 工具的私有机制。
- **CLI 接入**：用户通过 `speculo init` 安装资产；若 `speculo/` 已存在则自动进入更新模式，覆盖 commands/skills/workflows、按模式处理 vendor，并保留 .speculo/ 用户状态。
- **薄契约 + workflow 自治**：框架只规定最小 frontmatter、`.status.json` 元字段和目录边界；每个 workflow 自行规定阶段、产物和扩展字段。
- **产物持久化**：每次执行以 change 为单位归档到 `speculo/.speculo/`，可追踪、可索引、可归档。

## 仓库分层

```text
Speculo/
├── docs/                     # 框架文档
├── src/                      # CLI 源码
├── test/                     # CLI 测试
└── template/                 # 包内资产源
    ├── commands/
    ├── skills/
    ├── workflows/
    ├── vendor/
    └── .speculo/
```

`template/` 是 CLI 的资产源。安装到用户项目后，资产统一收纳在目标项目根目录的 `speculo/` 子目录下：

```text
my-project/
└── speculo/
    ├── commands/
    ├── workflows/
    ├── skills/
    ├── vendor/
    └── .speculo/
```

## CLI 契约

### `speculo init [target]`

若目标项目的 `speculo/` 目录不存在，则执行全新安装，复制包内全部 5 项资产：

- `template/.speculo` -> `<target>/speculo/.speculo`
- `template/commands` -> `<target>/speculo/commands`
- `template/skills` -> `<target>/speculo/skills`
- `template/workflows` -> `<target>/speculo/workflows`
- `template/vendor` -> `<target>/speculo/vendor`

若目标路径已存在，命令失败并列出冲突，不覆盖。

若目标项目的 `speculo/` 目录已存在，则自动进入更新模式，覆盖以下 3 项框架资产，并按模式处理 `vendor/`：

- `<target>/speculo/commands`
- `<target>/speculo/skills`
- `<target>/speculo/workflows`

更新模式不复制 `.speculo`，不修改用户项目根目录下的任意文档，也不删除 `speculo/.speculo/` 状态、产物或配置。`vendor/` 在 `--all` 时覆盖刷新；默认更新时只增量合并缺失技能。

## 构件边界

| 维度 | `commands/` | `workflows/` | `skills/` | `agents/` |
|------|-------------|--------------|-----------|-----------|
| 文件形态 | 单 `.md` 文件 | 文件夹 + 阶段文件 + 模板 | 文件夹 + `SKILL.md` + 渐进披露子目录 | 单 `.md` subagent 定义 |
| 适用场景 | 一次性独立动作 | 多阶段业务交付 | command 可调用的复用能力 | workflow phase 隔离执行 |
| 持久化责任 | 写 `.speculo/commands/` | 写 `.speculo/<cat>/<change>/` | 不直接写 `.speculo/` | 不直接写 `.speculo/`（写 phase 产物） |
| 当前内置 | status/archive/config-prune/生产力命令 | dev + doc + person 工作流 | command / workflow 可调用的能力 | 03-tdd、R-review、04-finalize、H-diagnose、D-docs-sync |

## Workflow Agents

适合隔离执行、并行审查或反自证验证的 phase 可在 workflow 目录下定义 `agents/<name>-agent.md`。Agent 是框架资产（非运行时产物），引用同目录 phase 文件而不复制大段规范，只写它声明的 phase 产物和 `.status.json` 扩展字段，不写 `change_status`。规范见 `docs/persistence-contract.md` §13。

当前内置 agents：

- `dev/03-tdd/agents/`：`tdd-plan-agent`、`tdd-implement-agent`、`tdd-finish-agent`
- `dev/R-review/agents/`：`spec-review-agent`、`engineering-review-agent`、`standards-review-agent`
- `dev/04-finalize/agents/`：`completion-gate-agent`
- `dev/H-diagnose/agents/`：`diagnose-agent`、`fix-agent`
- `dev/D-docs-sync/agents/`：`docs-diff-agent`、`docs-update-agent`

## Dev Workflow

```text
workflows/dev/
├── AGENTS.md
├── 01-grill-with-docs/
├── 02-prd/
├── 03-tdd/
├── 04-finalize/
├── I-to-issues/
├── H-diagnose/
├── R-review/
├── M-domain-modeling/
├── A-improve-architecture/
├── D-docs-sync/
└── _templates/
```

入口别名：

- `dev/01`：领域澄清与决策拷问
- `dev/02`：全景理解与 PRD
- `dev/I`：垂直切片 issue 分解
- `dev/03`：TDD 实现
- `dev/04`：完成前验证、状态收尾与归档
- `dev/H`：Bug、异常、性能回退诊断
- `dev/R`：Spec / Engineering / Standards 三维度 diff 审查
- `dev/M`：主动领域建模，维护 CONTEXT 通用语言与 ADR
- `dev/A`：架构深化机会扫描、HTML 审查报告与候选质询
- `dev/D`：基于 git diff、归档产物和 `.config` 生命周期的文档/知识资产同步

默认执行模式：

- `full`：`dev/01` -> `dev/02` -> `dev/I` -> `dev/03` -> `dev/04`
- `planning-only`：`dev/01` -> `dev/02` -> `dev/I`
- `implementation-only`：已有 PRD、issue 或明确任务时，从 `dev/03` 开始
- `hotfix`：从 `dev/H` 开始，修复阶段可嵌入 `dev/03`
- `review`：从 `dev/R` 开始
- `domain-modeling`：从 `dev/M` 开始
- `improve-architecture`：从 `dev/A` 开始
- `finalize`：实现完成需验证收尾与归档时，从 `dev/04` 开始
- `docs-sync`：从 `dev/D` 开始

## Doc Workflow

```text
workflows/doc/
├── AGENTS.md
├── T-teach/
├── F-writing-fragments/
├── B-writing-beats/
├── S-writing-shape/
├── E-edit-article/
└── _templates/
```

入口别名：

- `doc/T`：设计交互式课程：使命→资源→课程→参考→记录
- `doc/F`：追问式访谈采集 fragment 素材
- `doc/B`：逐个 beat 推进文章旅程
- `doc/S`：读取素材堆并塑造成文章
- `doc/E`：章节确认后逐节编辑文章

## Person Workflow

```text
workflows/person/
├── AGENTS.md
├── M-mao-zedong-cognitive-os/
└── _templates/
```

入口别名：

- `person/M`：以毛泽东方法论为底座的认知咨询

## 持久化模型

每个 change 有一份真相源。**Change 目录名必须为 `YYYY-MM-DD-<kebab-name>`**（权威定义见 `docs/persistence-contract.md` §0）：

```text
speculo/.speculo/dev/2026-06-03-user-auth/.status.json
speculo/.speculo/doc/2026-06-05-article-draft/.status.json
speculo/.speculo/person/2026-06-05-strategy-consult/.status.json
```

不带日期前缀的目录名是无效的——AI 代理扫描时将其标记为 `malformed` 并汇报用户。

Command 产物目录同理，必须为 `YYYY-MM-DD-<cmd-name>-<topic>`；归档目标必须为 `archive/<cat>/<YYYY-MM>/<change-name>/`。

顶层索引只保存 active 摘要：

```json
{
  "active": [
    {
      "name": "2026-06-03-user-auth",
      "current_phase": "prd",
      "updated_at": "2026-06-03T10:00:00Z"
    }
  ]
}
```

索引可重建；归档历史通过 `.speculo/archive/` 扫描。

## 写入责任

| 路径 | 写入者 | 说明 |
|------|--------|------|
| `speculo/.speculo/.config/RULES.md` | 用户 | 项目硬约束，AI 不自动修改 |
| `speculo/.speculo/.config/LESSONS.md` | 用户 / workflow | 跨任务经验库，workflow 末尾可追加 |
| `speculo/.speculo/.config/context/` | 用户 / workflow | 项目术语表和上下文映射，需用户确认后写入 |
| `speculo/.speculo/.config/adr/` | 用户 / workflow | 项目 ADR，需用户确认后写入 |
| `speculo/.speculo/<cat>/<change>/*.md` | workflow | 当前 change 产物 |
| `speculo/.speculo/<cat>/<change>/.status.json` | workflow | 当前 change 状态 |
| `speculo/.speculo/*-status.json` | workflow/command | active 索引 |
| `speculo/.speculo/dev/docs-sync-state.json` | `dev/D-docs-sync` | tracked assets 与 git diff 基线 |
| `speculo/.speculo/archive/` | `commands/archive.md` / `dev/04-finalize` | 已完成 change 归档 |

## 版本记录

| 版本 | 日期 | 摘要 |
|------|------|------|
| v2.7 | 2026-07-07 | 新增 workflow `agents/` subagent 规范；统一 phase 机器 id 与续跑协议；handoff 持久化边界；config-prune 审计规则拆分 |
| v2.5 | 2026-06-12 | CLI `init` / `update` 合并为统一的 `speculo init`：自动检测 `speculo/` 是否存在，不存在则全新安装，已存在则更新 commands/skills/workflows 并保留 .speculo/ |
| v2.4 | 2026-06-06 | 新增 dev/04 finalize 收尾归档工作流（内化完成前验证铁律）；dev/R review 升级为 Spec / Engineering / Standards 三维度 + P0–P3 严重度 + 裁决，融合 code-review-expert 深度清单 |
| v2.3 | 2026-06-05 | 新增 doc 横向工作流；新增 dev/R review 与 dev/D docs-sync；新增 github-npm-ops 原子 skill；CONTEXT、ADR 与 docs-sync state 收敛到 `.speculo/` |
| v2.2 | 2026-06-03 | 移除工具适配层；新增 CLI `init` / `update` 双命令；dev workflow-only skills 深度融合进 workflow；`dev/I`、`dev/H` 改为横向字母入口；`.speculo/.config` 收敛为 `RULES.md` 与 `LESSONS.md` |
| v2.1 | 2026-05-28 | 定义 frontmatter 契约、`.status.json` 元字段和 workflow 自治 |
