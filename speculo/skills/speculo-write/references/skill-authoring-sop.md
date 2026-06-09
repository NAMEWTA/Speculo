# Skill Authoring SOP

本文是 Speculo 原子 skill 的编写规范，复刻通用「编写技能」流程并收敛到 Speculo 约束。
本文已内化全部所需规范；编写 skill 时**不读仓库 `docs/`**，只读本 skill 的 `references/`。

## 流程

1. **收集需求** —— 向用户确认：
   - 这个 skill 覆盖什么任务 / 领域？
   - 应该处理哪些具体用例？
   - 这是可复用的原子能力，还是该升级为 workflow、退化为 command？判定见 `asset-selection-sop.md`。
   - 需要可执行脚本，还是只需要指令？
   - 有没有外部源技能要迁移？迁移规则见 `migration-sop.md`。

2. **起草 skill** —— 创建：
   - `SKILL.md`，含 Speculo frontmatter 与五个固定章节。
   - `SKILL.md` 接近 500 行时，把细节拆进 `references/`。
   - 需要确定性操作时，加 `scripts/`。

3. **与用户审查** —— 展示草稿并问：
   - 覆盖你的用例了吗？
   - 有遗漏或不清楚的地方吗？
   - 哪些章节该更详细 / 更简洁？

## 入口结构

skill 放在：

```text
speculo/skills/<name>/SKILL.md
```

目录名用 lowercase kebab-case。整个 skill 目录必须**自包含**：复制到任何项目、只读 `SKILL.md` 即可判断是否使用、需要哪些输入、产生什么输出，不依赖本仓库的 `docs/` 或任何外部文件。

```text
<name>/
├── SKILL.md              # 主指令（必需）
├── references/           # 详细规范 / 变体（按需）
│   └── <task>-sop.md
├── scripts/              # 确定性工具脚本（按需）
└── examples/             # 示例输入输出（按需）
```

## Frontmatter

```yaml
---
id: <name>
type: skill
name: <人类可读名>
description: <一句话能力说明；含触发场景，第三人称，可与相近 skill 区分>
---
```

description 是 **agent 决定加载哪个 skill 时唯一能看到的内容**，会和其它已装 skill 一起出现在系统提示里。给 agent 刚好够用的信息：(1) 提供什么能力，(2) 何时 / 为何触发（具体关键词、上下文、文件类型）。

格式：

- 最多 1024 字符
- 第三人称
- 第一句：做什么
- 第二句：「当 [具体触发条件] 时使用」

**好的例子**：

```
创建或改造 Speculo workflows、skills、commands 的原子能力；当用户要求迁移外部技能或新增 workflow / skill / command 时使用。
```

**坏例子**：

```
帮助处理技能。
```

坏例子让 agent 无法把这个 skill 和其它 authoring 类 skill 区分开。

## 正文结构

`SKILL.md` 保持精简，五个固定章节：

- `## 何时使用`
- `## 输入`
- `## 输出`
- `## 执行步骤`
- `## 渐进披露`

模板：

```markdown
---
id: <name>
type: skill
name: <人类可读名>
description: <能力 + 触发场景，第三人称>
---

# <技能名>

## 何时使用

[触发场景；列几条典型用户请求]

## 输入

[需要的输入。本 skill 自带规范，不外读 docs/]

## 输出

[产生什么产物 / 决策 / 检查清单]

## 执行步骤

1. [最小可工作主流程]
2. ...

## 渐进披露

- `references/<task>-sop.md`：<何时读取>
```

## 渐进披露

所有 reference 都从 `SKILL.md` 直接引用，**单层**，不做多层隐藏。

拆分 reference 的条件：

- `SKILL.md` 接近 500 行
- 内容覆盖多个主题或变体（例如不同资产类型的写法）
- 细节只在特定场景才需要
- 源材料较长，但可以按需读取

reference 文件用 kebab-case，**按任务而非来源**命名（`workflow-authoring-sop.md`，不是 `from-specforge.md`）。

## 何时添加脚本

**加 `scripts/`**，当操作确定且反复执行：

- frontmatter 校验
- 路径残留扫描
- 模板命名检查
- JSON schema 检查

脚本比反复生成代码更省 token、更可靠，且失败可以显式处理。

**不加 `scripts/`**，当能力主要是判断 / 设计 / 策略 / 协作：

- 规范判断
- 文档结构设计
- 迁移和融合策略
- 人机协作 SOP

## 迁移外部 Skill

迁移时**保留**：

- 触发场景
- 关键输入输出
- 铁律、边界、失败处理
- 可复用命令、检查表、模板片段

迁移时**改写**：

- 外部工具名绑定
- 旧目录布局
- 旧 state 路径
- 不符合 Speculo frontmatter 的元数据
- 脱离调用方的持久化路径、`temp/` 输出、项目根目录 state 和其它散落写入行为

多个源技能融合为一个原子 skill 时：入口 `SKILL.md` 只留统一触发与主流程，源技能细节按主题拆进 `references/`，合并重复铁律并保留更严格者。

## 持久化边界

skill **禁止自行选择**持久化位置，包括：

- `.speculo/<cat>/<change>/`
- `.speculo/commands/`
- `.speculo/*-status.json`
- `.status.json`
- `temp/`、系统临时目录或项目根目录

如果某能力需要生成文件型持久化产物，必须满足其一：

- 调用方 workflow / command 声明规范目标路径，skill 只写入该路径。
- skill 返回内容、摘要和建议文件名，由调用方写入 `.speculo/...`。

无论哪种方式，持久化产物都不得落到 `temp/`、系统临时目录、项目根目录或其它非 Speculo 规范位置。完整写入责任表见 `persistence-contract-sop.md`。

## 审查清单

起草后检查：

- [ ] description 含触发条件（「当……时使用」），可与相近 skill 区分
- [ ] frontmatter 是 Speculo 最小集（`id` / `type: skill` / `name` / `description`）
- [ ] `SKILL.md` 含五个固定章节，整体精简（细节已外移）
- [ ] reference 单层引用，按任务命名
- [ ] **自包含**：不引用 `docs/` 或仓库外文件
- [ ] skill 没有自选持久化目录；文件型产物由调用方写入或写入调用方声明的 `.speculo/...` 路径
- [ ] 没有 README / INSTALLATION / CHANGELOG 等冗余文件
- [ ] 没有时效性信息、旧项目路径、旧工具名或绝对路径绑定
- [ ] 术语一致、含具体示例、引用只有一层深度
- [ ] 若是内置资产，CLI tests 覆盖复制该 skill
