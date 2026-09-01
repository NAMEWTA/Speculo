# 偏差控制

偏差是“当前事实或实现需要偏离已批准工件”的显式事件。偏差不是普通进度说明，也不能作为先改后补文档的许可证。

## 1. 偏差等级

- **local**：只改变局部实现，不改变 Ticket 的行为、范围、公共契约、路径所有权或验证；记录到 Evidence 后可继续。
- **ticket**：改变 Ticket 的执行路线、可写范围、局部契约或验收映射，但不改变 Spec；必须停止相关修改、更新 Ticket 并获得该 Ticket 或计划明确的批准 owner 同意。
- **spec**：改变外部行为、范围、用户故事、验收合同或非功能要求；必须返回 `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>`。
- **architecture**：改变已接受架构决策或公共架构约束；必须返回 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>` 并更新 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`。
- **release**：改变迁移、兼容窗口、发布门禁、回滚或不可逆批准点；必须停止并获得明确人工批准。

## 2. 触发条件

以下任一情况必须建立偏差：

- 当前代码事实使批准路线不可行；
- 需要修改 Ticket 未授权的项目路径；
- 需要修改 shared path，但当前实现者不是 owner；
- 验证接缝无法证明验收合同；
- 发现新的安全、数据、兼容、性能或迁移风险；
- 依赖、合同或外部参考权威已变化；
- 实际行为将与 Spec 或 ADR 不一致。
- 父 Implementation Map 的成员、组合 Ticket、dependency、serialization 或 revision 已与子状态、路径或 Git 事实不一致。

## 3. 偏差记录

偏差记录写入对应 Evidence：`<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`，并至少包含：

- 偏差 ID 与等级；
- 触发事实和证据；
- 受影响工件与路径；
- 继续、回退、修订或拆分的选项；
- 推荐方案和风险；
- 批准人、批准时间和批准范围；
- 最终处理结果。

需要改变上层工件时，Evidence 只记录事件；真正的权威变更必须写回对应 Spec、Ticket、ADR 或 Goal Plan。

## 4. 停止规则

- 未批准的 ticket、spec、architecture 或 release 偏差不得继续实现。
- 不得通过扩大 `writable_paths`、删除测试、降低断言或把风险改写成“已知限制”来绕过停止。
- 偏差影响并行执行、source checkpoint 或 candidate 集成时，Lead 必须暂停受影响 Wave，重新计算路径所有权、依赖、Gate 与父分支顺序；任何 subagent 都不能自行改写上层合同。
- 偏差跨越多个成员时，父 Lead 先递增 Implementation Map revision，再重算 Implementation Plan；旧派单和 candidate 全部标记 stale。
