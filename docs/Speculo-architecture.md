# Speculo Architecture

**版本：** v2.3  
**更新日期：** 2026-06-05  
**核心原则：** 工具无关 · CLI 接入 · workflow 自治

## 设计理念

Speculo 是一个 SDD（Specification-Driven Development for AI）框架：以结构化文档作为单一真相来源，通过物理目录和渐进披露组织 AI Coding 的 workflow、command、skill 与持久化产物。

核心原则：

- **工具无关**：框架资产是普通 Markdown 和 JSON 状态文件，不绑定某个 AI Coding 工具的私有机制。
- **CLI 接入**：用户通过 `speculo init` 安装资产，通过 `speculo update` 更新框架资产。
- **薄契约 + workflow 自治**：框架只规定最小 frontmatter、`.status.json` 元字段和目录边界；每个 workflow 自行规定阶段、产物和扩展字段。
- **产物持久化**：每次执行以 change 为单位归档到 `.speculo/`，可追踪、可索引、可归档。

## 仓库分层

```text
Speculo/
├── docs/                     # 框架文档
├── src/                      # CLI 源码
├── test/                     # CLI 测试
└── speculo/                  # 包内资产源
    ├── commands/
    ├── workflows/
    ├── skills/
    └── .speculo/
```

`speculo/` 是 CLI 的资产源。安装到用户项目后，资产统一收纳在目标项目根目录的 `speculo/` 子目录下：

```text
my-project/
└── speculo/
    ├── commands/
    ├── workflows/
    ├── skills/
    └── .speculo/
```

## CLI 契约

### `speculo init [target]`

复制包内资产到目标项目的 `speculo/` 子目录：

- `speculo/.speculo` -> `<target>/speculo/.speculo`
- `speculo/commands` -> `<target>/speculo/commands`
- `speculo/skills` -> `<target>/speculo/skills`
- `speculo/workflows` -> `<target>/speculo/workflows`

若目标路径已存在，命令失败并列出冲突，不覆盖。

### `speculo update [target]`

覆盖目标项目 `speculo/` 下的框架资产：

- `<target>/speculo/commands`
- `<target>/speculo/skills`
- `<target>/speculo/workflows`

`update` 不复制 `.speculo`，不修改用户项目根目录下的任意文档，也不删除 `speculo/.speculo/` 状态、产物或配置。

## 构件边界

| 维度 | `commands/` | `workflows/` | `skills/` |
|------|-------------|--------------|-----------|
| 文件形态 | 单 `.md` 文件 | 文件夹 + 阶段文件 + 模板 | 文件夹 + `SKILL.md` + 渐进披露子目录 |
| 适用场景 | 一次性独立动作 | 多阶段业务交付 | command 可调用的复用能力 |
| 持久化责任 | 写 `.speculo/commands/` | 写 `.speculo/<cat>/<change>/` | 不直接写 `.speculo/` |
| 当前内置 | status/archive/生产力命令 | dev + doc 工作流 | command / workflow 可调用的能力 |

dev workflow 曾使用的 `grill-with-docs`、`zoom-out`、`to-prd`、`tdd`、`to-issues`、`diagnose` 已融合进各自 workflow 目录，不再作为根 skill 分发。GitHub / npm 发布与运营保留为 `skills/github-npm-ops/` 原子能力，供 command 或 workflow 按需调用。

## Dev Workflow

```text
workflows/dev/
├── 00-INDEX.md
├── 01-grill-with-docs/
├── 02-prd/
├── 03-tdd/
├── 04-finalize/
├── I-to-issues/
├── H-diagnose/
├── R-review/
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
- `dev/D`：基于 git diff 的对外文档同步

默认执行模式：

- `full`：`dev/01` -> `dev/02` -> `dev/I` -> `dev/03` -> `dev/04`
- `planning-only`：`dev/01` -> `dev/02` -> `dev/I`
- `implementation-only`：已有 PRD、issue 或明确任务时，从 `dev/03` 开始
- `hotfix`：从 `dev/H` 开始，修复阶段可嵌入 `dev/03`
- `review`：从 `dev/R` 开始
- `finalize`：实现完成需验证收尾与归档时，从 `dev/04` 开始
- `docs-sync`：从 `dev/D` 开始

## Doc Workflow

```text
workflows/doc/
├── 00-INDEX.md
├── M-mao-zedong-cognitive-os/
├── T-teach/
├── F-writing-fragments/
├── B-writing-beats/
├── S-writing-shape/
├── E-edit-article/
└── _templates/
```

入口别名：

- `doc/M`：以毛泽东方法论为底座的认知咨询
- `doc/T`：设计交互式课程：使命→资源→课程→参考→记录
- `doc/F`：追问式访谈采集 fragment 素材
- `doc/B`：逐个 beat 推进文章旅程
- `doc/S`：读取素材堆并塑造成文章
- `doc/E`：章节确认后逐节编辑文章

## 持久化模型

每个 change 有一份真相源。**Change 目录名必须为 `YYYY-MM-DD-<kebab-name>`**（权威定义见 `docs/persistence-contract.md` §0）：

```text
.speculo/dev/2026-06-03-user-auth/.status.json
.speculo/doc/2026-06-05-article-draft/.status.json
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
| `.speculo/.config/RULES.md` | 用户 | 项目硬约束，AI 不自动修改 |
| `.speculo/.config/LESSONS.md` | 用户 / workflow | 跨任务经验库，workflow 末尾可追加 |
| `.speculo/.config/context/` | 用户 / workflow | 项目术语表和上下文映射，需用户确认后写入 |
| `.speculo/.config/adr/` | 用户 / workflow | 项目 ADR，需用户确认后写入 |
| `.speculo/<cat>/<change>/*.md` | workflow | 当前 change 产物 |
| `.speculo/<cat>/<change>/.status.json` | workflow | 当前 change 状态 |
| `.speculo/*-status.json` | workflow/command | active 索引 |
| `.speculo/dev/docs-sync-state.json` | `dev/D-docs-sync` | 对外文档同步的 git diff 基线 |
| `.speculo/archive/` | `commands/archive.md` / `dev/04-finalize` | 已完成 change 归档 |

## 版本记录

| 版本 | 日期 | 摘要 |
|------|------|------|
| v2.4 | 2026-06-06 | 新增 dev/04 finalize 收尾归档工作流（内化完成前验证铁律）；dev/R review 升级为 Spec / Engineering / Standards 三维度 + P0–P3 严重度 + 裁决，融合 code-review-expert 深度清单 |
| v2.3 | 2026-06-05 | 新增 doc 横向工作流；新增 dev/R review 与 dev/D docs-sync；新增 github-npm-ops 原子 skill；CONTEXT、ADR 与 docs-sync state 收敛到 `.speculo/` |
| v2.2 | 2026-06-03 | 移除工具适配层；新增 CLI `init` / `update`；dev workflow-only skills 深度融合进 workflow；`dev/I`、`dev/H` 改为横向字母入口；`.speculo/.config` 收敛为 `RULES.md` 与 `LESSONS.md` |
| v2.1 | 2026-05-28 | 定义 frontmatter 契约、`.status.json` 元字段和 workflow 自治 |
