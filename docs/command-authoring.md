# Command 编写指南（开发者向）

本文档面向**框架扩展者**：你想在 `speculo/commands/` 下新增一个单步 command。

## 创建步骤

```bash
touch speculo/commands/<name>.md
```

Command 必须是单文件。只要需要多阶段状态机、多个子规范或跨天交付，就升级为 workflow。

## 文件骨架

```markdown
---
id: <name>
type: command
name: <人类可读名>
description: <一句话用途>
keywords: [<关键词>]
---

# <Command> 命令

## 归档路径模式

产物归档至：`../.speculo/commands/<YYYY-MM-DD>-<command>-<topic>/`

## 调用的 skills

- 无

## 执行步骤

1. <读取哪些状态或输入>
2. <如何处理>
3. <输出什么>

## 产物模板（artifact.md）

> **服务命令：** `<name>.md`
> **产物文件名：** `artifact.md`

# <Artifact>

## <章节>
[TODO: 具体填写指引]
```

## Frontmatter 字段

Command frontmatter 仅包含发现元数据：`id`、`type: command`、`name`、`description`、可选 `keywords`。调用 skill、输出文件、破坏性边界全部写在正文。

## 内联模板

Command 产物模板内联在文件末尾，适合 `status` 快照、`archive` 报告这类单次产物。模板占位符必须使用 `[TODO: ...]`。

## 调用 Skills

如需复用 skill，在正文 `## 调用的 skills` 中用相对路径列出，并说明何时读 `SKILL.md`。skill 输出归档到本 command 的产物目录；skill 自身不写 `.speculo/`。

## 破坏性操作

涉及目录移动、文件删除、外部 API 调用、发布、归档的 command，必须：

- 先列出影响清单
- 明确说明将修改哪些路径或外部资源
- 等待用户确认
- 执行后写报告

参考 `speculo/commands/archive.md`。
