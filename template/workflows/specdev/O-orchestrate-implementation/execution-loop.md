# Continuous Implementation Loop

## 每轮固定顺序

1. 重读父 status、Map、Plan、成员 status/Tickets 和 repository；
2. 校验 Map revision、Plan source revision、Lead epoch、授权、active dispatch、workspace 与 integration queue；
3. 重建 super-DAG 并计算 ready frontier；
4. 根据 current/required 策略选择本轮节点；
5. 为每个节点形成不可变 Dispatch Packet，task ID 使用组合身份；
6. 调用 I-implement 完成设计检查、TDD、commit、双轴审查、验证和 Evidence；
7. Lead 独立验收返回事实并按 repository/ref 串行集成；
8. 先写子 Ticket/Map/Evidence/change status，再写父 Plan 进度；
9. 重读实际 Git 和全部受影响工件，运行 validator；
10. 有 frontier 则继续，无 frontier 则完成或持久化 blocker。

## 唯一写入者

父 Lead 是全部 SpecDev 工件、E2E、integration queue 和父分支推进的唯一 owner。Implementation agent 在 current 模式写唯一当前 workspace，或在 required 模式写绑定 Ticket 的 source worktree；不得写父/子状态、Evidence、其他成员或父分支。

## 自动继续边界

子 Ticket 正常完成、candidate stale 后可机械重建、已批准的局部实现修正和下一 frontier 选择不再次询问用户。以下情况停止：

- 高影响合同、范围、架构、数据、安全、迁移或验收需要新决定；
- implementation commit、integration 或不可逆动作缺少授权；
- dependency/serialization/path owner 无法由权威事实裁决；
- 连续集成尝试达到父 Plan 上限；
- 无合法 frontier 但仍有非终态 Ticket。

停止时父 Plan 保存最后 accepted 节点、active/stale dispatch、Git checkpoint、blocker、owner、下一合法动作和恢复重读清单。
