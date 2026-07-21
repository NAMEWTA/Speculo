---
name: speculo-write-canonical
description: 将 Speculo 多文件能力（skill/command/workflow）合并为自包含单 MD 文档，上传到网页 AI 平台（ChatGPT Projects、Claude Projects、NotebookLM）使用。触发：用户要求生成 canonical 文档、要求将能力打包为单文件、或要求上传能力到 AI 平台时。
---

# Speculo Write Canonical

将 Speculo 多文件能力合并为**自包含的单 MD 文档**，可直接上传到网页 AI 平台作为知识附件。输出是纯 Markdown 文档，不使用 `<canonical>` XML 容器——它就是一份普通 MD 文件，平台直接解析。

## 过程

### 1. 审计源目录

读取能力目录，识别：
- **主入口文件**：skill 的 `SKILL.md`、workflow 的 `INDEX.md`、work entry 的 `<Name>.md`、command 的单文件 `.md`
- **被引用文件**：主入口中通过路径引用的 `references/*.md`、`routes/*.md`、`atomic-skills/*.md` 等——在主入口中搜索 `](references/`、`](routes/` 等链接模式找到它们
- **排除**：`_state/`、`.speculo/`、`.gitkeep`、`.DS_Store`、`node_modules/`

完成标准：主入口已识别，所有被引用文件清单完整，排除列表正确。

### 2. 读取全部源内容

逐个读取主入口和所有被引用文件。记录每个文件的：
- 文件名（用作隔离标签名，去 `.md` 扩展名，kebab-case）
- 去掉 YAML frontmatter 后的正文内容

完成标准：所有文件内容已读取，frontmatter 块已标记待去除。

### 3. 生成合并文档

按以下结构输出单个 MD 文件：

```
# <能力名称>

<主入口文件的正文，已去除 YAML frontmatter。其中所有 <Path>...</Path> 
标签替换为纯文本描述，所有文件引用替换为指向文末隔离标签的说明。>

---

## 参考内容

<每个被引用文件的内容，用 XML 隔离标签包裹。>
```

**具体规则：**

- **去除所有 YAML frontmatter**：删除每个源文件开头的 `---` 块。这是 Speculo 内部元数据，网页平台不需要。
- **`<Path>` 替换为纯文本**：将 `<Path>{roots.xxx}/path/to/file</Path>` 替换为自然语言描述。例如 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` → "同步更新 LOG.md"。`{change}` 等变量直接描述其含义即可。
- **文件引用替换为内联标签引用**：将 `[某文档](references/xxx.md)` 替换为 "参见下方 `<xxx>` 标签中的完整内容"。目标是将所有需要的外部知识内联到本文档中。
- **子文件用 XML 隔离标签包裹**：在主文档末尾，每个被引用文件用 `<文件名（去.md）>...</文件名>` 包裹。标签名取自文件名去扩展名，kebab-case。例如 `references/grilling-protocol.md` → `<grilling-protocol>...</grilling-protocol>`。
- **标签内保留完整 markdown**：XML 隔离标签内的内容保留原始 markdown 格式（标题、列表、代码块等），仅去掉 YAML frontmatter。

**输出格式示意：**

```markdown
# 设计访谈（带文档）

组合 work——grilling 访谈技术 + domain-modeling 领域建模规程...

## 流程

### 1. 启动变更

创建变更目录，初始化三个文档：ADR.md、LOG.md、CONTEXT.md。

### 2. 访谈

使用 grilling 访谈协议进行设计访谈。完整协议见下方 <grilling-protocol> 标签。

### 3. 捕获文档

按领域建模规程维护三个文档。完整规程见下方 <domain-modeling-rules> 标签。

---

## 参考内容

<grilling-protocol>

# 访谈协议

...（grilling-protocol.md 的完整正文，无 frontmatter）...

</grilling-protocol>

<domain-modeling-rules>

# 领域建模规程

...（domain-modeling-rules.md 的完整正文，无 frontmatter）...

</domain-modeling-rules>

<adr-format>

# ADR.md 格式

...（adr-format.md 的完整正文，无 frontmatter）...

</adr-format>
```

### 4. 质量检查

- 全文搜索 `<Path` — 必须为 0 结果
- 全文搜索 `---\nid:` 或 `---\ntype:` — 必须无 Speculo frontmatter 残留
- 每个被引用文件都有对应的 XML 隔离标签
- 主入口中的文件引用已替换为"参见下方 `<xxx>`"
- XML 标签名与源文件名一致（去 .md）

完成标准：无 `<Path>` 残留、无 frontmatter 残留、所有引用已内联。

## 输出格式规范

| 规则 | 说明 |
|------|------|
| 纯 Markdown | 不使用 `<canonical>` 或 `<source-file>` 包裹标签 |
| 无 YAML frontmatter | 去除所有 `---` 元数据块 |
| 无 `<Path>` 标签 | 替换为自然语言纯文本描述 |
| 子文件 XML 隔离 | 用 `<filename>...</filename>` 包裹内联内容 |
| 单文件自包含 | 全量内联，无外部依赖，无渐进式披露 |
| 标签命名 | 取文件名去 `.md` 扩展名，kebab-case |

## 上下文说明

生成的 canonical 文档是上传到网页 AI 平台的**知识附件**——平台在每次对话中都会加载它。因此：
- 内容应自包含，不依赖用户额外提供文件
- 但如果能力涉及跨 workflow 引用（如 W-wayfinder 引用 G-grill-with-docs 的子文件），在文档开头注明建议的配套上传文件和 GitHub 仓库地址
- 确保去除所有仅对 Speculo CLI 运行时有效的内部标记

## 参考

- 示例 canonical 文档：见 [references/canonical-example.md](references/canonical-example.md)
- 质量模型：见 [../_shared/authoring-quality.md](../_shared/authoring-quality.md)
