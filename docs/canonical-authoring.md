# Speculo Canonical Authoring Contract

## Prerequisites

编写 canonical 文档前必须读取：
- [AGENTS.md](../AGENTS.md) — 代理手册
- [canonical/README.md](../template/canonical/README.md) — canonical 格式规范
- [.agents/skills/_shared/authoring-quality.md](../.agents/skills/_shared/authoring-quality.md) — 质量模型

## When to Canonicalize

- 需要将某个 skill、command 或 workflow 上传到仅支持单文件的 AI 平台时（如 ChatGPT Projects、Claude Projects、NotebookLM）。
- 需要归档某个能力的完整定义快照，用于版本对比或分发时。
- 跨团队共享能力定义，且接收方不运行 Speculo CLI 时。

Canonical 文档是源文件的透明容器，不是替代品。源文件仍是权威定义，canonical 文档从源文件生成，随源文件更新而重新生成。

## Canonical Document Structure

```xml
<canonical id="<capability-id>" type="skill|command|workflow">
  <source-file path="<relative-path>" order="<N>" content-type="<type>">
  </source-file>
</canonical>
```

### `<canonical>` 根元素

- `id` — 能力标识符。skill/command 取 frontmatter `id`；workflow 取 INDEX.md frontmatter `id`。
- `type` — 能力类型：`skill`、`command`、`workflow`。

### `<source-file>` 子元素

- `path` — 源文件相对于能力根目录的路径，使用正斜杠。根目录文件直接写文件名（如 `SKILL.md`）；子目录文件写完整相对路径（如 `references/audit-rules.md`）。
- `order` — 从 1 开始连续递增的整数。主入口文件（`SKILL.md` / `INDEX.md` / 单文件 command `.md`）始终为 `1`。其余文件按 references → routes → atomic-skills → assets → scripts 分组后字母序排列。
- `content-type` — 可选。文件内容类型标识。`markdown`（默认值，可省略）、`json`、`javascript`、`shell`、`yaml`、`toml`。

### 格式规则

- `<canonical>` 直接放在 markdown 正文中，不在 code fence 内。
- 每个 `<source-file>` 内的源文件内容原样保留，包括 YAML frontmatter 和 markdown 正文，不做合并或转换。
- 跨文件的 markdown 链接保留原文不重写。

## File Selection Rules

### 总是包含

| 文件模式 | 说明 |
|----------|------|
| `SKILL.md` | skill 主入口 |
| `INDEX.md` | workflow 主入口（自动生成） |
| `*.md`（work entry） | work 条目入口文件 |
| `*.md`（command 单文件） | command 入口 |
| `references/**/*.md` | 参考文档 |
| `routes/**/*.md` | workflow route |
| `atomic-skills/**/*.md` | workflow 原子包装 |
| `assets/**/*.json` | 资产模板，添加 `content-type="json"` |
| `_templates/**/*.md` | workflow 输出模板 |

### 条件包含

| 文件模式 | 处理方式 |
|----------|----------|
| `scripts/**/*.mjs`、`*.sh` | 内容 < 200 行直接包含；否则替换为描述性摘要（文件名、用途、输入/输出） |

### 总是排除

| 路径 | 原因 |
|------|------|
| `_state/` | 运行时状态，非能力定义 |
| `.speculo/` | Runtime state contract |
| `.gitkeep` | 占位文件 |
| `_state/changes/`、`_state/archive/` | 运行时变更记录 |
| `.config/`（workflow 内部） | 运行时知识 store |
| `node_modules/`、`.git/` | 非 Speculo 资产 |

## Quality Requirements

按 [authoring-quality.md](../.agents/skills/_shared/authoring-quality.md) 的质量模型：

- **可预测性**：同一源目录多次 canonical 化产生相同结果（文件排序确定性，内容不修改）。`order` 和 `path` 属性每次一致。
- **单一事实来源**：源文件为权威定义，canonical 文档是从源文件生成的只读快照。不对原始内容做任何语义修改。
- **就近放置**：所有源文件内容在单个 canonical 文档内，LLM 无需外部访问即可获得完整能力定义。
- **完成标准**：每个源文件恰好对应一个 `<source-file>`；`order` 从 1 连续递增无跳号；所有 `path` 指向真实存在的源文件；排除列表正确过滤运行时状态目录。

## Validation

- 所有 `<source-file>` 的 `path` 指向能力根目录下的真实文件。
- `order` 从 1 开始连续递增，无重复或跳号。
- 主入口文件的 `order` 为 1。
- 无绝对路径、反斜杠、`..`、外部 URL 引用或未声明 namespace。
- `<canonical>` 的 `id` 与主入口 frontmatter 的 `id`（或 `name`）一致。
- 排除 `_state/`、`.speculo/`、`.gitkeep` 等运行时路径。

## Automation

推荐使用 `scripts/canonicalize.mjs` 自动生成，避免手动拼接错漏：

```bash
# 从 skill 目录生成
node scripts/canonicalize.mjs template/skills/knowledge-prune --type skill

# 从 command 单文件生成
node scripts/canonicalize.mjs template/commands/retro.md

# 从 workflow 目录生成
node scripts/canonicalize.mjs template/workflows/specdev --type workflow

# 写入文件而非 stdout
node scripts/canonicalize.mjs template/skills/agents-md-builder --type skill --output canonical-agents-md-builder.md
```

脚本自动处理：文件发现、排序、content-type 检测、XML 转义、id/type 自动检测（从 YAML frontmatter）。
