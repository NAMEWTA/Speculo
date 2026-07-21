# Canonical — AI 平台单文件分发格式

Canonical 格式将 Speculo 多文件能力（skill、command、workflow）打包为**自包含的单 MD 文档**，可直接上传到仅支持单文件的 AI 平台（ChatGPT Projects、Claude Projects、NotebookLM 等），上传后平台即可获得该能力的完整定义与知识背景。

## 与源文件的关系

| | 源文件（`skills/`、`commands/`） | Canonical 文档 |
|---|---|---|
| 形态 | 多文件目录结构 | 单文件 MD |
| 内容 | 原始分片文件 + 跨文件引用 | 所有源文件 XML 包裹后拼接 |
| 用途 | Speculo 运行时加载与组合 | AI 平台上传分发 |
| 更新 | `speculo init` 覆盖刷新 | 按需从源文件重新生成 |

Canonical 文档是源文件的**透明容器**——不修改原始内容，仅用 XML 标签包裹拼接。

## XML 标签结构

```xml
<canonical id="<capability-id>" type="skill|command|workflow">
  <source-file path="<相对路径>" order="<N>" content-type="<类型>">
  ...
  </source-file>
</canonical>
```

| 标签 | 属性 | 说明 |
|------|------|------|
| `<canonical>` | `id` | 能力标识符，与源入口 frontmatter 的 `id` 或 `name` 一致 |
| | `type` | 能力类型：`skill`、`command`、`workflow` |
| `<source-file>` | `path` | 源文件相对于能力根目录的路径，使用正斜杠 |
| | `order` | 读取顺序，从 1 开始；主入口文件始终为 1 |
| | `content-type` | 可选。文件内容类型：`markdown`（默认）、`json`、`javascript`、`shell` |

### 关键规则

- `<canonical>` 直接放在 markdown 正文中，**不在 code fence 内**。这与 Speculo 现有的 `<sequence>`、`<persistence>` 等 XML 标签用法一致，LLM 可直接解析。
- 每个源文件的 YAML frontmatter 原样保留在 `<source-file>` 内，不做合并或转换。
- `order` 从 1 连续递增；主入口文件（`SKILL.md` / `INDEX.md` / command 单文件）的 `order` 始终为 `1`。
- `path` 编码原始目录层级（如 `references/audit-rules.md`），LLM 通过 `path` 匹配跨文件引用。
- 源文件内容中的 markdown 链接**保留原文不重写**。LLM 通过 `<source-file path="...">` 标签定位被引用内容。

## 文件包含规则

| 文件类型 | 是否包含 | 说明 |
|----------|----------|------|
| `SKILL.md`、`INDEX.md`、command `.md` | 总是 | 主入口文件 |
| `references/*.md` | 总是 | 被主入口引用的参考文档 |
| `*.md`（work entry） | 总是（仅 workflow） | work 条目入口文件及其渐进披露子文件 |
| `assets/*.json` | 包含 | 添加 `content-type="json"` |
| `scripts/*.mjs`、`scripts/*.sh` | 小脚本包含，大脚本摘要 | 判断标准：< 200 行直接包含，否则写描述性摘要 |
| `_state/`、`.speculo/`、`.gitkeep` | 排除 | 运行时状态，非能力定义 |

## 示例

参见 [canonical-skill-example.md](./canonical-skill-example.md)——以 `archive-and-consolidate` skill 为示例的完整 canonical 化成品。

## 如何创建 Canonical 文档

### 自动创建（推荐）

```bash
node scripts/canonicalize.mjs template/skills/archive-and-consolidate --type skill
```

默认输出到 stdout；加 `--output <file>` 写入文件：

```bash
node scripts/canonicalize.mjs template/skills/agents-md-builder --type skill --output canonical-agents-md-builder.md
```

脚本自动发现目录下所有文件，按主入口 → references → assets → scripts 排序，包裹 XML 标签后输出。

### 手动创建

1. 复制下方骨架模板：

```xml
<canonical id="<id>" type="<skill|command|workflow>">
  <source-file path="<entry-filename>" order="1">
  </source-file>
</canonical>
```

2. 将主入口文件（`SKILL.md` / `INDEX.md` / command `.md`）的全部内容粘贴到 `<source-file order="1">` 内。
3. 为每个附加文件追加 `<source-file path="..." order="N">`，将文件内容粘贴进去。
4. 检查内容中的 XML 特殊字符（`&`、`<`、`>`）已正确转义为 `&amp;`、`&lt;`、`&gt;`。
5. 保存为 `.md` 文件，上传到目标 AI 平台。

## 跨文件引用处理

源文件之间常有 markdown 链接引用（如 `[audit rules](references/audit-rules.md)`）。Canonical 文档中这些链接**保持原文不动**。LLM 处理时：

1. 读到 `[audit rules](references/audit-rules.md)` 链接；
2. 在文档中搜索 `<source-file path="references/audit-rules.md">`；
3. 定位到被引用文件的完整内容。

不需要链接重写脚本——`path` 属性天然作为锚点。

## 上传到 AI 平台

| 平台 | 上传方式 |
|------|----------|
| **Claude Projects** | 项目设置 → Knowledge → 上传文件，或将内容粘贴到 Project Instructions |
| **ChatGPT 自定义 GPT** | Configure → Knowledge → Upload files |
| **NotebookLM** | 新建笔记本 → 添加来源 → 上传文件 |
| **其他平台** | 查找「上传知识库」「添加文档」「自定义指令」等功能入口 |

上传 canonical 文档后，平台即可基于完整的能力定义回答问题或执行任务。

## 注意事项

- **Vendor 技能**：vendor 目录中的原生技能使用不同 frontmatter 规范（`name` 替代 `id`，无 `type` 字段）。Canonical 格式透明保留原始 frontmatter，不做校验。
- **Workflow 体积**：workflow 文件较多（INDEX.md + 多个 work 条目目录 + 渐进披露子文件），生成的 canonical 文档较长。这属于预期行为——自包含性优先于简洁性。
- **XML 转义**：源文件代码块中如果包含 `&`、`<`、`>`，手动创建时需转义；自动脚本已内置转义处理。
