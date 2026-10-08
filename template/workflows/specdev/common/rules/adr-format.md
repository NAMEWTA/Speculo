# ADR 格式

本格式用于 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`。这里的 ADR 是当前 change 的架构决定合同，不是已经提升到永久 `<Path>{roots.state}/specdev/adr/</Path>` 的项目 ADR。

只有一个决定同时满足以下三个条件才写 ADR：

1. 难以逆转；
2. 没有上下文会令后续维护者惊讶；
3. 来自真实可行方案之间的权衡。

局部、可逆或没有实质替代方案的选择留在 Ticket/代码。一个 ADR 只表达一个决定。

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

只有 A 在 change 完成后对照代码、测试和 Evidence 重新验证，并通过毕业评估与用户确认，才能把决定写为永久 ADR；不通过的决定随归档 change 保留。
