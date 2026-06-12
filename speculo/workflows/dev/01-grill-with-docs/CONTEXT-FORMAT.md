# CONTEXT.md 格式

本辅助文档只定义项目术语表的写法。默认产物仍写入 `speculo/.speculo/dev/<change>/context-map.md` 和 `speculo/.speculo/dev/<change>/decision-log.md`；只有用户明确确认时，才按本格式创建或更新 `speculo/.speculo/.config/context/CONTEXT.md` / `speculo/.speculo/.config/context/CONTEXT-MAP.md`。

## 结构

```md
# {上下文名称}

{一到两句话描述这个上下文是什么、为什么存在。}

## 术语

**订单（Order）**：
{一到两句话描述该术语}
_避免使用_：Purchase、transaction

**发票（Invoice）**：
交付后向客户发送的付款请求。
_避免使用_：Bill、payment request

**客户（Customer）**：
下单的个人或组织。
_避免使用_：Client、buyer、account
```

## 规则

- **要有主见。** 当同一个概念有多个词汇时，选择最好的一个，将其他词列为「避免使用」的别名。
- **显式标记冲突。** 如果某个术语被合混地使用，在「已标记的合混」中明确指出并给出解决方案。
- **保持定义简洁。** 最多一到两句话。定义它「是什么」，而不是「做什么」。
- **展示关系。** 使用粗体术语名称，在明显的地方表达基数关系。
- **只包含本项目的上下文特有的术语。** 通用编程概念（超时、错误类型、工具模式）即使项目大量使用也不应该包含。添加术语前问自己：这是本项目上下文特有的概念，还是通用编程概念？只有前者才应该包含。
- **当自然分组出现时，用子标题分组术语。** 如果所有术语属于一个紧密相关的领域，平铺列表即可。
- **写一段示例对话。** 一段开发者与领域专家之间的对话，展示术语如何自然交互，并澄清相关概念之间的边界。

## 单上下文与多上下文仓库

**单上下文（大多数仓库）：** `speculo/.speculo/.config/context/CONTEXT.md` 记录项目级术语表。

**多上下文：** `speculo/.speculo/.config/context/CONTEXT-MAP.md` 列出所有上下文、它们的位置以及它们之间的关系：

```md
# 上下文映射

## 上下文

- [Ordering](./ordering.md) —— 接收并跟踪客户订单
- [Billing](./billing.md) —— 生成发票并处理付款
- [Fulfillment](./fulfillment.md) —— 管理仓库拣货和发货

## 关系

- **Ordering → Fulfillment**：Ordering 发出 `OrderPlaced` 事件；Fulfillment 消费这些事件开始拣货
- **Fulfillment → Billing**：Fulfillment 发出 `ShipmentDispatched` 事件；Billing 消费这些事件生成发票
- **Ordering ↔ Billing**：共享 `CustomerId` 和 `Money` 类型
```

技能会自动推断适用哪种结构：

- 如果 `speculo/.speculo/.config/context/CONTEXT-MAP.md` 存在，读取它以查找上下文
- 如果只有 `speculo/.speculo/.config/context/CONTEXT.md`，则为单上下文
- 如果都不存在，在第一个术语确定时按需创建 `speculo/.speculo/.config/context/CONTEXT.md`

当存在多个上下文时，推断当前主题与哪个上下文相关。如果不确定，就问。
