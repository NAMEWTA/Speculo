# LOG.md 格式

设计决策日志存放在变更目录的 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` 中。它记录设计访谈中已经确认、延后或被替代的具体结论——"当时讨论了什么、最终固定了什么行为以及对应哪个 ADR"。与 CONTEXT.md 的精炼不同，LOG.md 可以记录讨论中的具体场景、边界条件和交互细节。

## 规则

- **记录每一次设计结论。** 无论大小，只要在访谈中确认、延后或被替代，都写入 LOG.md。宁可多记，不要遗漏。
- **状态驱动。** 每个条目明确标记 `accepted`、`deferred` 或 `superseded`，让读者一眼知道当前有效性。
- **关联 ADR。** 如果该结论同时满足 ADR 的三个条件，在 LOG 中标注 `Related: ADR-XXXX`，并在对应 ADR 条目中也关联回 LOG。
- **保持可修订。** 后续决定改变既有结论时，直接更新原条目状态和正文，不要新建一条矛盾的条目。标注 `Superseded by: LOG-XXXX`。
- **不堆积废弃条目。** 被替代的条目保留但标记清楚；延后（deferred）的条目保留以便后续恢复讨论。
- **记录具体交互和边界。** 与 CONTEXT.md 的精炼不同，LOG.md 可以记录讨论中的具体场景、边界条件和交互细节。

## 模板

```md
# 设计决策日志

本文件记录设计访谈中已经确认、延后或被替代的具体结论。它保存"当时讨论了什么、最终固定了什么行为以及对应哪个 ADR"；CONTEXT.md 是规范词汇表，ADR.md 是难以逆转的架构决策，本文件则是可持续增删改的完整设计轨迹。

## 维护规则

- 每次完成一个设计问答，同步更新 LOG.md、CONTEXT.md 与 ADR.md。
- 已确认结论使用 `accepted`；暂不决定使用 `deferred`；被后续决定替代使用 `superseded`。
- 后续确认改变既有结论时，直接修订原日志条目，并记录替代关系，不保留互相矛盾的"现行规则"。
- 日志可以记录具体交互和边界；词汇表保持精炼；ADR 只记录难以逆转、令人意外且存在真实权衡的决定。

## LOG-0001: {决策的简短标题}

Status: accepted
Related: ADR-0001

{背景：讨论了什么问题，做出了什么决定，以及为什么。可以记录具体的交互过程、边界场景和固定行为。}

## LOG-0002: {另一决策标题}

Status: deferred

{为什么暂不决定，以及后续恢复讨论时应从什么问题开始。}

## LOG-0003: {被替代的决策标题}

Status: superseded
Superseded by: LOG-0004

{原决策内容，以及为什么被替代。保留作为设计演进的历史上下文。}
```

## 状态说明

- **Status: accepted**——已确认的现行结论。这是讨论后用户明确同意的决定，当前仍然有效。
- **Status: deferred**——暂不决定，留待后续讨论。记录为什么暂不决定以及从什么角度恢复讨论，以便后续接续上下文。
- **Status: superseded**——被后续决定替代。标注 `Superseded by: LOG-XXXX` 指向替代条目。保留原条目作为设计演进的历史上下文。

## 追加新日志

1. 读取 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`，找到最高现有编号
2. 编号加 1（从 `0001` 开始，不足四位补零）
3. 在文件末尾追加新条目

## 修改已有日志

- **改变结论**——将原条目状态改为 `superseded`，标注 `Superseded by: LOG-XXXX`，在新条目中说明替代原因。不要直接修改原条目的结论内容——保留它让读者能看到设计是如何演进的。
- **延后决定被重新讨论**——将状态从 `deferred` 改为 `accepted`，或新建条目替代原条目（原条目改为 `superseded`）。如果内容没有变化只是状态升级，可以直接改状态；如果结论发生了变化，使用替代模式。
- **补充细节**——直接编辑条目正文，不改变状态。可以追加更多场景、边界条件或交互细节。
- **关联 ADR**——如果后来为该日志创建了 ADR，补充 `Related: ADR-XXXX` 标注。
- **不要删除**——即使结论被替代，保留条目作为设计演进的历史上下文。

## 示例：被替代的日志

以下示例展示一条日志从 accepted 变为 superseded 的全过程：

原始条目：

```md
## LOG-0005: 订单状态机使用三态模型

Status: accepted

订单状态为 pending → confirmed → completed 的三态模型。
```

讨论后发现需要更细粒度，追加替代条目：

```md
## LOG-0005: 订单状态机使用三态模型

Status: superseded
Superseded by: LOG-0007

订单状态为 pending → confirmed → completed 的三态模型。后续讨论发现 confirmed 状态无法区分"已付款待发货"和"已发货待签收"，因此改为五态模型。

## LOG-0007: 订单状态机使用五态模型

Status: accepted

订单状态为 pending → paid → shipped → delivered → completed 的五态模型。
详见 LOG-0005 的讨论背景。
```
