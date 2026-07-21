---
name: speculo-write-canonical
description: 将 Speculo 多文件能力（skill/command/workflow）canonical 化为自包含单 MD 文档。用户要求生成 canonical 文档、验证 canonical 格式、重新 canonical 化已有能力或修复 canonical 文档中的 XML 结构时使用。
---

# Speculo Write Canonical

## 过程

1. 读取 [AGENTS.md](../../../AGENTS.md)、[canonical-authoring.md](../../../docs/canonical-authoring.md)、[canonical/README.md](../../../template/canonical/README.md) 和 [authoring-quality.md](../_shared/authoring-quality.md)。完成标准：canonical 格式规范、文件包含/排除规则、XML 标签结构和质量杠杆已列成检查项。

2. 审计目标能力目录：确认能力类型（skill/command/workflow），识别主入口文件（SKILL.md / INDEX.md / command .md），列出所有应包含的源文件，标记应排除的运行时状态目录（`_state/`、`.speculo/`、`.gitkeep`）。完成标准：源文件清单完整且无遗漏，排除列表正确，每个文件都有明确包含/排除理由。

3. 确定 canonical 元数据：`id` 取自主入口 frontmatter 的 `id`（或 `name`），`type` 取自主入口 frontmatter 的 `type` 或能力目录类型。文件按主入口 → references → routes → atomic-skills → assets → scripts 排序，主入口 `order="1"`。完成标准：`id` 与源入口一致，`type` 为有效值，文件排序符合 canonical-authoring.md 规则。

4. 生成 canonical 文档。优先使用 `scripts/canonicalize.mjs` 自动生成；需要手动控制内容时按 canonical/README.md 的 XML 模板手动拼接。自动生成后检查 id/type 是否与源一致。完成标准：每个源文件恰好对应一个 `<source-file>`，`order` 从 1 连续递增无跳号，`path` 使用正斜杠且指向真实文件，XML 特殊字符已转义。

5. 验证生成的 canonical 文档：
   - `<canonical>` 的 `id` 和 `type` 属性正确。
   - `<source-file>` 数量与源文件清单一致。
   - `order` 连续递增，主入口为 1。
   - 源文件内容原样保留（包括 YAML frontmatter），未做合并或语义修改。
   - 无 `_state/`、`.speculo/`、`.gitkeep` 等运行时路径被包含。
   完成标准：所有验证项通过，或每个阻塞有明确修复指示。

6. 展示生成的 canonical 文档路径或内容摘要（文件数、每个 `<source-file>` 的 `path` 和大致行数），确认是否需要写入文件或仅输出到 stdout。完成标准：用户已确认输出目标和内容完整性。

## 文件选择

按 canonical-authoring.md 的规则：

- **总是包含**：主入口 .md、`references/**/*.md`、`routes/**/*.md`、`atomic-skills/**/*.md`、`assets/**/*.json`、`_templates/**/*.md`。
- **条件包含**：`scripts/**/*.mjs` 和 `*.sh` 内容 < 200 行直接包含，否则替换为描述性摘要。
- **总是排除**：`_state/`、`.speculo/`、`.gitkeep`、`_state/changes/`、`_state/archive/`、`.config/`。

## 自动化

推荐使用 `scripts/canonicalize.mjs` 自动生成。脚本自动处理：目录遍历、文件排序、content-type 检测、XML 转义、frontmatter 解析（自动检测 id/type）。仅当需要排除额外文件或调整排序时才手动干预。

```bash
# 从 skill 目录
node scripts/canonicalize.mjs template/skills/<name> --type skill --output canonical-<name>.md
# 从 command 文件
node scripts/canonicalize.mjs template/commands/<name>.md --output canonical-<name>.md
# 从 workflow 目录
node scripts/canonicalize.mjs template/workflows/<name> --type workflow --output canonical-<name>.md
```

## 验证

- 运行 `node scripts/canonicalize.mjs <path>` 确认脚本无错误输出且 XML 结构完整。
- 检查生成的 canonical 文档中 `id` 匹配源 frontmatter。
- 确认 `<source-file>` 数量等于源文件清单中应包含的文件数。
- 无断链：canonical 文档内的 markdown 链接路径可匹配到对应 `<source-file path="...">`。
