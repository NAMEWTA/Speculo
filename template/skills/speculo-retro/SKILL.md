---
id: speculo-retro
type: skill
name: Speculo Retro
description: 复盘 Speculo commands/workflows 使用过程中的痛点、问题与值得优化的地方，深度分析后产出去重、分级、根因化、可直接转成 GitHub issue 的规范化改进提案；当用户要求总结 Speculo 使用体验、收集框架反馈或把使用痛点整理成 issue 时使用。
---

# Speculo Retro

## 何时使用

当用户想复盘「用 Speculo 的 commands 或 workflows 时遇到的痛点、问题、值得优化的地方」，并希望把这些摩擦整理成规范化、可行动的框架反馈或 issue 时使用。

典型触发：

- “总结一下这次用 Speculo 踩的坑 / 卡点”
- “把使用痛点整理成可以提的 issue”
- “复盘 dev workflow 哪里别扭、哪里值得优化”
- “收集 Speculo 框架反馈”

本 skill 只负责**分析与规范化产出内容**：它去重、分级、根因化并起草 issue-ready 提案，把结果返回给调用方。它**不自行写文件、不调用 `gh`、不发布 issue**；落盘与提交由调用方 command / workflow 负责。

## 输入

- 当前对话上下文：本次会话用了哪些 command / workflow、卡在哪、绕了什么弯、重复了哪些动作
- `speculo/.speculo/commands/<run>/` 下的历史命令产物（report、snapshot、handoff）
- `speculo/.speculo/<cat>/<change>/` 下的 change 产物与 `.status.json`（`phase_history` 里的 `revisited`、`blocked`、长时间停滞都是摩擦信号）
- `speculo/.speculo/.config/LESSONS.md`（已沉淀的教训，用于去重与佐证）
- 可选：调用方提供的已存在 issue 列表或目标仓库上下文，用于跨提案去重
- 本 skill 自带分析与 issue 起草规范，已内化到 `references/`，分析时**不外读仓库 `docs/`**

## 输出

- 规范化复盘结论：每条 = 一个去重、分级、根因化的改进提案，字段对齐 GitHub issue（标题、类型/标签、证据、问题、建议改动、验收、受影响 asset）
- 提案清单，按优先级倒序排列
- 被合并或丢弃的低信号项说明（哪些重复、哪些更适合记入 `LESSONS.md` 而非提 issue）
- 每条标注「建议提 issue」或「仅记教训」的处置建议
- 全部以**返回内容**形式交给调用方写入其声明的 `speculo/.speculo/...` 路径；本 skill 不挑选持久化位置

## 执行步骤

1. **收集信号** —— 按 `references/friction-taxonomy.md` 的来源清单，扫描对话上下文、`speculo/.speculo/` 产物与 `LESSONS.md`，列出原始摩擦点。
2. **归类与去重** —— 按 taxonomy 把每个摩擦点归到类型（bug / friction / missing-capability / doc-gap / ergonomics），合并语义重复项。
3. **深度分析** —— 对每条做根因判断（是 asset 设计、持久化契约、文档还是工具问题），评估影响面与发生频率，按 `references/friction-taxonomy.md` 的优先级评分。
4. **过滤噪声** —— 只保留高信号、可行动项；低信号或一次性项标注为丢弃，或归入「仅记教训」。
5. **起草提案** —— 按 `references/issue-drafting-sop.md` 把每条规范化成 issue-ready 提案，并对照调用方提供的已存在 issue 做跨提案去重。
6. **返回结论** —— 把结构化提案清单、丢弃项与处置建议返回调用方；不自行写文件、不调用 `gh`。

## 渐进披露

- `references/friction-taxonomy.md`：确定信号来源、给摩擦点归类、按影响 × 频率评优先级、过滤噪声时读取。
- `references/issue-drafting-sop.md`：把改进提案规范化成 issue-ready 结构、对照已存在 issue 去重、生成给调用方 / `gh` 的交接字段时读取。
