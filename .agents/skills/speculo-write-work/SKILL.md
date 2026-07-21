---
name: speculo-write-work
description: 在指定 workflow 中撰写单个 work 入口文件（X-name/X-name.md）及其渐进披露子文件。用户指定 workflow 和 work 名称，要求新增 work、为已有 work 补充子文件、重构 work 步骤结构、优化完成标准、对齐主导词或修复 &lt;Path&gt; 指针时使用。
---

# Speculo Write Work

在 workflow 包中编写或维护单个 work 入口文件——`<大写字母>-<work_name>/<大写字母>-<work_name>.md`——及其渐进披露子文件。本 skill 不负责 INDEX.md 管理、workflow 包结构或 `_state/` 骨架创建——这些属于 `<Path>{roots.skills}/speculo-write-workflows/SKILL.md</Path>` 的职责。

## 格式分界

Workflow 包内所有文件为纯自然 markdown，不使用 XML 块。本 skill 处理两种文件：

| 文件类型 | 格式 | 说明 |
|---------|------|------|
| Work 入口文件（`X-name/X-name.md`） | 纯 markdown | YAML frontmatter + `## 流程`（编号步骤 + 完成标准）+ `## 子文件引用` 表格 + 可选 `## 依赖关系` |
| 子文件（`X-name/sub-name.md`） | 纯 markdown | 分支专属规则/流程/模板，通过入口的引用表按触发条件加载 |

两种结构模式：

- **单文件**：所有步骤内联，`## 子文件引用` 仅列产物输出路径和上游输入引用。示例：`<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>`、`T-tickets/T-tickets.md`、`W-wayfinder/W-wayfinder.md`。
- **渐进披露**：入口只保留每条分支都需要的步骤，分支专属细节放入子文件，通过 `<Path>` 指针 + 触发条件表加载。示例：`<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`（6 个子文件）、`I-implement/I-implement.md`（6 个子文件）。

## 过程

### 1. 加载参考材料

读取以下文件，建立检查项：

- `<Path>{roots.agents}/AGENTS.md</Path>` — 项目约定和目录映射
- `<Path>{roots.skills}/_shared/authoring-quality.md</Path>` — 质量模型：主导词、信息层级、就近放置、完成标准、按调用/按顺序拆分、单一真相源、修剪规则
- `<Path>{roots.skills}/speculo-write-workflows/references/workflow-authoring.md</Path>` — work 条目命名、frontmatter、格式规范
- `<Path>{roots.skills}/speculo-write-workflows/references/persistence-contract.md</Path>` — 持久化根解析、变更目录、产物边界
- `<Path>{roots.skills}/writing-great-skills/SKILL.md</Path>` — 写作风格参考（主导词、信息层级、完成标准、修剪原则、失败模式）
- `<Path>{roots.skills}/writing-great-skills/GLOSSARY.md</Path>` — 术语精确定义


读取目标 workflow 的 `<Path>{roots.workflows}/<workflow>/INDEX.md</Path>` 和已有 work 目录，了解当前上下文。

**完成标准**：work 格式规范、frontmatter 字段、持久化约定、渐进披露规则、质量杠杆（主导词、信息层级、就近放置、完成标准）和失败模式（过早完成、重复、沉积、蔓延、无效操作、否定）已列成检查项；目标 workflow 当前状态已理解。

### 2. 定义 work 的主导词和职责

从用户输入中确定此 work 的核心身份：

- **主导词**——一个紧凑概念，锚定此 work 的全部行为。优先选择模型预训练中已有的概念（如"设计访谈"、"规格"、"便签拆分"、"寻路"、"实现"），而非自创术语。主导词在 frontmatter `name`、`description` 和正文步骤中反复出现以锚定执行。
- **职责边界**——此 work 做什么、不做什么。一个 work 只有一个清晰职责。用一两句话写清。
- **冲突检查**——扫描同 workflow 下已有 work 的 `name` 和 `description`，确保主导词不重叠。两个 work 不能共享同一个主导词。

**完成标准**：主导词已选定且来源明确；职责边界用一两句话写清；与同 workflow 其他 work 无主导词冲突。

### 3. 决定单文件还是渐进披露

**单文件模式**适用于：
- 所有步骤都是每条运行分支都需要的
- 流程线性——无分支、无"仅某些场景才进入"的步骤
- 步骤少（通常 ≤5 步），全部内联不会造成蔓延

**渐进披露模式**适用于：
- 存在仅在特定条件下触发的步骤分支
- 某步骤的后续步骤（完成后步骤）诱发了对当前步骤的过早完成——隐藏后续步骤鼓励更彻底的实地探查
- 入口文件建议控制在 50 行以内

判断标准：如果你能用"当用户需要 X 时"或"仅在 Y 条件下"来描述一个步骤，它应进入子文件。

**完成标准**：模式选择已明确并有理由；每条分支归属已确定——哪些步骤在入口、哪些在子文件。

### 4. 编写入口文件

创建 `<大写字母>-<work_name>/<大写字母>-<work_name>.md`：

**Frontmatter**：
```yaml
---
id: <workflow>/<work-name>     # work-name 为 kebab-case
type: workflow-entry            # 固定值
workflow: <workflow>            # 所属 workflow 目录名
name: <中文显示名>               # 与主导词一致
description: <一句话描述>         # 包含主导词和核心行为
keywords: [<主导词>, ...]         # YAML 数组
---
```

**正文结构**：
- `## 流程` — 编号步骤，每个步骤以内联完成标准结尾。格式：`**完成标准**：<可检查条件>`
- 通过 `<Path>{roots.xxx}/...</Path>` 指针引用子文件和外部材料
- `## 子文件引用` — 表格，列：文件 | 内容 | 触发条件（如无需子文件则仅列产物输出路径）
- `## 依赖关系`（可选）— 如果依赖其他 work 的产物或上游输入，在此声明

**写作规则**：
- 纯自然 markdown，不使用 XML 块
- 每个步骤必须有一个可检查的完成标准：agent 能否区分完成和未完成？
- 关键步骤的完成标准要穷尽："每个修改过的模块都已覆盖"而非"生成一个变更列表"
- 产物路径始终指向 `{roots.state}/<workflow>/changes/{change}/<file>.md`
- 正面措辞——陈述目标行为，不使用"不要/禁止/切勿"
- 精简——每句都要改变模型的默认行为，否则删除

**完成标准**：入口文件已创建；frontmatter 字段完整且与目录名一致；`## 流程` 步骤编号清晰连续；每个步骤有可检查的完成标准；`<Path>` 使用 `{roots.xxx}` 别名格式；产物路径正确指向 `{roots.state}/<workflow>/changes/{change}/`。

### 5. 编写子文件（如适用）

如果选择了渐进披露模式：

- 每个子文件覆盖一个独立分支——一组触发条件相同的规则、流程或参考材料
- 子文件命名为描述性 kebab-case（如 `grilling-protocol.md`、`tdd-rules.md`），不使用编号
- 子文件内任意 markdown 结构（编号列表、表格、代码块），不使用 XML 块
- 子文件内容放在使用位置附近（就近放置）：定义、规则、注意事项在同一标题下
- 子文件不应独立于入口被加载——其存在和触发条件仅在入口的 `## 子文件引用` 表中声明

**完成标准**：每个子文件覆盖恰好一个分支；所有子文件在入口引用表中声明且内容与触发条件一致；子文件路径与入口 `## 流程` 中的 `<Path>` 指针对应。

### 6. 验证与质量审计

**指针验证**：
- 所有 `<Path>` 使用 `{roots.xxx}` 别名（config、speculo、state、commands、skills、workflows）
- 无绝对路径、反斜杠、`..`、裸 id 引用
- 所有指针解析到真实存在的文件

**质量审计**（逐项执行）：

| 审计项 | 检查方式 |
|--------|---------|
| 相关性 | 逐句检查——这句仍影响此 work 的行为吗？删除无关陈述 |
| 无效操作 | 逐句检查——这句改变了模型的默认行为吗？删除"agent 本来就会做的事" |
| 重复 | 同一含义是否出现在多个位置？收拢到单一权威位置 |
| 沉积 | 是否有因"删了感觉不安全"而保留的过时内容？删除不再使用的规则和引用 |
| 蔓延 | 入口文件是否过长（>50 行）？将可下推的参考内容移入子文件 |
| 信息层级 | 入口是否只保留了每条分支都需要的步骤？分支细节是否全部在子文件中？ |
| 完成标准 | 每个步骤的完成标准是否可检查？关键步骤是否穷尽？ |
| 否定措辞 | 是否有"不要/禁止/切勿"？替换为正面目标陈述，仅安全边界可保留禁令 |

**完成标准**：所有 `<Path>` 指针格式正确且解析到真实文件；质量审计清单全部通过——无无关内容、无效操作、重复、沉积或蔓延；信息层级正确；完成标准可检查，关键处穷尽；无否定措辞（安全边界除外）。

## 与 speculo-write-workflows 的分工

两个 skill 的分工线是"包 vs 条目"：

| 职责 | speculo-write-workflows | speculo-write-work |
|------|------------------------|-------------------|
| INDEX.md 编写与 AUTO-INDEX 更新 | 负责 | 不负责 |
| Workflow 包结构和 `_state/` 骨架 | 负责 | 不负责 |
| Work 条目增删合并 | 负责 | 不负责 |
| 参考材料 COPY-then-adapt | 负责 | 不负责 |
| 运行 generate-index.mjs | 负责 | 不负责 |
| **Work 入口文件撰写** | 委托给本 skill | 负责 |
| **渐进披露子文件撰写** | 委托给本 skill | 负责 |
| **主导词提炼与职责定义** | 委托给本 skill | 负责 |
| **完成标准与信息层级设计** | 委托给本 skill | 负责 |
| **`<Path>` 指针验证** | 委托给本 skill | 负责 |
| **质量模型修剪审计** | 委托给本 skill | 负责 |

`speculo-write-workflows` 将 work 条目级别的创作委托给本 skill。本 skill 完成后，调用方负责运行 generate-index.mjs 更新 AUTO-INDEX。

## 参考材料

本 skill 的完整参考规范见同级 `references/work-entry-authoring.md`——包含 work 条目格式、frontmatter 字段、两种结构模式（单文件与渐进披露）、子文件规则、持久化约定、写作规则、质量审计清单和失败模式。

以下外部材料在步骤 1 加载，仅列出处不再展开：

- 质量模型：`<Path>{roots.skills}/_shared/authoring-quality.md</Path>`
- 包结构与 INDEX.md 规范：`<Path>{roots.skills}/speculo-write-workflows/references/workflow-authoring.md</Path>`
- 持久化根解析与产物边界：`<Path>{roots.skills}/speculo-write-workflows/references/persistence-contract.md</Path>`

- 参考实现（单文件/渐进披露）：specdev workflow 下 `S-spec/`、`G-grill-with-docs/`、`I-implement/`
