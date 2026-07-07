# Workflow 编写指南（开发者向）

本文档面向**框架扩展者**：你想在 `template/workflows/<cat>/` 下新增一个多阶段 workflow。

## 创建步骤

```bash
mkdir -p template/workflows/<cat>/NN-<name>
touch template/workflows/<cat>/NN-<name>/NN-<name>.md
touch template/workflows/<cat>/NN-<name>/<name>-<phase>.md
touch template/workflows/<cat>/_templates/<name>-<artifact>-template.md
```

`<cat>` 必须是 `dev`、`doc` 或 `person`。`ops` 是预留分类，只有 `.speculo` 骨架和 workflow 分类同时落地后才能启用。文件夹使用 `NN-<kebab-name>` 或横向字母前缀，入口文件名必须与文件夹同名。

## 入口文件骨架

```markdown
---
id: <cat>/<name>
category: <cat>
name: <人类可读名>
description: <一句话用途>
keywords: [<关键词>]
---

# <工作流名>执行指引

<说明本工作流边界与 AI 进入时的前置动作。>

## 阶段

### 1. <Phase> — <说明>
- id：`<phase-id>`
- 规范：`<name>-<phase>.md`
- 模板：`../_templates/<name>-<artifact>-template.md`
- 产物：`<artifact>.md`
- agent：无，或 `agents/<phase-agent>.md`
- 完成准则：
  - `<artifact>.md` 无残留 `[TODO:]`
  - <可机械验证的完成条件>

## 依赖

- 软依赖：<相对路径或无>
- 硬依赖：<相对路径或无>

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `<field>` (<type>) — <含义>

## 完成与状态更新

- 进入 phase 时更新 `current_phase` 并追加 `phase_history`。
- phase 完成时写入 `completed_at` 与 `status: completed`。
- 全部 phase 完成后，按工作流边界移交下游；只有收尾 workflow 或 `archive` 命令可写 `change_status: completed | archived`。
```

## Frontmatter 字段

Frontmatter 仅承载发现元数据：

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | `<category>/<name>`，全局唯一 |
| `category` | 是 | `dev` / `doc` / `person` |
| `name` | 是 | 人类可读名 |
| `description` | 是 | 一句话用途 |
| `keywords` | 否 | 工具或 AI 匹配关键词 |

禁止在 frontmatter 中写 `phases`、`template`、`uses_skills`、`depends_on`、`status_extensions`。这些结构化信息全部写入正文。

## 阶段子文件命名

- 文件名：`<name>-<phase>.md`，例如 `prd-core.md`、`api-doc-schema.md`
- 子文件负责写清输入、产物、填写引导、边界、完成准则
- 子文件不需要 frontmatter

## 模板存放

- 模板放在 `template/workflows/<cat>/_templates/`
- 命名：`<name>-<artifact>-template.md`
- 模板顶部只写归属说明，然后是标题、章节、`[TODO: 具体填写指引]`

## 状态字段

`.status.json` 的强制元字段由 `docs/persistence-contract.md` 定义。workflow 自治字段只在入口正文 `## 状态扩展字段` 中声明，由执行者写入同一份 `.status.json`。

`current_phase` 使用入口 `## 阶段` 中声明的稳定机器 id（kebab-case），不要使用人类可读标题。首个 workflow 进入 change 时写入 `execution_mode`。

## Workflow Agents

适合隔离执行、并行审查或反自证验证的 phase 可以创建 agent 定义：

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

正文必须包含 `## 使命`、`## 输入契约`、`## 执行规范`、`## 产物与状态`、`## 边界`。Agent 引用同目录 phase 文件和模板，不复制大段规范；不写 `change_status`，只写它声明的 phase 产物和状态扩展字段。入口 `## 阶段` 必须列出对应 agent 相对路径。

## 完成准则

新增 workflow 前至少检查：

- 入口 frontmatter 符合 v2.1 极简契约
- 入口正文包含 `## 阶段` / `## 依赖` / `## 状态扩展字段` / `## 完成与状态更新`
- 所有跨文件引用使用相对路径
- 非模板文件不残留无说明的 TODO 占位符
- 模板占位符全部是 `[TODO: ...]`
