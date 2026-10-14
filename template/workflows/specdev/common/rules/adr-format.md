# ADR 格式

本格式用于 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`。这里的 ADR 是当前 change 的架构决定合同，不是已经提升到永久 `<Path>{roots.state}/specdev/adr/</Path>` 的项目 ADR。

决定对未来有持续价值时写 ADR，以下特征是判断线索，不要求同时满足：

1. 难以逆转；
2. 没有上下文会令后续维护者惊讶；
3. 来自真实可行方案之间的权衡。

局部且无持续价值的选择留在 Ticket/代码；可逆不是拒绝保存重要理由的充分条件。没有真实替代方案时写明事实，不编造权衡。一个 ADR 只表达一个决定。

```markdown
## ADR-###: <标题>

**Status:** proposed / accepted / superseded / deprecated
**Source:** LOG-### / user decision / external specification
**Supersedes:** none / ADR-###

### Context
<缺少什么背景会让这个决定令人惊讶。>

### Decision
<清晰、规范且可验证的结论。>

### Trade-off
<认真考虑的替代方案，以及为什么接受当前代价。>

### Consequences
<真正重要的正面、负面和风险。>

### Verification / Migration
<仅在适用时出现。>
```

`accepted` 只表示用户已接受该决定作为当前 change 的下游合同；它不证明实现已经落地，也不代表永久知识毕业。修改已接受决定时新建 change ADR 并建立 supersedes 链，不重写历史。

只有 A 对照真实来源重新验证，并通过适用价值评估与具体批准，才能提升或独立维护永久 ADR；完成来源以代码、测试和 Evidence 核对，取消来源不能把未实现计划写成现状；不通过的决定随归档 change 保留。
