---
id: config-prune
type: command
name: Config Prune
description: dry-run 审计 .config 中可安全删除或合并的过期知识资产
keywords: [config-prune, config, adr, context, lessons, rules, prune, 清理]
---

# Config Prune 命令

⚠️ **默认 dry-run。** 本命令涉及 `.config` 知识资产删除或合并，AI 必须先列出候选清单并征求用户确认。没有确认时只写报告，不删除、不重命名、不改 RULES。

## 归档路径模式

产物目录：`speculo/.speculo/commands/<YYYY-MM-DD>-config-prune-<topic>/`

报告文件：`speculo/.speculo/commands/<YYYY-MM-DD>-config-prune-<topic>/report.md`

- `<YYYY-MM-DD>` 使用当前日期。
- `<topic>` 从清理范围或用户主题提取，使用小写 kebab-case；无法判断时使用 `config`。
- 禁止把报告写入 `temp/`、系统临时目录或工作区内其他非规范位置。

## 调用的 skills

无

## 执行步骤

1. 读取 `speculo/.speculo/.config/RULES.md`、`LESSONS.md`、`context/`、`adr/`；缺失路径记录为 `missing`，不自动创建。
2. 扫描当前仓库引用：
   ```bash
   rg -n "ADR-[0-9]{4}|[0-9]{4}-[a-z0-9-]+\\.md|CONTEXT|LESSONS|RULES" .
   ```
   排除 `node_modules/`、`dist/`、`.git/` 等生成或依赖目录。
3. 生成 dry-run 候选，至少包含：
   - 指向不存在 ADR 的正文引用或索引行。
   - 标记为 superseded 且超过 30 天、无活跃引用的 ADR。
   - 只含 `.gitkeep`、TODO、空占位或模板说明的长期知识文件。
   - CONTEXT 中当前代码、文档和归档均无证据支撑的术语。
   - LESSONS 中重复、过期、只适用单次任务或已被 RULES/ADR 吸收的经验。
4. 按 `delete | merge | rewrite | keep | needs-confirmation` 分组输出完整清单；每个候选必须包含来源、证据和风险。
5. 如果用户没有明确确认，停止在 dry-run 报告。
6. 用户确认后，只执行确认清单中的操作：
   - 删除文件前再次检查路径仍位于 `speculo/.speculo/.config/`。
   - 修改 `RULES.md` 前必须确认具体条目；不能批量隐式改规则。
   - 执行后写入报告，列出实际改动和跳过项。

## 边界

- 不删除仍被代码、文档、归档或 active change 引用的 ADR / CONTEXT。
- 不把低信号归档内容写回长期知识资产。
- 不自动解决领域术语冲突；冲突项交给 `../workflows/dev/M-domain-modeling/M-domain-modeling.md`。
- 不修改 docs-sync state；由 `../workflows/dev/D-docs-sync/D-docs-sync.md` 推进基线。

## 产物模板（report.md）

> **服务命令：** `config-prune.md`
> **产物文件名：** `report.md`

```markdown
# Config Prune Report

## 执行时间
[TODO: ISO 时间戳]

## 模式
[TODO: dry-run / confirmed]

## 扫描范围
[TODO: 列出读取的 .config 路径、引用扫描命令和排除目录]

## 候选清单
[TODO: 按 delete / merge / rewrite / keep / needs-confirmation 分组列出候选、证据和风险]

## 用户确认记录
[TODO: dry-run 时写无确认；执行时记录用户确认的原始要点]

## 执行结果
[TODO: 成功 / 失败 / 部分成功；列出实际改动和跳过项]
```
