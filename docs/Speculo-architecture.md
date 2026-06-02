# Speculo Framework

> 以结构化文档驱动 AI Coding 的标准化赋能体系

**版本：** v2.1
**更新日期：** 2026-05-28
**核心原则：** 工具无关 · 即插即用 · workflow 自治

---

## 一、设计理念

Speculo 是一个 **SDD（Specification-Driven Development for AI）** 框架：以**结构化文档作为单一真相来源**，通过物理形式的渐进式披露组织内容，驱动 AI 完成标准化、可复用的编码与写作工作流。

### 四个核心原则

1. **工具无关（Tool-agnostic）** — 框架本体不依赖任何 AI Coding 工具的私有规则。通过 `adapters/` 层提供工具适配，核心目录（`workflows/` `commands/` `skills/`）零工具耦合。
2. **即插即用（Plug-and-play）** — 用户复制 `framework/.` 到自己项目即可使用，单一目录复制单元，无需安装、无脚本依赖。
3. **薄契约 + workflow 自治（Thin contract, workflow autonomy）** — 框架仅规定最小机器契约（目录骨架、`.status.json` 元字段、frontmatter 必填字段）。每个 workflow 自行规定阶段、产物、扩展字段。
4. **产物持久化（Persistent artifacts）** — 每次执行产生的结构化产物以变更（change）为单位归档于 `.speculo/`，可追溯、可索引、可归档。

---

## 二、仓库分层

Speculo 仓库本身分**两类内容**，物理上严格分离：

| 类型 | 路径 | 用户是否复制 | 说明 |
|------|------|------------|------|
| **框架自身文档** | `README.md` / `docs/` / `CHANGELOG.md` / `LICENSE` | ❌ 不复制 | 给框架维护者和评估者看 |
| **框架资产** | `framework/**` | ✅ 整体复制 | 用户的即插即用单元 |

### 仓库根目录全景

```
Speculo/                             # 仓库根（不复制给用户）
├── README.md                        # 项目门面 + 快速接入指引
├── CHANGELOG.md
├── LICENSE
├── docs/                            # 框架自身文档
│   ├── Speculo-architecture.md      # 本文档：架构总览
│   ├── adopting.md                  # 使用者向：如何接入到自己项目
│   ├── quick-reference.md           # 使用者向：内置 workflow/command/skill 清单
│   ├── persistence-contract.md      # 机器契约：.status.json schema 等
│   ├── workflow-authoring.md        # 开发者向：如何写新 workflow
│   ├── skill-authoring.md           # 开发者向：如何写新 skill
│   └── command-authoring.md         # 开发者向：如何写新 command
│
└── framework/                       # 用户复制单元
    ├── adapters/                    # 工具适配层
    ├── commands/                    # 一次性独立命令（平铺单文件）
    ├── workflows/                   # 多阶段编排工作流（按分类）
    ├── skills/                      # 原子能力（AgentSkills 规范）
    └── .speculo/                    # 项目持久化骨架（产物 + 配置）
```

### 用户接入一句话

```bash
cp -R Speculo/framework/. my-project/
cp my-project/adapters/agents/AGENTS.md.example my-project/AGENTS.md
```

---

## 三、`framework/` 完整目录结构

```
framework/
├── adapters/                                 # 工具适配层（用户按需取用）
│   ├── claude-code/
│   │   ├── CLAUDE.md.example                 # 一行透传："see AGENTS.md"
│   │   ├── .claude/
│   │   │   └── commands/                     # /speculo-dev /speculo-dev-i /speculo-status 等触发文件
│   │   └── README.md                         # 接入步骤
│   └── agents/                               # AGENTS.md 生态（Cursor / Aider / Codex / Cline / Continue）
│       ├── AGENTS.md.example                 # 完整 Speculo 接入指令
│       └── README.md
│
├── commands/                                 # 平铺单文件命令
│   ├── archive.md                            # 归档管理（强制用户确认）
│   ├── status.md                             # 按需聚合全局状态（替代 STATUS.json）
│   ├── caveman.md                            # 超压缩沟通模式
│   ├── grill-me.md                           # 逐问式压力测试
│   ├── handoff.md                            # 交接文档
│   ├── write-a-skill.md                      # 创建 / 审查 skill
│   ├── scaffold-exercises.md                 # 课程练习骨架
│   └── <name>.md                             # 每个命令一个文件，frontmatter + 内联模板
│
├── workflows/                                # 多阶段编排工作流
│   ├── dev/                                  # 软件开发主流程
│   │   ├── 00-INDEX.md                       # 智能导航 + 实时状态汇报
│   │   ├── _templates/                       # 分类共享模板池
│   │   │   ├── prd-template.md
│   │   │   ├── issues-slices-template.md
│   │   │   ├── tdd-plan-template.md
│   │   │   ├── diagnosis-template.md
│   │   │   └── ...
│   │   ├── 01-grill-with-docs/
│   │   │   ├── 01-grill-with-docs.md         # dev/01：领域澄清与决策拷问
│   │   │   ├── grill-context-scan.md
│   │   │   └── grill-decision.md
│   │   ├── 02-prd/
│   │   ├── 03-tdd/
│   │   ├── 04-to-issues/                     # dev/I：垂直切片
│   │   └── 05-diagnose/                      # dev/H：hotfix / diagnose
│   │
│   ├── doc/                                  # 文档工作流预留入口
│   │   └── 00-INDEX.md
│   │
│   └── ops/                                  # 运维工作流预留入口
│       └── 00-INDEX.md
│
├── skills/                                   # Speculo skill wrapper + 原始 source
│   └── <skill-name>/
│       ├── SKILL.md                          # Speculo 合规入口
│       └── source/                           # 原始技能内容，保持不改
│
└── .speculo/                                 # 项目持久化骨架
    ├── .config/                              # AI 配置区（用户 / AI 维护的输入）
    │   ├── ARCHITECTURE.md.example           # 技术架构规则
    │   ├── STRUCTURE.md.example              # 目录结构规范
    │   ├── CONVENTIONS.md.example            # 通用规范
    │   ├── DATA-MODEL.md.example             # 数据模型规范
    │   ├── LESSONS.md.example                # 错误总结与抽象归纳
    │   └── RULES.md.example                  # 强制约束
    ├── dev/                                  # workflow 产物（按变更归档）
    │   └── <YYYY-MM-DD-change-name>/
    │       ├── .status.json                  # 该变更状态
    │       ├── context-map.md                # dev/01 自治产物示例
    │       ├── tasks/                        # dev 自治：按需创建
    │       │   ├── 00-INDEX.md
    │       │   ├── T01.md
    │       │   └── T02.md
    │       ├── prd.md
    │       ├── slices.md
    │       ├── implementation-log.md
    │       ├── diagnosis.md
    │       └── ...
    ├── doc/<YYYY-MM-DD-change-name>/
    ├── ops/<YYYY-MM-DD-change-name>/
    ├── commands/<YYYY-MM-DD-cmd-topic>/      # command 产物归档
    ├── archive/                              # 已归档变更（按 年-月 二级分层）
    │   ├── dev/2026-05/<change-name>/
    │   ├── doc/2026-05/<change-name>/
    │   └── ops/2026-05/<change-name>/
    ├── dev-status.json                       # 薄索引：仅 active 段
    ├── doc-status.json
    └── ops-status.json
```

---

## 四、四类构件的边界与判据

| 维度 | `commands/` | `workflows/` | `skills/` |
|------|-------------|--------------|-----------|
| 文件形态 | 单 `.md` 文件 | 文件夹 + 编号阶段 | 文件夹 + `SKILL.md` + 渐进披露子目录 |
| 调用方 | 用户直接调用 | 用户编排执行 | 被 workflow / command 内部调用，或被用户独立调用 |
| 是否多阶段 | ❌ 一次性 | ✅ 编号阶段顺序 | ❌ 按需调能力 |
| 持久化产物 | `.speculo/commands/<date-name-topic>/` 单目录 | `.speculo/<cat>/<date-name>/` 多文件 | ❌ 不写 `.speculo/`，由调用者负责归档 |
| 可调用 skills | ✅ | ✅ | ⚠️ skill 内禁止跨目录引用其他构件 |

### 判据速查

- 要交付一个**业务产出物**（PRD、release notes、bug fix）→ **workflow**（多阶段）或 **command**（一次性）
- 要提供一种**可复用能力**给别人调用 → **skill**
- 复杂度上升时升级路径：`skill → command → workflow`，**不允许** command 拆成多文件夹（复杂场景必须升级为 workflow）

### Skill 的"复制即可用"合格线

**复制 `framework/skills/<name>/` 整个目录到任何项目，任何 AI 工具读 `SKILL.md` 就能用——这是 skill 的合格线。**

- ❌ skill 内禁止引用 `framework/` 其他位置的相对路径
- ❌ skill 禁止写 `.speculo/`（持久化责任永远在调用者）
- ❌ skill 禁止写 `.status.json`（skill 不持有状态）

---

## 五、持久化契约

### 5.1 状态模型：每变更一份 `.status.json` + 顶层薄索引

```
.speculo/dev/2026-05-28-user-auth/.status.json   ← 真相源（该变更）
.speculo/dev-status.json                          ← 索引（仅 active 段、可重建）
```

- **真相在 change 目录**：并发安全（两个变更互不影响），归档时整目录 `mv` 即可
- **索引可重建**：丢失或损坏不影响真相，扫一遍 `.speculo/<cat>/*/` 子目录即可重生
- **全局 `STATUS.json` 不物理存在**：由 `commands/status.md` 按需聚合

### 5.2 `.status.json` 元字段（框架强制，所有 workflow 必有）

```jsonc
{
  "name": "2026-05-28-user-auth",     // 变更目录名
  "category": "dev",                  // dev | doc | ops
  "change_status": "active",          // active | completed | archived
  "execution_mode": "full",           // workflow 提供的命名预设之一
  "created_at": "2026-05-28T10:00:00Z",
  "updated_at": "2026-05-28T15:30:00Z",
  "current_phase": "design",          // 当前所在 phase id
  "phase_history": [
    {
      "phase": "prd",
      "entered_at": "...",
      "completed_at": "...",
      "status": "completed"           // pending | in-progress | completed | skipped | revisited
    }
  ]
}
```

### 5.3 workflow 自治扩展字段

每个 workflow 在自己入口文件的**正文 `## 状态扩展字段` 章节**里声明额外字段，由 AI 按描述写入到同一份 `.status.json`：

```markdown
<!-- workflows/dev/02-prd/02-prd.md 正文片段 -->

## 状态扩展字段
本工作流需在 `.status.json` 追加：
- `prd_slug` (string) — PRD 短 slug
- `module_candidates` (array) — 候选模块或边界
- `test_targets` (array) — 用户确认的测试目标
```

框架的索引器只读元字段；扩展字段供 workflow 自己消费，描述放在正文便于人和 AI 同等理解。

### 5.4 顶层索引 schema（薄）

```jsonc
// .speculo/dev-status.json
{
  "active": [
    {
      "name": "2026-05-28-user-auth",
      "current_phase": "design",
      "updated_at": "2026-05-28T15:30:00Z"
    }
  ]
}
```

归档后变更**完全从 active 段移除**，不保留 archived 段。历史查询走 `archive/` 目录扫描或 `commands/history.md`。

### 5.5 归档规则

- **触发方式**：仅由 `commands/archive.md` 显式触发（不自动）
- **强制确认**：命令必须先列出待归档清单并征求用户确认才能 `mv`
- **目录分层**：`archive/<cat>/<YYYY-MM>/<change-name>/`，按年-月二级分层，避免单目录膨胀
- **索引同步**：归档完成后必须从 `<cat>-status.json` 的 `active` 段移除

### 5.6 写入责任

| 文件 | 用户可写 | AI 可写 |
|------|---------|---------|
| `.speculo/.config/*.md` | ✅ | ⚠️ 需用户审批 |
| `.speculo/.config/RULES.md` | ✅ | ❌ 严禁自动改 |
| `.speculo/<cat>/<change>/*.md` | ⚠️ 一般不动 | ✅ 工作流产物 |
| `.speculo/*-status.json` | ❌ | ✅ workflow 写入 |
| `.speculo/<cat>/<change>/.status.json` | ❌ | ✅ workflow 写入 |
| `.speculo/.config/LESSONS.md` | ⚠️ 可追加 | ✅ workflow 末尾追加 |

---

## 六、Frontmatter 契约 + 正文渐进披露

### 6.1 核心原则：frontmatter 极简，结构在正文

**Frontmatter 仅承载发现元数据**——让 AI 和 adapter 能扫描出"这个文件是什么、叫什么、关于什么"。

**所有结构化引用（phases、模板、依赖的 workflow、调用的 skill、状态扩展字段、入口协议）一律放在 Markdown 正文里**，通过相对路径链接和小标题做**物理渐进披露**：AI 读入口文件 → 看到正文中按顺序排列的章节和路径 → 顺路径继续读子文件 / 模板 / 引用的 skill。

**理由：**
- **工具无关**：所有 AI 模型对 Markdown 链接和标题的解析天然友好，对结构化 YAML 嵌套字段的理解参差不齐
- **自解释**：正文里的"第一阶段：核心 PRD 填写。规范见 `prd-core.md`，模板见 `../_templates/prd-template.md`"对人和 AI 同等清晰
- **抗漂移**：不需要维护 YAML schema，新增 phase 直接加章节即可
- **渐进披露真实落地**：AI 不会一次解析整份 YAML 树，而是按需顺路径读下一层

### 6.2 Workflow 入口 frontmatter（最小集）

```yaml
---
id: dev/prd                  # 必填：全局唯一 id（格式 <category>/<name>）
category: dev                # 必填：dev | doc | ops
name: PRD 工作流              # 必填：人类可读名
description: 需求定义与评审    # 必填：一句话用途
keywords: [prd, 需求, feature] # 可选：adapter 触发匹配关键词
---
```

**就这五个字段，没有更多。** 阶段、依赖、模板、状态扩展全部进正文。

### 6.3 Workflow 入口正文结构（推荐章节）

```markdown
# PRD 工作流执行指引

[简介：本工作流做什么 + AI 进入时的前置消歧动作（消歧当前 active change 等）]

## 阶段

### 1. Core — 核心 PRD 填写
- 规范：`prd-core.md`
- 模板：`../_templates/prd-template.md`
- 产物：`prd.md`
- 完成准则：`prd.md` 无残留占位符，验收标准可测试

### 2. Review — 评审
- 规范：`prd-review.md`
- 模板：`../_templates/prd-review-template.md`
- 产物：`prd-review.md`
- 完成准则：评审决议已写入 `.status.json`

## 依赖
- 软依赖（推荐先做）：无
- 硬依赖（未满足时拒绝执行）：无

## 状态扩展字段
本工作流需在 `.status.json` 追加：
- `stakeholders` (array)
- `priority` (P0 | P1 | P2)

## 完成与状态更新
- 每个 phase 完成时更新 `.status.json` 的 `phase_history`
- 全部 phase 完成 → `change_status: completed`
```

AI 读这份文档时，**沿着相对路径链接顺势继续读** `prd-core.md` / 模板文件，物理渐进披露天然发生。

### 6.4 Command 入口 frontmatter（最小集）

```yaml
---
id: debug                    # 必填：唯一 id
type: command                # 必填：固定 command
name: Debug Fix              # 必填
description: 端到端定位并修复 bug
keywords: [debug, bug, 修复]
---
```

正文里描述：归档路径模式、调用的 skills（相对路径）、执行步骤、内联产物模板。

### 6.5 Skill 入口 frontmatter（最小集，`SKILL.md` 顶部）

```yaml
---
id: code-review              # 必填：唯一 id
type: skill                  # 必填：固定 skill
name: Code Review            # 必填
description: 结构化代码审查
---
```

正文里描述：输入契约、输出契约、`references/` 下子文档何时读、`scripts/` 何时调。

### 6.6 Template 不需要 frontmatter

模板顶部用一段引用说明声明归属即可：

```markdown
> **服务工作流：** `../02-prd/`
> **产物文件名：** `prd.md`

# PRD

## 项目背景
[TODO: 描述本需求要解决的核心问题、目标用户群体、预期商业价值。1-2 段。]
```

### 6.7 相对路径硬约束

**正文中引用的 skill / template / 其他 workflow / phase 子文档必须用相对路径**，禁止使用裸 id 或绝对路径。

理由：相对路径自包含、无需解析层、文件被复制走仍然能找到资源、所有 AI 工具天然可解析。

---

## 七、文件级约定

### 7.1 文件格式

| 场景 | 格式 | 说明 |
|------|------|------|
| workflow / command / skill / template / 文档 | `.md` | Markdown 内**允许嵌入 XML 标签**以强调结构（如 `<context>` `<requirements>` 块） |
| 状态文件 | `.json` | `.status.json` 及 `<cat>-status.json` |
| **不使用** `.xml` `.yaml` 顶层文件 | — | 一律以 .md 承载，XML/YAML 仅作为 .md 内嵌结构存在 |

### 7.2 模板占位符约定（强制）

```markdown
## 项目背景
[TODO: 描述本项目要解决的核心问题、目标用户群体、预期商业价值。1-2 段。]

## 核心需求
[TODO: 列出 3-5 个用户故事，格式 "作为 <角色>，我希望 <能力>，以便 <价值>"。]
```

- **格式**：`[TODO: 具体填写指引]`
- **每个占位符必须包含"填什么"的提示**（不允许无说明的 TODO 占位符）
- **填写时整块覆盖**，不留残骸
- **可检测**：用 `grep -r "\[TODO:" .speculo/` 一键扫描未完成模板

### 7.3 模板里**禁止**引导文字

模板纯粹是骨架：**仅顶部归属说明 + 章节标题 + 占位符**。
所有"请按以下要求填写..."的引导文字写在 workflow 的 phase `.md` 里（如 `prd-core.md`）。

### 7.4 命名约定

| 类别 | 约定 | 例 |
|------|------|---|
| Change 目录 | `YYYY-MM-DD-<kebab-name>` | `2026-05-28-user-auth` |
| Command 产物目录 | `YYYY-MM-DD-<cmd-name>-<topic>` | `2026-05-28-debug-login-500` |
| Workflow 文件夹 | `NN-<kebab-name>` | `01-prd` |
| Workflow 入口文件 | `NN-<name>.md`（与文件夹同名） | `01-prd.md` |
| Workflow 阶段子文件 | `<name>-<phase>.md` | `prd-core.md`, `prd-review.md` |
| Skill 入口 | `SKILL.md`（**强制**） | — |
| 分类导航 | `00-INDEX.md`（**强制**） | — |
| Example/默认配置 | `<name>.example` 后缀 | `RULES.md.example` |

---

## 八、`00-INDEX.md` 智能导航协议

每个 workflow 分类下的 `00-INDEX.md` 既是**目录**也是**活跃命令**——用户在不知道从哪开始时调用，AI 会：

1. **扫描状态**：读 `.speculo/<cat>-status.json` 索引 + 各 `.status.json`
2. **报告进展**：列出 active changes、当前 phase、上次更新时间
3. **推荐下一步**：基于状态 + 用户意图，推荐执行某个 workflow 的某个 phase
4. **列出分类下的预设模式**（execution_mode）：
   - `full`: 完整链路（PRD → 设计 → 实现 → 测试 → 评审）
   - `hotfix`: 紧急修复（直接 implement → test）
   - `refactor`: 重构（设计 → 实现 → 测试）
   - `doc-only`: 仅文档变更
5. **检查依赖**：用户要跑某 workflow 前，检查 `strict_depends_on` 是否满足

`00-INDEX.md` 也是 `STATUS.json` 不需要物理存在的原因——它就是按需视图。

---

## 九、Adapters（工具适配层）

### 9.1 设计原则

- 框架核心**绝不**知道任何 AI 工具的存在
- 工具集成通过 `adapters/<tool>/` 提供"开箱即用的粘合片段"
- 所有适配器文件加 `.example` 后缀或放在子目录内，**绝不放可执行的真实配置**
- 用户复制对应 adapter 内容到自己工具的注册位置即激活

### 9.2 首批适配器

| Adapter | 覆盖工具 | 关键文件 |
|---------|---------|---------|
| `claude-code/` | Claude Code | `CLAUDE.md.example`（一行透传到 AGENTS.md）+ `.claude/commands/*.md` |
| `agents/` | Cursor / Aider / Codex / Cline / Continue 等所有读 AGENTS.md 的工具 | `AGENTS.md.example` |

### 9.3 `CLAUDE.md.example` 透传策略

```markdown
# CLAUDE.md
本项目使用 Speculo 框架。完整 AI 行为指令见 AGENTS.md。
```

避免 CLAUDE.md 与 AGENTS.md 双写漂移，把 Claude Code 收编进 AGENTS.md 生态。

### 9.4 新增 adapter

社区可在 `framework/adapters/` 下添加 `<new-tool>/` 子目录，对框架核心**零影响**。

---

## 十、扩展指引（仅指针，详见各 authoring 文档）

### 新增 workflow
→ 见 `docs/workflow-authoring.md`
要点：建 `framework/workflows/<cat>/NN-<name>/`，写入口 .md（带 frontmatter）+ 阶段子文件，模板放 `<cat>/_templates/`。

### 新增 skill
→ 见 `docs/skill-authoring.md`
要点：建 `framework/skills/<name>/`，写 `SKILL.md`（带 frontmatter）+ `references/scripts/examples/`，**严守"零跨目录引用"**。

### 新增 command
→ 见 `docs/command-authoring.md`
要点：建 `framework/commands/<name>.md`（单文件），frontmatter + 内联模板，复杂场景升级为 workflow。

---

## 十一、责任边界速查表

| 决策点 | 框架规定 | workflow 自治 |
|--------|----------|---------------|
| 目录骨架 | ✅ | — |
| `.status.json` 元字段 | ✅ | — |
| 顶层索引 schema | ✅ | — |
| Frontmatter 必填字段集 | ✅ | — |
| Workflow 阶段命名 | — | ✅ |
| Workflow 产物文件名 | — | ✅ |
| Workflow `.status.json` 扩展字段 | — | ✅ |
| Workflow 执行模式预设（`execution_mode`） | — | ✅ |
| `tasks/` 子目录是否存在 | — | ✅（如 dev 自治选择启用） |
| Phase 状态机扩展（除 5 种基础状态） | — | ✅ |

---

## 十二、版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-05-25 | 初始架构（五层 commands/workflows/templates/skills/.speculo） |
| v2.0 | 2026-05-28 | 重大重构：仓库分 `docs/` + `framework/` 两层；模板下沉到 workflow 分类内 `_templates/`；引入 adapters/ 工具适配层；定义 frontmatter 契约；定义 `.status.json` 元字段；明确三类构件边界与判据；`.speculo/.config/` 配置区与产物区分家；明确归档触发与索引规则；模板格式收敛到 .md + `[TODO:]` 占位符 |
| v2.1 | 2026-05-28 | Frontmatter 极简化：仅保留发现元数据（id/name/description/keywords/category/type）；phases/depends_on/status_extensions/uses_skills/template 等结构化引用全部移至 Markdown 正文，通过相对路径链接和小标题做物理渐进披露；模板不再使用 frontmatter，改为顶部引用说明 |
