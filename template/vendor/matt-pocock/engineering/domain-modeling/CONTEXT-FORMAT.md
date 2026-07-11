# CONTEXT.md 格式

## 结构

```md
# {上下文名称}

{对该上下文是什么以及为什么存在的一两句话描述。}

## Language

**Order**：
{对该术语的一两句话描述}
_Avoid_: Purchase, transaction

**Invoice**：
发货后发送给客户的付款请求。
_Avoid_: Bill, payment request

**Customer**：
下订单的个人或组织。
_Avoid_: Client, buyer, account
```

## 规则

- **要有主见。** 当同一概念存在多个词时，选择最好的那个，并将其他的列在 `_Avoid_` 下。
- **定义保持精炼。** 最多一两句话。定义它是什么，而不是它做什么。
- **仅包含特定于该项目上下文的术语。** 通用的编程概念（超时、错误类型、工具模式）即使项目广泛使用也不属于这里。添加术语前自问：这是该上下文独有的概念，还是一个通用编程概念？只有前者才属于这里。
- **当自然形成聚类时，用子标题分组术语。** 如果所有术语属于一个单一的凝聚领域，扁平列表也可以。

## 单上下文 vs 多上下文仓库

**单上下文（大多数仓库）：** 在仓库根目录下一个 `CONTEXT.md`。

**多上下文：** 在仓库根目录下一个 `CONTEXT-MAP.md` 列出各个上下文、它们的位置以及它们之间的关系：

```md
# Context Map

## Contexts

- [Ordering](./src/ordering/CONTEXT.md) — 接收并跟踪客户订单
- [Billing](./src/billing/CONTEXT.md) — 生成发票并处理付款
- [Fulfillment](./src/fulfillment/CONTEXT.md) — 管理仓库拣货和发货

## Relationships

- **Ordering → Fulfillment**：Ordering 发出 `OrderPlaced` 事件；Fulfillment 消费它们以开始拣货
- **Fulfillment → Billing**：Fulfillment 发出 `ShipmentDispatched` 事件；Billing 消费它们以生成发票
- **Ordering ↔ Billing**：共享 `CustomerId` 和 `Money` 类型
```

该 skill 会根据存在情况推断适用哪种结构：

- 如果存在 `CONTEXT-MAP.md`，读取它以找到各个上下文
- 如果只存在根目录下的 `CONTEXT.md`，则为单上下文
- 如果两者都不存在，当第一个术语被确定时延迟创建一个根目录下的 `CONTEXT.md`

当存在多个上下文时，推断当前主题与哪个上下文相关。如果不清楚，询问。
