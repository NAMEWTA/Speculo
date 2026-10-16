# Continuous Implementation Loop

## 每轮固定顺序

1. 重读父 status、Map、Plan、成员 status/Tickets 和 repository；
2. 校验 Map revision、Plan source revision、当前 Lead 身份、授权、active dispatch、workspace 与 integration queue；
3. 重建 super-DAG 并计算 ready frontier；
4. 根据 auto/serial/parallel、父子票据上限、DAG 与路径/语义资源选择节点；
5. 为每个节点形成不可变 Dispatch Packet，task ID 使用组合身份；
6. 调用 I 完成设计、TDD、固定 checkpoint/快照、双轴审查、验证和 Evidence；
7. Lead 在成员选定工作区独立验收返回，Git index/ref 和公共验证资源串行协调；
8. 先写子 Ticket/Evidence 的实际结果，再写 Map 导航与父 Plan 集成/Gate；
9. 重读实际 Git 和全部受影响工件，运行 validator；
10. 有 frontier 则继续，无 frontier 则完成或持久化 blocker。

## 唯一写入者

父 Lead 拥有本轮正式状态、Evidence、E2E 和验收。实现者只写本成员选定工作区的授权路径，可以按要求组成团队，不能写父/子状态或其他成员文件；同一 change 不另开票据 worktree。

## 自动继续边界

子 Ticket 正常完成、固定输入漂移后重新核验、已批准且产生新证据的局部实现修正和下一 frontier 选择不再次询问用户。同一 Ticket 反复返回相同 blocker、没有新证据或达到 integration attempt 上限时，停止该 Ticket 的自动重复并回到父 Lead 决策点；父 Lead 重读其全部 Evidence，记录共同失败模式、最可能原因、下一轮改变和下一 owner/路由，再决定改写指导、换 owner、自行实现或返回上游契约 owner。只有形成有实质变化的新 Dispatch Packet 后，才可重置该 Ticket attempts 并重新派发。

这个回转不自动终止整个父循环；父 Lead 可以继续其他不受影响的 ready frontier。以下情况才停止并等待用户或上游新决定：

- 高影响合同、范围、架构、数据、安全、迁移或验收需要新决定；
- 明确承诺的 Git 集成或不可逆动作缺少授权；普通快照验收不以提交为前提；
- dependency/serialization/path owner 无法由权威事实裁决；
- 无合法 frontier 但仍有非终态 Ticket。

停止时父 Plan 保存最后 accepted 节点、active/stale dispatch、Git checkpoint、blocker、owner、下一合法动作和恢复重读清单。
