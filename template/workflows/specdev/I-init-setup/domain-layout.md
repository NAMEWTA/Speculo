# 领域文档布局

specdev 各 work 在探索代码库时应如何使用该仓库的领域文档。

## 布局：单上下文

specdev 使用单上下文布局——整个 workflow 共享一套领域术语和架构决策。每个变更目录 `changes/<change>/` 下维护三文件模型：

```
{state_root}/changes/<change>/
├── CONTEXT.md                          ← 项目领域术语与概念
├── ADR.md                              ← 本变更相关的架构决策记录
└── LOG.md                              ← 设计决策日志（按时间顺序记录每次设计调整）
```

- **CONTEXT.md** —— 定义项目特有的领域概念和术语表。各 work 在输出中引用领域概念时以本文档为准。
- **ADR.md** —— 记录本变更范围内的架构决策（格式：`## ADR-NNNN: 标题`）。如果变更跨多个上下文，决策记录在触发该决策的变更目录下。
- **LOG.md** —— 按时间倒序记录每次设计调整、决策变更及其原因。格式：`## YYYY-MM-DD HH:MM — 标题`，每次记录包含：**决策**（做什么）、**原因**（为什么）、**影响**（影响哪些 work/文件）。

> 与 vendor 技能（如 domain-modeling）描述的通用仓库布局不同，specdev 将所有领域文档限定在 `changes/<change>/` 目录内。当 vendor skill 指示"在仓库根目录创建 CONTEXT.md"时，specdev 的适配层将其翻译为写入 `{state_root}/changes/<change>/CONTEXT.md`。

## 路径解析规则

**本文件描述的路径均为相对于 `{state_root}` 的逻辑路径。** 实际写入时由 Speculo persistence 层映射到 `{roots.state}/specdev/` 命名空间下。

- `CONTEXT.md` → `{state_root}/changes/<current_change>/CONTEXT.md`
- `ADR.md` → `{state_root}/changes/<current_change>/ADR.md`
- `LOG.md` → `{state_root}/changes/<current_change>/LOG.md`
- `{state_root}` 由 runtime-context 解析为 `{roots.state}/specdev/`
- `<current_change>` 由 `status.json` 的 `active` 数组确定（取第一个活跃变更）

## 在探索之前

当 specdev work 需要领域上下文时，按以下顺序读取：

1. **`CONTEXT.md`**（位于当前变更目录内）—— 项目领域语言，由 `G-grill-with-docs` 或 `I-implement` 在探索代码库时创建或更新
2. **`ADR.md`**（位于当前变更目录内）—— 涉及当前变更的架构决策，由 `G-grill-with-docs` 在讨论架构时更新
3. **`LOG.md`**（位于当前变更目录内）—— 设计决策历史，由各 work 在设计调整时追加记录

如果这些文件都不存在，静默继续。不要标记它们的缺失或预先建议创建。`G-grill-with-docs` 和 `I-implement` 在领域知识或决策实际被确定时延迟创建它们。

## 使用术语表的词汇

输出中命名领域概念时，使用 `CONTEXT.md` 中定义的术语，不偏离到术语表明确避免的同义词。如果需要的新概念尚未在术语表中，记录到 `CONTEXT.md` 并通知用户。

如果 `CONTEXT.md` 不存在，在首次需要时由当前 work 创建骨架：

```markdown
# CONTEXT — <change 主题>

## 领域术语

| 术语 | 定义 | 别名 / 避免使用 |
|------|------|----------------|
| ... | ... | ... |

## 边界上下文

<!-- 如有多个子域，在此划分边界 -->
```

## 标记 ADR 冲突

如果输出与现有 ADR 矛盾，明确提出而不是默默覆盖：

> _与 `<Path>{roots.state}/specdev/changes/<change>/ADR.md</Path>` 中的 ADR-NNNN 矛盾 — 但值得重新讨论，因为……_

同时将冲突记录追加到 `LOG.md`：

```markdown
## YYYY-MM-DD HH:MM — ADR 冲突标记

- **冲突**: 当前建议与 ADR-NNNN 矛盾
- **原因**: <重新讨论的理由>
- **影响**: 如采纳新方案，需更新 ADR.md 并记录迁移路径
```

## 写入 LOG.md

每次设计调整或决策变更时，在 `LOG.md` 顶部追加一条记录（时间倒序）：

```markdown
## YYYY-MM-DD HH:MM — <简短标题>

- **决策**: <做了什么设计决定>
- **原因**: <为什么做这个决定>
- **影响**: <影响哪些 work、哪些文件、哪些后续步骤>
```

`LOG.md` 不同于 `ADR.md`：ADR 记录的是相对稳定的架构决策，LOG 记录的是日常设计调整的过程脉络。如果某条 LOG 记录具有长期参考价值，提取为 ADR。
