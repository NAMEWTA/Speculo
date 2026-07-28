# 领域文档布局

specdev 各 work 在探索代码库时应如何使用该仓库的领域文档。

## 布局：单上下文

specdev 使用单上下文布局——整个 workflow 共享一套领域术语和架构决策。每个变更目录 `changes/<change>/` 下维护三文件模型：

```
{state_root}/changes/<change>/
├── CONTEXT.md    ← 领域词汇表
├── ADR.md        ← 本变更相关的架构决策记录
└── LOG.md        ← 设计决策日志
```

三个文件的权威格式由 `G-grill-with-docs` 定义，本文件不重复：

- **CONTEXT.md** —— 格式见 `<Path>{roots.workflows}/specdev/G-grill-with-docs/context-format.md</Path>`（规范术语 + `_Avoid_` 同义词列表）
- **ADR.md** —— 格式见 `<Path>{roots.workflows}/specdev/G-grill-with-docs/adr-format.md</Path>`（单文件、`## NNNN: 标题` 分段）
- **LOG.md** —— 格式见 `<Path>{roots.workflows}/specdev/G-grill-with-docs/log-format.md</Path>`（`## LOG-XXXX` 编号条目、文件末尾追加）

> specdev 将变更内领域文档限定在 `changes/<change>/` 目录内。经确认后的 ADR/CONTEXT 由 `A-archive-and-consolidate` 提升到永久目录 `{roots.state}/specdev/adr/` 与 `{roots.state}/specdev/context/`，始终反映项目当前现状。

## 路径解析规则

**本文件描述的路径均为相对于 `{state_root}` 的逻辑路径。** 实际写入时由 Speculo persistence 层映射到 `{roots.state}/specdev/` 命名空间下。

- `CONTEXT.md` → `{state_root}/changes/<current_change>/CONTEXT.md`
- `ADR.md` → `{state_root}/changes/<current_change>/ADR.md`
- `LOG.md` → `{state_root}/changes/<current_change>/LOG.md`
- `{state_root}` 由 runtime-context 解析为 `{roots.state}/specdev/`
- `<current_change>` 按 INDEX 启动协议从 `status.json` 的 `active` 数组确定

## 在探索之前

当 specdev work 需要领域上下文时，按以下顺序读取：

1. **永久目录**（若存在）—— `{state_root}/context/` 与 `{state_root}/adr/`，反映项目当前现状
2. **`CONTEXT.md`**（当前变更目录内）—— 本变更的领域语言
3. **`ADR.md`**（当前变更目录内）—— 涉及当前变更的架构决策
4. **`LOG.md`**（当前变更目录内）—— 设计决策历史

如果这些文件都不存在，静默继续。不要标记它们的缺失或预先建议创建。`G-grill-with-docs` 在领域知识或决策实际被确定时延迟创建它们。

## 使用术语表的词汇

输出中命名领域概念时，使用 `CONTEXT.md` 中定义的术语，不偏离到 `_Avoid_` 列表明确避免的同义词。如果需要的新概念尚未在术语表中，按 context-format 的增删改操作记录到 `CONTEXT.md` 并通知用户。

## 标记 ADR 冲突

如果输出与现有 ADR 矛盾，明确提出而不是默默覆盖：

> _与 ADR NNNN 矛盾 — 但值得重新讨论，因为……_

同时按 log-format 在 `LOG.md` 末尾追加一条日志条目（状态 `deferred`）记录冲突内容与重新讨论的理由；如采纳新方案，按 adr-format 的修改规则更新对应 ADR 状态。
