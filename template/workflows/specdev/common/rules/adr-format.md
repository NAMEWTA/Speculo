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

### Decision
<用 1–3 句写清决定及重要理由；保留来源和当前 change 适用范围。>

### Context / Trade-off / Consequences（适用时）
<只有决定与理由不足以解释真实取舍、风险或后果时才展开；没有替代方案不编造。>

### Verification / Migration（适用时）
<实际需要的验证、兼容或迁移约束。>
```

`accepted` 只表示用户已接受该决定作为当前 change 的下游合同；它不证明实现已经落地，也不代表永久知识毕业。修改已接受决定时新建 change ADR 并建立 supersedes 链，不重写历史。

只有 A 对照真实来源重新验证，并通过适用价值评估与具体批准，才能提升或独立维护永久 ADR；完成来源以代码、测试和 Evidence 核对，取消来源不能把未实现计划写成现状；不通过的决定随归档 change 保留。
