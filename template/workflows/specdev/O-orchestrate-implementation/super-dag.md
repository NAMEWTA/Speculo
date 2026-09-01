# Implementation Super-DAG

## 组合身份

每个节点使用 `<member-change>::<ticket-id>`。父 Map 的 `tasks` 必须与所有成员 Ticket 一一对应，包括已经 done/cancelled 的节点；不得用标题、文件名或局部 Ticket ID 代替组合身份。

## Dependency

- 子 change 内部 dependency 从 Ticket `blocked_by` 精确提升，不得遗漏或改序；
- 跨 change dependency 只表达后置 Ticket 实际消费前置 Ticket 的合同、代码、迁移或产物；
- 格式为 `dependent <- prerequisite`；端点必须存在；自依赖、重复边和循环阻塞 Ready。

## Serialization

serialization 格式为 `task-a <> task-b`，只表示两个无语义依赖的 Ticket 因 writable/shared path、repository/ref、环境、迁移窗口或唯一资源不能同时执行。无方向重复 pair 非法。

依赖与串行不能互相冒充。Map 正文必须记录跨 change 边或 serialization 的事实来源、owner、开始 Gate 和解除证据。

## Frontier 与 Wave

节点只有在所有 prerequisite done/cancelled、子 Ticket Ready、无 blocker/deviation、serialization lock 可用、workspace/授权有效且 agent 配额可用时进入 frontier。

current 策略每个 Wave 只能含一个节点。required 策略可以放入多个节点，但任意两节点必须不存在传递依赖、serialization、writable/shared overlap 或同一不可并发资源。

## 漂移

每轮从子 Ticket 重新构建预期 task set 和内部 edges。与父 Map 不一致时停止派单、递增 revision、更新 Map 与 Plan，再重新计算；不能用旧投影覆盖子权威。
