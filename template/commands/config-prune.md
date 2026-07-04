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

- `../skills/config-prune/SKILL.md` — dry-run 审计 .config 知识资产过期项、生成分组候选清单时读取。

## 执行步骤

1. 读取 `../skills/config-prune/SKILL.md`，按其执行步骤与边界执行 config-prune 审计。
2. 创建规范命令产物目录 `speculo/.speculo/commands/<YYYY-MM-DD>-config-prune-<topic>/`。
3. 把 skill 返回的候选清单、证据、风险、用户确认记录和执行结果写入 `report.md`（使用下方产物模板）。
4. 返回 `report.md` 路径和 3-5 条摘要。

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
