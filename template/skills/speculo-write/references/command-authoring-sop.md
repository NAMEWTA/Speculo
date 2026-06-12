# Command Authoring SOP

## 入口结构

command 是单个 Markdown 文件：

```text
template/commands/<name>.md
```

只要需要多阶段状态机、多个子规范或跨天交付，就升级为 workflow。

## Frontmatter

```yaml
---
id: <name>
type: command
name: <人类可读名>
description: <一句话用途>
keywords: [<关键词>]
---
```

frontmatter 只写发现元数据。调用 skill、产物路径和破坏性边界写正文。

## 正文结构

command 正文包含：

- `## 归档路径模式`
- `## 调用的 skills`
- `## 执行步骤`
- `## 产物模板`

产物路径默认：

```text
speculo/.speculo/commands/<YYYY-MM-DD>-<command>-<topic>/
```

在 command 文件中写路径时，使用 `speculo/.speculo/commands/<YYYY-MM-DD>-<command>-<topic>/`。命令产物禁止写入 `temp/`、系统临时目录、项目根目录或其它非 Speculo 规范位置。

## 调用 Skill

如需复用 skill，用相对路径列出：

```markdown
- `../skills/<name>/SKILL.md`：<何时读取>
```

skill 输出如需持久化，归档到 command 产物目录。command 可以把 skill 返回内容写入该目录；若 skill 负责生成文件，command 必须显式提供规范目标路径。禁止 skill 默认写入 `temp/`、系统临时目录或项目根目录。

## 破坏性操作

涉及目录移动、删除、外部 API、发布或归档时，command 必须：

1. 先列影响清单
2. 明确将修改哪些路径或外部资源
3. 等待用户确认
4. 执行后写报告

没有确认时只输出计划，不执行破坏性动作。

## 内联模板

command 产物模板内联在文件末尾。模板占位符使用 `[TODO: ...]`。

适合内联模板的产物：

- status 快照
- archive 报告
- handoff 文档
- 一次性操作报告

不适合 command 的产物：

- 多阶段 PRD
- TDD log
- 文档同步状态
- 跨多轮写作稿件

这些应由 workflow 管理。

## 更新检查

新增 command 后检查：

- 项目若有 `docs/quick-reference.md` 等入口索引，是否需要新增条目
- README 内置入口列表
- CLI tests 是否需要断言复制该 command
- 是否需要新增 command 调用的 skill
- 归档路径是否位于 `speculo/.speculo/commands/<YYYY-MM-DD>-<command>-<topic>/`
- 被调用 skill 是否没有自选 `temp/`、系统临时目录或项目根目录作为持久化位置

`speculo/.speculo/commands/` 归档路径、frontmatter 最小集与写入责任见 `persistence-contract-sop.md`。
