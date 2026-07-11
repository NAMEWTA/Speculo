---
id: speculo-retro
type: skill
name: Speculo Retro
description: 从 Speculo 使用证据中提取、去重、分级和根因化摩擦，返回可直接转成 GitHub issue 的提案。
---

# Speculo Retro

## 输入

- 当前对话与本次使用的 commands/workflows。
- `commands/<command>/*.md` 报告、active change 状态、archive 和 workflow 声明的 lessons/knowledge store。
- 可选已有 issues，用于语义去重。

## 流程

1. 读取 `references/friction-taxonomy.md`，穷尽扫描可用证据并列出原始摩擦。完成标准：每项都有来源路径或对话节点。
2. 按 bug、friction、missing-capability、doc-gap、ergonomics 归类，合并同一根因。完成标准：每项只属于一个根因簇，合并关系可追溯。
3. 评估影响与频率，过滤一次性噪声；低信号项标为丢弃或仅记教训。完成标准：每项都有优先级和处置理由。
4. 读取 `references/issue-drafting-sop.md`，生成 issue-ready 提案并与已有 issue 去重。完成标准：标题、证据、问题、建议、验收、影响资产和去重结论齐全。

## 输出

- 按优先级排序的 `file-issue | lesson-only | discard | duplicate` 提案。
- 合并/丢弃说明和调用方执行 `gh` 所需字段。

本 skill 不写文件、不调用外部 API；command 负责报告、确认和 issue 创建。
