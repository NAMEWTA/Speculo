---
id: dev/M-domain-modeling
category: dev
name: Domain Modeling
description: 主动构建与精炼项目领域模型——挑战术语、压测边界，并在决策结晶当下沉淀通用语言（CONTEXT）与架构决策（ADR）
keywords: [domain-modeling, context, adr, ubiquitous-language, 领域建模, 术语, 通用语言]
---

# Domain Modeling 工作流执行指引

本工作流是 `dev/M` 入口，也是 dev 分类**领域模型的横向纪律与格式单一事实源**：在设计与讨论中*主动*构建、精炼项目领域模型，并在术语和决策结晶的当下立即沉淀。它既可独立进入（`dev/M`），也被 `dev/01`、`dev/02`、`dev/04`、`dev/D` 与 `dev/A` 在各自阶段中引用。

> **主动 vs 消费**：仅仅*读取* CONTEXT 取词汇**不是**本工作流——那是任何工作流都该有的一行习惯。本工作流用于你正在*改变*模型，而不仅是消费它时。

## 内置指引

### 何时使用

当 dev 工作流需要*改变*领域模型时使用——挑战或锐化术语、消解一词多义、记录难以逆转的架构决策、维护通用语言。典型触发：

- 用户用词与现有 CONTEXT 冲突，或同一概念出现多个词
- 讨论领域关系，需要用具体场景压测边界
- 出现「难以逆转 + 缺上下文会令人意外 + 真实权衡」的决策，值得记成 ADR
- 实现 / 重构 / PRD 中引入了 CONTEXT 里尚不存在的概念

### 输入

- 用户的计划、设计或当前讨论
- `speculo/.speculo/.config/context/CONTEXT.md`、`speculo/.speculo/.config/context/CONTEXT-MAP.md`、`speculo/.speculo/.config/adr/` 与相关代码
- 当前 change 目录：`speculo/.speculo/dev/<change>/`（`<change>` 必须为 `YYYY-MM-DD-<kebab-name>`，例：`2026-06-12-model-ordering`）

### 输出

- 会话沉淀记录：`speculo/.speculo/dev/<change>/domain-model-log.md`
- 经用户确认后更新 `speculo/.speculo/.config/context/CONTEXT.md`（或 `CONTEXT-MAP.md`）
- 经用户确认后在 `speculo/.speculo/.config/adr/` 新建 ADR
- 需要用户决策的术语 / 边界问题，每次只问一个

（`<change>` 格式：`YYYY-MM-DD-<kebab-name>`）

### 会话期间（主动纪律）

在讨论进行中持续执行，**不要批量**——在发生的当下捕获：

- **对照词汇表挑战**：用户用词与 CONTEXT 现有语言冲突时立即指出。「你的词汇表把『取消』定义为 X，但你似乎指 Y——到底是哪个？」
- **锐化模糊语言**：用户用含混或一词多义术语时，提出一个精确的规范术语。「你说『账户』——是指 Customer 还是 User？它们是不同的东西。」
- **用具体场景压测**：讨论领域关系时，发明探测边界的场景，迫使精确界定概念之间的边界。
- **与代码交叉引用**：用户陈述某事如何运作时，核对代码是否一致；矛盾即指出。「你的代码取消整个 Order，但你刚说支持部分取消——哪个对？」
- **内联沉淀**：术语一旦解决，立即按 `CONTEXT-FORMAT.md` 更新（用户确认后写 `.config/context/`）；未确认的只记到 `domain-model-log.md`。
- **有节制地提供 ADR**：仅当「难以逆转 + 缺上下文会令人意外 + 真实权衡的结果」三条全部满足时，才按 `ADR-FORMAT.md` 提议创建 ADR；任一不满足则跳过。

> `CONTEXT.md` 必须完全不含实现细节——它是词汇表，不是 spec、草稿本或实现决策仓库。

### 渐进披露

- `CONTEXT-FORMAT.md`：撰写或更新项目术语表（CONTEXT / CONTEXT-MAP）时读取——**通用语言格式的单一事实源**。
- `ADR-FORMAT.md`：判断是否该写 ADR、以何种格式写时读取——**ADR 格式与判据的单一事实源**。

### 独立使用

本工作流**零硬依赖**，无需预先执行其他工作流即可独立进入（`dev/M`）。只需用户的领域讨论 + 当前 git 仓库即可启动。

### 缺少 change 目录时

若无 active change，执行 `../AGENTS.md` 进入协议步骤 3（原子三步），不得内联自初始化 JSON。

## 阶段

> **惰性创建文件**——只在需要写入时才创建。`.config/context/CONTEXT.md` 与 `.config/adr/` 由 Speculo 初始化提供；若目标项目缺失，在第一个术语 / ADR 解决时按需创建。

### 1. Model Session — 词汇与决策沉淀
- id：`model-session`
- 规范：本入口「会话期间（主动纪律）」+ 同目录 `CONTEXT-FORMAT.md`、`ADR-FORMAT.md`
- 模板：`../_templates/domain-model-log-template.md`
- 产物：`domain-model-log.md`；经用户确认后更新 `.config/context/` 与 `.config/adr/`
- 完成准则：
  - 每个被挑战 / 锐化的术语都有结论（已写入 CONTEXT 或记为 `[待确认]`）
  - 每个 ADR 候选都已按三条判据裁决（提议创建，或显式跳过并记原因）
  - 写入 `.config/context/` 或 `.config/adr/` 的内容均经用户确认
  - `domain-model-log.md` 无残留 `[TODO:]`

## 依赖

- 硬依赖：无
- 软依赖：无。可独立进入；也被 `../01-grill-with-docs/01-grill-with-docs.md`、`../02-prd/02-prd.md`、`../04-finalize/04-finalize.md`、`../D-docs-sync/D-docs-sync.md`、`../A-improve-architecture/A-improve-architecture.md` 在其阶段中引用。

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `dev_entry` (string) — 固定为 `dev/M`
- `embedded_guides` (array) — 包含 `domain-modeling`
- `terms_resolved` (array) — 本会话解决的术语及结论
- `adr_candidates` (array) — ADR 候选及裁决（`created` | `skipped` + 原因）
- `context_write_status` (none | logged | context-updated | adr-created) — 领域模型沉淀状态

## 完成与状态更新

- 进入 phase 时更新 `current_phase` 和 `phase_history`。
- 术语 / 决策沉淀后更新 `terms_resolved`、`adr_candidates`、`context_write_status`。
- 写 `.config/context/` 或 `.config/adr/` **前必须经用户确认**（持久化写入责任表中，这两处 AI 仅在用户确认后写入）。
- 本工作流不自动完成 change；嵌入其他工作流时随宿主流程推进。
