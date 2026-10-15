# 规划深度与执行就绪

## 1. Planning Depth

### Lite

适用条件通常全部满足：范围局部、行为明确、沿用既有模式、无公共接口或数据迁移、无安全或高事故半径影响、易回滚、无需并行协调。

最低内容：目标、垂直行为切片、范围、项目路径授权、验收标准和验证方法。局部实现由 I 决定。

### Standard

适用于大多数跨多个文件或技术层的垂直切片。

按适用性补充接口接缝、不变量、失败行为和低影响假设；上游已有合同直接引用。仅在顺序影响安全或正确性时记录执行路线，不要求固定步数。

### Deep

任一条件触发：公共 API、schema、wire format、数据迁移、认证授权、隐私、资金、不可逆操作、expand-contract、共享核心路径、多个 implementation owner 的跨 Ticket 写入协调、多个实质架构方案或高事故半径。

对触发 Deep 的实际风险补充数据/状态、兼容、迁移、恢复、风险缓解、收缩条件或批准点。无关维度省略；Deep 不要求每票填满所有栏目。

## 2. Ticket Definition of Ready

Ticket 只有同时满足以下适用条件才可设置 `ready: true`：

- 外部行为和可观察产出明确；
- IN、REUSE、OUT 无冲突；
- 高影响决策已锁定；
- UI 范围按 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path> 硬引用已批准 change DESIGN、基线版本和原型，确认/摘要未失效；
- 没有会改变行为、接口、数据、兼容、安全、范围或验收的未决问题；
- 依赖存在且无循环；
- `writable_paths`、`read_only_paths` 和 `shared_paths` 使用项目相对 Path 标签；
- shared path 有唯一 owner；
- 验收标准可判定；
- 验证矩阵覆盖正常、失败和回归风险，或有可信的不适用理由；
- 迁移或安全操作等不可交换的顺序已明确；普通局部实现不要求预写步骤；
- Deep Ticket 的实际风险及相应迁移、兼容、恢复或批准要求已闭合；
- 单个全新上下文可以完成，否则必须拆分。

详细检查位于 `<Path>{roots.workflows}/specdev/specdev-t-tickets/references/ticket-readiness.md</Path>`。

## 3. Spec Readiness

`<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` 只有在外部行为、范围、公共接口、数据、安全、兼容、迁移和验收合同不存在高影响未知项时，才可设置 `ready_for_tickets: true`。

UI 范围的 Ready Spec 同样要求已批准且未漂移的 change DESIGN 和页面/状态 AC 映射；纯后端或 LOGIC-only 无此要求。

轻量 README 的 scope/acceptance/verification 使用同样的外部行为、风险与可判定 AC 门；没有独立票不要求 Spec YAML 或 Map。Deep、真实并行、跨 change 或复杂设计依赖必须使用完整工件；用户明确产物要求不因轻量分支降低。

## 4. 假设规则

- 低影响、可逆的默认值可以作为显式假设继续；
- 高影响假设不得用于强行通过 Ready；
- 实现者发现假设不成立时，按 `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>` 处理；
- 假设必须有适用范围和验证方式。
