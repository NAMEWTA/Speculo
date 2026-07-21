---
name: speculo-write-workflows
description: 在指定 workflow 包中新增、审计或合并 work 入口。用户指定 workflow 名称（如 template/workflows/person）并要求新增具体 work、审计现有 work 的渐进披露结构、合并相似 work、基于参考材料生成 work 或对齐 <Path> 路径引用格式时使用。
---

# Speculo Write Workflows

## 格式分界

Workflow 包内所有文件均为纯自然 markdown，不使用 XML 块。

| 文件类型 | 格式 | 说明 |
|---------|------|------|
| **INDEX.md** | 纯自然 markdown | workflow 唯一入口——frontmatter（`id`/`type: workflow`/`workflow`）、运行时根、持久化约定、启动协议、状态字段、路径分配、副作用边界，以及 `<!-- AUTO-INDEX-START -->`...`<!-- AUTO-INDEX-END -->` 标记的 work 列表 |
| **Work 入口文件**（`<Letter>-<name>/<Letter>-<name>.md`） | 纯自然 markdown | 仿 `<Path>{roots.skills}/writing-great-skills/SKILL.md</Path>` 的行文风格——编号步骤、内联完成标准、`<Path>` 指针引用子文件 |
| **Common 原子技能**（`common/<skill-name>/SKILL.md`） | 纯自然 markdown + YAML frontmatter | 任何 work 都可调用的独立原子技能——每个都有明确的触发条件，按渐进披露原则组织（入口 SKILL.md + 可选 `references/` 子文件），不存在于 AUTO-INDEX 中 |

Workflow 包有一个 INDEX.md、若干 `<Letter>-<work>/` 目录，以及可选的 `common/` — 存放跨 work 共享的原子技能。所有交叉引用使用 `<Path>{roots.xxx}/...</Path>` 格式。

## Common 原子技能

每个 workflow 包都可以有一个 `common/` 目录，存放任何 work 都可能调用到的原子技能。这些技能独立于具体的 `<Letter>-<work>/` 目录，通过 `{roots.workflows}/<workflow>/common/<skill-name>/SKILL.md` 被 work 引用。

例如 `<Path>{roots.workflows}/specdev/</Path>` 的 `common/` 目录包含：

| 技能 | 用途 |
|------|------|
| `dev-worktree` | 隔离 worktree 的创建与收尾 |
| `handoff` | 将当前对话压缩为交接文档 |
| `resolving-merge-conflicts` | 解决 git merge/rebase 冲突 |

**何时放入 `common/`：**
- 该能力有多个不同 work 都需要调用它 → 放入 `common/`
- 该能力只有单个 work 需要 → 作为 work 的子文件，不放入 `common/`
- 不要为空 workflow 创建空的 `common/` 目录

**`common/` 技能的编写规则：**
- 每个技能一个子目录（`common/<skill-name>/`），入口为 `SKILL.md`
- YAML frontmatter 包含 `name` 和 `description`（触发条件）
- 遵循渐进披露原则——入口精简，分支细节放入 `references/` 子文件
- 通过 `<Path>{roots.workflows}/<workflow>/common/<skill-name>/SKILL.md</Path>` 被 work 调用

**与 `<Letter>-<work>/` 的区别：**
- `<Letter>-<work>/` — workflow 流程中的步骤入口，出现在 INDEX.md 的 AUTO-INDEX 列表中
- `common/<skill>/` — 工具型原子技能，不出现在 AUTO-INDEX 中，由 work 内部按需调用

## 过程

1. 读取 `<Path>{roots.agents}/AGENTS.md</Path>`、`<Path>{roots.skills}/speculo-write-workflows/references/workflow-authoring.md</Path>`、`<Path>{roots.skills}/speculo-write-workflows/references/persistence-contract.md</Path>` 和 `<Path>{roots.skills}/speculo-write-workflows/references/authoring-quality.md</Path>`。完成标准：workflow 包结构、INDEX.md 更新规则、work 命名规则（`<大写字母>-<work_name>/`）和渐进披露要求已列成检查项。

2. 扫描目标 workflow 的现有 work 目录（`<Letter>-<work>/`）、`common/` 原子技能、INDEX.md 和 `_state/`。按独立主导词和持久化责任判断新增、合并或重命名。完成标准：每个 work 只有一个清晰职责，无重复主导词；`common/` 中只保留至少两个 work 都会调用的技能（单一 work 专用的应移入该 work 的子文件）；`_state/` 模板包含 `status.json`、`changes/` 和 `archive/`。

3. 若用户提供了参考材料（文档、目录、template 等），必须先深度研读、提取其精髓（结构模式、命名约定、分支设计、完成标准写法），随后执行整体深度 COPY：将参考材料的骨架结构、关键流程和核心规则完整复刻到 work 设计中。COPY 完成后再按以下规则适配：
   - 命名对齐当前 workflow 的 `<大写字母>-<work_name>/` 约定
   - 路径引用改写为 `<Path>{roots.xxx}/...</Path>` 格式
   - 持久化指向当前 workflow 的 `_state/changes/<change>/`
   - 剪除与当前 workflow 无关的分支、外部依赖和原参考的特有约束
   完成标准：参考精髓已吸收并融入设计，而非表面拼凑；适配后的结构与当前 workflow 的命名、路径和持久化约定一致。

4. 对每个 work（包括 `common/` 中的原子技能），委托给 `<Path>{roots.skills}/speculo-write-work/SKILL.md</Path>` 编写入口文件和渐进披露子文件。核心约束：
   - 命名：`<Letter>-<work>/` 使用 `<大写字母>-<work_name>/` 目录；`common/<skill>/` 使用 kebab-case 目录名，入口文件为 `SKILL.md`
   - 入口格式：纯自然 markdown——标题下用 `## 流程` 组织编号步骤，每个步骤以内联完成标准结束；步骤中通过 `<Path>{roots.xxx}/...</Path>` 指针引用子文件。风格参照 `<Path>{roots.skills}/writing-great-skills/SKILL.md</Path>`。`common/` 技能使用 YAML frontmatter（`name` + `description`）而非 `<Letter>-<work>/` 的 frontmatter 格式
   - 路径引用：所有交叉引用使用 `<Path>{roots.xxx}/...</Path>` 格式，基于 workspace.json 的 root aliases
   - 渐进披露：入口只保留每条分支都需要的步骤；分支专属细节放在子文件中，以 `<Path>` 指针引用
   - 持久化：work 产物写入 workflow 的 `_state/changes/<change>/`，不写入 `.speculo/` 全局目录
   - `_state/` 固定结构：仅 `status.json`、`changes/`、`archive/` 为必需
   - 依赖关系：步骤间的硬依赖在流程描述中自然说明（"依赖步骤 1 的产物"）
   - 状态字段：如需追踪状态，在入口文件中用自然列表说明各字段含义和可能值
   完成标准：`speculo-write-work` 已完成入口文件和子文件的编写，且通过该 skill 的质量审计。

5. 实施最小文件集：创建入口文件与渐进披露子文件，确保 `_state/` 模板包含 `status.json`、`changes/` 和 `archive/`。运行 `<Path>{roots.skills}/speculo-write-workflows/scripts/generate-index.mjs</Path>` 更新 INDEX.md 的 AUTO-INDEX 区块。完成标准：INDEX.md 已更新、无断链。

6. 运行 `pnpm validate-assets` 和相关测试。逐句执行相关性、无效操作、重复、沉积和蔓延审计。完成标准：所有校验通过，或每个阻塞都有命令输出和未完成影响。

## 参考材料引用约束

当用户提供参考材料并要求生成的 work 引用其中内容时，必须遵守：

- 默认允许跨 workflow 引用：可通过 `<Path>{roots.xxx}/...</Path>` 指向外部文件（skills、其他 workflow 等）。
- 用户声明内部引用：若用户明确要求"只在当前 workflow 内引用"或"不允许引用外部内容"，则必须将参考材料的全部相关内容 COPY 到当前 workflow 目录内（如 `references/`、`books/` 或 work 自身子目录），再以 `<Path>{roots.workflows}/<workflow>/.../...</Path>` 内部指针引用。不得保留指向 workflow 外部的 `<Path>` 链接。
- COPY 完整性：复制的参考材料必须保留完整结构和内容，不做删减或改写；适配只在 work 入口和子文件的引用层面进行。

## INDEX.md 结构与自动更新

INDEX.md 是 workflow 的唯一入口文件，纯自然 markdown。完整模板和规范见 `<Path>{roots.skills}/speculo-write-workflows/references/index-template.md</Path>`。

### 关键约束

编写 INDEX.md 时必须遵守以下硬性规则：

1. **持久化约定只列真实存在的目录**：
   - 固定骨架（`speculo init` 创建）：`status.json`、`changes/`、`archive/`
   - 确认后按需创建（changes 产物经确认后提升）：`adr/`（永久 ADR）、`context/`（永久词汇表）
   - 禁止列出不存在的目录（如 `.config/`、`config.json`、`knowledge/` 等）。按需临时产物属于 work 内部行为

2. **状态字段必须完整**：`status.json` 中每个字段必须写清楚：字段名、类型、用途、可能值（字符串列出格式如 `"YYYY-MM-DD-<topic>"`，数组列出元素类型，对象列出子字段）。不允许只列字段名不加说明。标准字段集：
   - `schema_version`（数字）
   - `workflow`（字符串）
   - `active`（字符串数组）
   - `current_work`（字符串或 null）
   - `work_history`（对象数组，含 work_id/started_at/completed_at/result/artifacts）

### 自动更新

`<!-- AUTO-INDEX-START -->` 和 `<!-- AUTO-INDEX-END -->` 之间的 work 列表由脚本自动维护。每次新增、删除或重命名 work 后运行：

```bash
node .agents/skills/speculo-write-workflows/scripts/generate-index.mjs <workflow-path>
```

脚本扫描 `<workflow-path>` 下所有 `<大写字母>-*/` 目录，读取各入口文件 frontmatter 的 `name` 和 `description`，替换 AUTO-INDEX 区块。其余内容原样保留。
