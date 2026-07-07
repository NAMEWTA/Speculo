# Workflow Authoring SOP

phase 的切分、完成准则与措辞遵循 `authoring-quality-levers.md` 的质量杠杆（**按序列拆分**隐藏后续步骤防过早完成、**完成标准**可检验且穷尽、**主导词**锚定调用与执行）；本文只补 workflow 特有的结构与路径约束。

## 入口结构

workflow 放在 `template/workflows/<cat>/`，`<cat>` 只能是 `dev`、`doc`、`person`。`ops` 是预留分类，只有 `.speculo` 骨架和 workflow 分类同时落地后才能启用。

目录和入口文件必须同名：

```text
template/workflows/<cat>/<entry>/<entry>.md
```

主线 workflow 使用数字前缀，如 `01-grill-with-docs`。横向 workflow 使用字母前缀，如 `H-diagnose`、`R-review`、`D-docs-sync`。

## Frontmatter

入口 frontmatter 只承载发现元数据：

```yaml
---
id: <cat>/<name>
category: <cat>
name: <人类可读名>
description: <一句话用途>
keywords: [<关键词>]
---
```

禁止把 phases、模板、依赖、状态字段写进 frontmatter。

## 正文必备章节

入口正文必须包含：

- `## 阶段`
- `## 依赖`
- `## 状态扩展字段`
- `## 完成与状态更新`

阶段条目必须写清：

- 稳定 phase id（kebab-case，用于 `current_phase`）
- 规范 phase 文件
- 模板路径
- 产物文件名
- 完成准则
- 可选 agent 文件（若该 phase 支持隔离执行）

## Phase 文件

phase 文件不需要 frontmatter。每个 phase 文件写清：

- 输入
- 产物
- 填写引导
- 边界
- 完成准则

phase 文件只放该阶段执行所需内容，不重复入口文件的全局说明。

## Workflow Agents

适合隔离执行、并行审查或反自证验证的 phase 可以创建：

```text
template/workflows/<cat>/<entry>/agents/<name>-agent.md
```

Agent 文件需要 frontmatter：

```yaml
---
id: <cat>/<entry>/<agent-name>
type: agent
name: <人类可读名>
description: <一句话说明该 agent 何时用于隔离执行>
---
```

正文必须包含：

- `## 使命`
- `## 输入契约`
- `## 执行规范`
- `## 产物与状态`
- `## 边界`

Agent 引用同目录 phase 文件、模板和 skill，不复制大段规范正文。Agent 只可写它声明的 phase 产物和 `.status.json` 扩展字段，不写 `change_status`。入口 `## 阶段` 必须列出对应 agent 相对路径。

## 模板

模板放在：

```text
template/workflows/<cat>/_templates/
```

命名：

```text
<name>-<artifact>-template.md
```

模板不写 frontmatter，顶部用归属说明：

```markdown
> **服务工作流：** `../<entry>/<entry>.md`
> **产物文件名：** `<artifact>.md`
```

模板占位符必须使用 `[TODO: ...]`。

## 持久化路径

workflow 产物写入：

```text
speculo/.speculo/<cat>/<change>/
```

当前 change 的状态写入：

```text
speculo/.speculo/<cat>/<change>/.status.json
```

顶层 active 索引写入：

```text
speculo/.speculo/<cat>-status.json
```

项目级规则、经验、上下文和 ADR 使用：

```text
speculo/.speculo/.config/RULES.md
speculo/.speculo/.config/LESSONS.md
speculo/.speculo/.config/context/
speculo/.speculo/.config/adr/
```

不要把新状态放到项目根目录。`.status.json` 元字段、顶层索引 schema 和写入责任表见 `persistence-contract-sop.md`。

`current_phase` 使用入口 `## 阶段` 声明的稳定 phase id；首个 workflow 进入 change 时写入 `execution_mode`。只有收尾 workflow 或 `archive` 命令可写 `change_status: completed | archived`，普通 workflow 只写自治状态字段。

## 索引与文档同步

新增 workflow 后检查：

- 对应分类的 `AGENTS.md` 是否需要新增别名
- `speculo/.speculo/<cat>-status.json` 和 `speculo/.speculo/<cat>/.gitkeep` 是否存在
- `speculo/.speculo/archive/<cat>/.gitkeep` 是否存在
- 项目若有 `docs/quick-reference.md` 等入口索引，是否需要新增条目
- CLI tests 是否需要断言复制新入口

## 完成线

- 入口 frontmatter 合规
- 正文必备章节齐全
- 所有跨文件引用使用相对路径
- 非模板文件不残留无说明 TODO
- 模板只保留 `[TODO: ...]` 占位符
- `pnpm test` 通过或记录无法运行原因
