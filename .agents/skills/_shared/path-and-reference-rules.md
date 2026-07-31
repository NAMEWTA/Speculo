# Path and reference rules

## 作者技能自身的链接

`.agents/skills` 内部使用普通相对 Markdown 链接。链接从当前文件所在目录解析，并必须指向 ZIP 内或当前仓库中真实存在的文件。

## 模板资产中的静态引用

安装时需要跨文件定位的引用使用：

```markdown
<Path>{roots.workflows}/specdev/S-spec/spec-template.md</Path>
```

允许的公共 alias 来自 `template/.speculo/workspace.json`：

- `{roots.config}`
- `{roots.speculo}`
- `{roots.state}`
- `{roots.commands}`
- `{roots.skills}`
- `{roots.workflows}`

不要发明 `{roots.agents}` 或其他未声明 alias。

## 解析方法

在仓库源中验证 `<Path>` 时使用以下映射：

```text
{roots.config}    -> template/config.json
{roots.speculo}   -> template/
{roots.state}     -> template/.speculo/
{roots.commands}  -> template/commands/
{roots.skills}    -> template/skills/
{roots.workflows} -> template/workflows/
```

包含 `{change}`、`{workflow}`、`{ticket}` 等运行时变量的路径，验证静态前缀、namespace 所有权和变量定义；不要求运行时实例存在。

## 路径类型

### 静态能力文件

指向 skill、command、workflow、work、rule、schema、tool 或模板文件。必须在当前 `template/` 中解析到真实文件。

### 运行时状态路径

指向 `{roots.state}/...`。它可以在仓库快照中尚不存在，但必须满足：

- namespace 有明确所有者；
- 生成者和时机在 command、INDEX 或 work 中说明；
- 变量在当前入口中定义；
- 路径不会穿越到其他 workflow 或 command 的私有 namespace。

### 项目路径

指向安装项目中的代码、测试或文档。使用项目根相对路径，或明确说明由用户/仓库探索得到。不得持久化机器绝对路径。

### 外部 URL

仅用于真实外部资源。需要执行时在线验证；canonical 可以保留 URL，但不能依赖 URL 提供能力运行所必需的未内联知识。

## Markdown 链接与 `<Path>`

- `.agents/skills` 的作者参考使用 Markdown 链接。
- `template/skills` 内部同一 skill 的渐进披露可以使用相对 Markdown 链接，前提是安装后目录关系保持不变。
- Workflow 的入口、work、common rules 与跨包能力引用统一使用 `<Path>`，以便 root 重映射。
- Command 调用 skill 时优先使用 `<Path>{roots.skills}/.../SKILL.md</Path>`，不要依赖 `../skills` 的位置偶然性。
- Canonical 生成时递归解析两种引用。

## 禁止形态与替代

| 不稳定形态 | 目标形态 |
|---|---|
| 机器绝对路径 | root alias 或项目根相对路径 |
| `..` 穿越到其他包 | 公共 root alias |
| 裸文件名或裸 work id | 完整 `<Path>` 或明确逻辑 id 字段 |
| `{roots.workflows}/<wf>/_state/...` 运行时写入 | `{roots.state}/<wf>/...` |
| `docs/*-authoring.md` 等不存在的契约 | 本技能包中的直接 reference |
| 指向生成 canonical 作为源 | 指向原始 skill/command/workflow 源 |

## 完整性检查

枚举每个修改文件中的：

1. Markdown 链接；
2. `<Path>` 标签；
3. 代码块中的脚本路径；
4. frontmatter 中的 id、workflow、名称；
5. AUTO-INDEX 和 canonical 的来源映射。

逐项解析。全部静态目标存在、全部动态目标有所有者和生成者时完成。
