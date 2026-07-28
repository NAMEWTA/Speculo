# Speculo Canonical Authoring Contract

## Prerequisites

编写 canonical 文档前必须读取：
- [AGENTS.md](../AGENTS.md) — 代理手册
- [canonical/README.md](../template/canonical/README.md) — canonical 格式规范
- [.agents/skills/speculo-write-canonical/SKILL.md](../.agents/skills/speculo-write-canonical/SKILL.md) — 生成流程权威
- [.agents/skills/_shared/authoring-quality.md](../.agents/skills/_shared/authoring-quality.md) — 质量模型

## When to Canonicalize

- 需要将某个 skill、command 或 workflow 上传到仅支持单文件的 AI 平台时（如 ChatGPT Projects、Claude Projects、NotebookLM）。
- 需要归档某个能力的完整定义快照，用于版本对比或分发时。
- 跨团队共享能力定义，且接收方不运行 Speculo CLI 时。

Canonical 文档是源文件的分发快照。源文件仍是权威定义，canonical 文档从源文件生成，随源文件更新而重新生成。

## Canonical Document Structure

输出是**纯 Markdown 文档**，不使用 `<canonical>` / `<source-file>` XML 容器：

```markdown
# <能力名称>

<主入口文件的正文，已去除 YAML frontmatter。
其中所有 <Path>...</Path> 标签替换为自然语言描述，
所有文件引用替换为指向文末隔离标签的说明。>

---

## 参考内容

<sub-file-name>

<sub-file 完整正文，无 frontmatter>

</sub-file-name>
```

### 关键规则

| 规则 | 说明 |
|------|------|
| 纯 Markdown | 不使用 `<canonical>` 或 `<source-file>` 包裹标签 |
| 无 YAML frontmatter | 去除所有源文件的 `---` 元数据块 |
| 无 `<Path>` 标签 | 替换为自然语言描述（如「读取变更目录下的 CONTEXT.md」） |
| 子文件 XML 隔离 | 用 `<filename>...</filename>` 包裹内联内容；标签名取文件名去 `.md`，kebab-case |
| 单文件自包含 | 全量内联，无外部依赖，无渐进式披露 |

### 文件选择

| 文件类型 | 处理 |
|----------|------|
| 主入口（SKILL.md / INDEX.md / work .md / command .md） | 作为文档主体，去 frontmatter |
| `references/*.md`、`routes/*.md`、`atomic-skills/*.md` | 内联至「参考内容」，用 XML 标签隔离 |
| `assets/*.json` | 内联至「参考内容」 |
| `_state/`、`.speculo/`、`.gitkeep`、`node_modules/` | 排除 |

## Quality Requirements

按 [authoring-quality.md](../.agents/skills/_shared/authoring-quality.md) 的质量模型：

- **可预测性**：同一源目录多次生成产生语义等价结果。
- **单一事实来源**：源文件为权威，canonical 是只读快照；不对语义做修改。
- **就近放置**：所有源文件内容在单个文档内，LLM 无需外部访问。
- **完成标准**：全文无 `<Path` 残留；无 Speculo frontmatter 残留；每个被引用子文件有对应 XML 隔离标签；主入口引用已改为「参见下方 `<xxx>`」。

## Validation

- 全文搜索 `<Path` 结果为 0
- 全文搜索 `---\nid:` / `---\ntype:` 无 frontmatter 残留
- 无空双反引号占位（`` `` ``）——路径必须是自然语言描述
- 子文件 XML 标签名与源文件名一致（去 `.md`）

## Automation

**推荐流程**：按 `.agents/skills/speculo-write-canonical/SKILL.md` 手动拼接。

## 跨 workflow 引用

若能力引用其他 workflow 的文件，在文档开头注明建议的配套上传文件和 GitHub 仓库地址。
