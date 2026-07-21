# Canonical — AI 平台单文件分发格式

Canonical 格式将 Speculo 多文件能力（skill、command、workflow）合并为**自包含的单 MD 文档**，可直接上传到仅支持单文件的 AI 平台（ChatGPT Projects、Claude Projects、NotebookLM 等），上传后平台即可获得该能力的完整定义与知识背景。

## 与源文件的关系

| | 源文件（`skills/`、`commands/`） | Canonical 文档 |
|---|---|---|
| 形态 | 多文件目录结构 | 单文件 MD |
| 内容 | 原始分片文件 + 跨文件引用 | 主入口 + 所有引用文件内联合并 |
| 用途 | Speculo 运行时加载与组合 | AI 平台上传分发 |
| 更新 | `speculo init` 覆盖刷新 | 按需从源文件重新生成 |

Canonical 文档是源文件的**透明容器**——去除 Speculo 内部元数据（YAML frontmatter、`<Path>` 标签），用简单 XML 隔离标签区分不同来源文件的内容。

## 文档结构

```markdown
# <能力名称>

<主入口文件正文（已去除 YAML frontmatter）。其中：
- 所有 <Path> 标签已替换为纯文本描述
- 所有文件引用已替换为"参见下方 <xxx> 标签"
- 标准 Markdown 书写规范>

---

## 参考内容

<子文件名>

<子文件的完整正文（已去除 YAML frontmatter，保留 Markdown 格式）>

</子文件名>

<另一子文件>

<另一子文件的完整正文>

</另一子文件>
```

### 关键规则

- **纯 Markdown 文档**：不使用 `<canonical>` 或 `<source-file>` 包裹标签。它就是一份普通 MD 文件。
- **无 YAML frontmatter**：去除所有源文件的 `---` 元数据块。这是 Speculo 内部标记，AI 平台不需要。
- **无 `<Path>` 标签**：将 `<Path>{roots.xxx}/path/</Path>` 替换为自然语言描述。
- **子文件 XML 隔离**：被引用的子文件用 `<filename>...</filename>` 包裹，标签名取文件名去 `.md` 扩展名。
- **单文件自包含**：所有引用内容全量内联，无外部依赖，无渐进式披露。

## 文件处理规则

| 文件类型 | 处理方式 |
|----------|----------|
| 主入口文件（SKILL.md / INDEX.md / work .md） | 作为文档主体，去除 frontmatter |
| `references/*.md` | 内联至文末，用 XML 标签隔离 |
| `routes/*.md` | 内联至文末，用 XML 标签隔离 |
| `atomic-skills/*.md` | 内联至文末，用 XML 标签隔离 |
| `assets/*.json` | 内联至文末，用 XML 标签隔离 |
| `_state/`、`.speculo/`、`.gitkeep` | 排除——运行时状态，非能力定义 |

## 生成方法

按 `speculo-write-canonical` skill 的流程手动拼接：

1. 读取能力源目录，识别主入口和所有被引用文件
2. 去除所有 YAML frontmatter
3. 替换所有 `<Path>` 为纯文本描述
4. 将子文件内容内联至文末，用 XML 隔离标签包裹
5. 质量检查：无 `<Path>` 残留、无 frontmatter 残留、所有引用已内联

详细说明见 `.agents/skills/speculo-write-canonical/SKILL.md`，格式示例见该 skill 的 `references/canonical-example.md`。

## 上传到 AI 平台

| 平台 | 上传方式 |
|------|----------|
| **Claude Projects** | 项目设置 → Knowledge → 上传文件，或将内容粘贴到 Project Instructions |
| **ChatGPT 自定义 GPT** | Configure → Knowledge → Upload files |
| **NotebookLM** | 新建笔记本 → 添加来源 → 上传文件 |
| **其他平台** | 查找"上传知识库""添加文档""自定义指令"等功能入口 |

上传 canonical 文档后，平台即可基于完整的能力定义回答问题或执行任务。

## 注意事项

- **Workflow 体积**：workflow 文件较多，生成的 canonical 文档较长。这属于预期行为——自包含性优先于简洁性。
- **跨 workflow 引用**：如果能力引用了其他 workflow 的文件，在文档开头注明建议的配套上传文件和 GitHub 仓库地址。
