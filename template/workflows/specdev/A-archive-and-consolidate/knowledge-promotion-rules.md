# 知识提升规则

本规则由 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/A-archive-and-consolidate.md</Path>` 使用，并遵循 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>`。

## 资格

永久知识必须同时满足：

- 当前代码或实际行为已有验证支持；
- 超出单个 change 仍有用；
- 有明确来源、适用范围和状态；
- 不只是计划、假设、一次性操作记录或临时 workaround；
- 与现有永久知识的关系已判断。

## 操作

- **create**：没有等价条目；
- **update**：同一决策或术语的非语义性补充；
- **merge**：多个条目表达同一当前真相，保留全部来源；
- **supersede**：新决策替代旧决策，建立双向引用；
- **deprecate**：不再推荐但仍需历史或兼容说明；
- **skip**：临时、局部、未经验证、已过期或不具长期价值。

## 目标

- 架构决策：`<Path>{roots.state}/specdev/adr/</Path>`
- 领域上下文：`<Path>{roots.state}/specdev/context/</Path>`
- 研究结论：`<Path>{roots.state}/specdev/research/</Path>`

## 冲突

无法确定哪条代表当前真相时不提升。创建治理问题或新 change，并保留冲突来源。永久知识库必须反映当前状态，同时保存历史关系，而不是把冲突藏起来。
