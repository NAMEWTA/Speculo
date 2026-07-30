# 双轴审查

## 标准轴

检查正确性、并发、资源释放、错误处理、安全、性能风险、模块深度、重复知识、测试真实性和可读性。评论必须指向具体行为风险，不做纯风格噪声。

## 契约轴

逐项核对：contract_ids、IN/REUSE/OUT、锁定决策、不变量、失败/兼容、writable_paths、验证矩阵、Deep 发布恢复和 Goal Gate。

## 结论

- `APPROVE`：无阻塞问题；
- `REQUEST_CHANGES`：列出阻塞问题、证据和应满足的结果；
- `ESCALATE_DEVIATION`：修复需要改变上层契约。

审查者不得通过设计新功能扩大 Ticket。
