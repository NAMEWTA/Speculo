# SpecDev 路径引用契约

本规则是 SpecDev 中“文件、目录、工件与工具引用”的唯一规范。入口 work、子流程、模板、规则、Schema、Skill、工具说明和治理文档均必须遵守。

## 1. 工作流目录中的引用

引用 `<Path>{roots.workflows}/specdev/</Path>` 下的任何文件或目录时，必须写出完整根变量与完整相对路径：

```text
<Path>{roots.workflows}/specdev/<relative-path></Path>
```

正确示例：

- `<Path>{roots.workflows}/specdev/I-init-setup/config-template.json</Path>`
- `<Path>{roots.workflows}/specdev/P-goal-plan/orchestration-protocol.md</Path>`
- `<Path>{roots.workflows}/specdev/common/schemas/ticket.schema.json</Path>`
- `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>`
- `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`

不得使用：

- 裸文件名；
- 相对路径；
- 仅写目录名；
- 指向内部文件的 Markdown 相对链接；
- 省略 Path 标签的反引号路径。

## 2. 状态目录中的引用

引用 `<Path>{roots.state}/specdev/</Path>` 下的任何持久化工件或目录时，必须写成：

```text
<Path>{roots.state}/specdev/<relative-path></Path>
```

正确示例：

- `<Path>{roots.state}/specdev/config.json</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`
- `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`
- `<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/</Path>`

目录引用必须以 `/` 结束；文件引用不得以 `/` 结束。

## 3. 项目代码路径

SpecDev 不假定运行时一定提供项目根变量。Ticket、Evidence、诊断与架构审查中的项目代码路径统一使用项目相对路径，并仍置于 Path 标签中：

```text
<Path>src/example/module.ts</Path>
<Path>packages/example/**</Path>
```

禁止写入机器绝对路径。行号只能作为近似导航信息，不能成为长期契约。

## 4. 外部来源

外部网页或仓库 URL 使用 Url 标签：

```text
<Url>https://example.com/reference</Url>
```

外部 URL 不能伪装成 SpecDev 内部路径；内部文件也不能用 URL 代替完整 Path 标签。

## 5. 工件名称与工件引用

可以在概念层面写“Spec”“Ticket”“Goal Plan”“Evidence”。一旦语句指向具体文件、目录、模板、Schema、工具或状态工件，就必须给出完整 Path 标签。

例如：

- 概念：Ticket 是单一垂直切片的执行契约。
- 具体引用：当前 Ticket 位于 `<Path>{roots.state}/specdev/changes/{change}/ticket/{ticket-file}.md</Path>`。

## 6. 模板、代码块与机器可读文件

路径规范同样适用于：

- Markdown 表格；
- YAML frontmatter 示例；
- JSON 示例中的 SpecDev 工件值；
- 命令代码块中的 SpecDev 输入或输出路径；
- HTML 模板中的说明文本；
- Skill 的持久化输出模板。

命令需要真实运行时路径时，由执行环境解析 Path 标签内容；规范文件不得将根变量提前展开成机器绝对路径。

以下机器协议字段不属于叙述性文件引用，可以保留其协议原生格式：

- JSON Schema 的 `$schema` 与 `$id` URI；
- Python、Shell 或其他工具源码中的模块名、常量、文件匹配模式和运行时路径运算；
- 语言本身要求的 import、package、namespace 或协议标识；
- 仅存在于进程内部、不会写入 SpecDev 工件的实现字符串。

这些例外不得被用于绕过治理：一旦工具向 Markdown、JSON 状态或其他持久化工件输出具体 SpecDev 引用，输出值仍必须符合本契约。

## 7. 引用与所有权是两件事

完整 Path 只解决“引用对象是谁”，不授予修改权限。执行者必须同时遵守 `<Path>{roots.workflows}/specdev/common/rules/path-ownership.md</Path>` 中的 writable、read-only 与 shared owner 约束。

## 8. 自动检查

`<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>` 的包级自检至少检查：

- 工作流引用是否使用完整 `<Path>{roots.workflows}/specdev/...</Path>`；
- 状态引用是否使用完整 `<Path>{roots.state}/specdev/...</Path>`；
- 项目路径示例是否使用 Path 标签；
- 是否存在指向内部文件的相对 Markdown 链接；
- 工作流引用目标是否真实存在；
- 是否仍引用已移除目录或文件；
- Path 标签是否闭合；
- 目录引用是否以 `/` 结束且文件引用是否不以 `/` 结束。

路径检查通过仅表示引用结构正确，不代表工件语义、需求、设计或实现正确。
