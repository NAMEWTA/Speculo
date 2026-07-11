# 领域文档

工程 skills 在探索代码库时应如何使用该仓库的领域文档。

## 布局：单上下文

```
{state_root}/knowledge/
├── CONTEXT.md                          ← 项目领域术语与概念（待 domain-modeling 创建）
├── adr/                                ← 架构决策记录（待 domain-modeling 创建）
│   └── NNNN-slug.md
└── domain.md                           ← 本文件
```

## 路径解析规则

**本文件描述的路径均为相对于 `{state_root}/knowledge/` 的逻辑路径。** 实际写入时由 Speculo persistence 层映射到 `{state_root}/knowledge/` 命名空间下。

- `CONTEXT.md` → `{state_root}/knowledge/CONTEXT.md`
- `adr/` → `{state_root}/knowledge/adr/`
- `{state_root}` 由 runtime-context 解析，默认为 `speculo/.speculo/<workflow>/`

Vendor skills（如 domain-modeling）描述的是通用项目布局（"仓库根目录下的 CONTEXT.md"），这是正确的通用行为。本文件作为 Speculo 适配层，负责将这些通用路径翻译到 Speculo 持久化命名空间内。当 vendor skill 指示"在仓库根目录创建 CONTEXT.md"时，实际写入路径为 `{state_root}/knowledge/CONTEXT.md`。

## 在探索之前

- **`CONTEXT.md`**（位于 knowledge/ 命名空间内，由 domain-modeling skill 创建）—— 项目领域语言
- **`adr/`** —— 涉及工作区域的 ADR

如果这些文件都不存在，静默继续。不要标记它们的缺失或预先建议创建。`domain-modeling` skill 在术语或决策实际被确定时延迟创建它们。

## 使用术语表的词汇

输出中命名领域概念时，使用 `CONTEXT.md` 中定义的术语，不偏离到术语表明确避免的同义词。如果需要的新概念尚未在术语表中，记录给 `domain-modeling`。

## 标记 ADR 冲突

如果输出与现有 ADR 矛盾，明确提出而不是默默覆盖：

> _与 ADR-NNNN 矛盾 — 但值得重新讨论，因为……_
