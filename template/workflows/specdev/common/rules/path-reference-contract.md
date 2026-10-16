# SpecDev 路径引用契约

本规则是 SpecDev 中“文件、目录、工件与工具引用”的唯一规范。入口 work、子流程、模板、规则、Schema、Skill、工具说明和治理文档均必须遵守。

## 直接使用与根

先明确 projectRoot、methodRoot（方法包根）、stateRoot（领域共同数据父根）；specdevRoot 为 stateRoot/specdev，不持久化新 context JSON。已安装时验证真实 workspace，显式参数与安装 roots 冲突即拒绝；无安装时方法资源可只读，业务写入仍限获批项目内根。相对参数统一基于 projectRoot，不静默改用 cwd 或另一项目。实际路径逐层检查链接、大小写、父类型、包含关系、已有目标与有关事务；仅字符串前缀不足以证明安全。

{roots.*} 只使用既有 alias。安装时来自 workspace；完整离线包由导出资源映射解析；普通自包含 Work 的 references/assets/scripts 相对 Skill 根。没有明确写根仍可只读审查，缺 Node/摘要工具可提供草案但不能伪造检查通过。诊断可显示绝对路径，持久工件使用项目相对或对象内 locator。

## 1. 工作流目录中的引用

引用 `<Path>{roots.workflows}/specdev/</Path>` 下的任何文件或目录时，必须写出完整根变量与完整相对路径：

```text
<Path>{roots.workflows}/specdev/<relative-path></Path>
```

正确示例：

- `<Path>{roots.workflows}/specdev/specdev-i-init-setup/assets/config-template.json</Path>`
- `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/orchestration-protocol.md</Path>`
- `<Path>{roots.workflows}/specdev/common/schemas/ticket.schema.json</Path>`
- `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>`
- `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`

不得使用：

- 裸文件名；
- 未声明相对基准的跨包路径；
- 仅写目录名；
- 跨包偶然目录关系的 Markdown 相对链接；
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

嵌套安装反例：项目根 `.speculo/specdev` 不是状态根。change 必须位于 `<Path>{roots.state}/specdev/changes/{change}/</Path>` 或新归档 `<Path>{roots.state}/specdev/changes/archive/{change}/</Path>`；旧 `<Path>{roots.state}/specdev/archive/YYYY-MM/{change}/</Path>` 只读保留。

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

历史会话的只读外部 locator 是限定例外：可记录准确确认的原始会话日志绝对路径，按 <Path>{roots.references}/coordination/session-files.md</Path> 检索。它不使用内部 Path 标签，不是可移植项目路径、静态能力依赖或写入授权；新派遣在任务目录的 session-locator.json 中仅记录 path 字段，不复制原日志；既有项目内历史副本保留正常工件路径。

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

## 9. 与标准 Skill 的分发边界

本文件是 SpecDev 内部动态工件协议，不是通用 Agent Skills 的文件格式规范。独立标准 Skill 的静态 references/assets 使用相对路径；workflow 私有 Skill 声明 compatibility 后继续使用本 Path 合同。已有持久化引用不批量迁移。

已有安装可选使用只读 `speculo resolve <project-root> --path '<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>'` 展开单个指针。解析器先打开字面 workspace 路径，拒绝未知 alias、未替换变量、通配符、越界路径与链接跳转；不执行 shell、不授予文件写入权限。完整命令由已获授权调用方使用参数数组构造，不把 Path 标记或用户文本直接交给 shell。


change 内 Markdown 点击链接相对当前文件，对象内 locator 相对稳定 change 根；项目文件 locator 相对项目根，二者不得混淆。新归档移动后通过稳定名称与实际唯一位置解析；不改不可变批准、revision 或原型摘要绑定字节。旧 archive 只读解析保留原格式，不能凭空合成新 Outcome。链接可迁移不等于授权可迁移，真实 owner 与写集仍需核对。
