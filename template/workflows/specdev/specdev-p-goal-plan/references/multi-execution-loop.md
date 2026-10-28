# Continuous Implementation Loop

## 每轮固定顺序

1. 重读父 README Outcome、Map、Plan、成员 README/Tickets 和 repository；
2. 校验 Map revision、Plan source revision、当前 Lead 身份、授权、实际存在的 active dispatch、workspace 与 integration queue；
3. 重建 super-DAG，分别计算 eligible、conflicts 与 suggested_batch；draft 节点保留在父图但不进入 eligible；
4. 从 eligible 根据 auto/serial/parallel、父子票据上限、DAG 与路径/语义资源选择合法组合；可偏离 suggested_batch，但不能忽略 conflicts；
5. 由主 Agent 连续执行或按真实收益委派；需要持久交接的节点形成不可变 Dispatch Packet，task ID 使用组合身份，不因节点数自动组队；
6. 调用 I 完成设计、TDD、固定 checkpoint/快照、风险适配双轴检查、验证和 Evidence；真正要求独立审查的节点仍须独立身份与冻结输入证据；
7. Lead 在成员选定工作区核验实际产物与检查结果，Git index/ref 和公共验证资源串行协调；
8. 先写子 Ticket/Evidence 的实际结果，再写 Map 导航与父 Plan 集成/Gate；
9. 重读实际 Git 和全部受影响工件，运行 validator；
10. 有合法可执行组合则继续，否则按真实完成状态关闭或持久化 blocker。

## 唯一写入者

父 Lead 拥有本轮正式状态、Evidence、E2E 和验收。实现者只写本成员选定工作区的授权路径，可在真实收益与权限内采用协作，但不默认组成团队，不能写父/子状态或其他成员文件；同一 change 不另开票据 worktree。

## 自动继续边界

子 Ticket 正常完成、固定输入漂移后重新核验、已批准且产生新证据的局部实现修正和下一合法节点组合选择不再次询问用户。同一 Ticket 反复返回相同 blocker、没有新证据或达到 integration attempt 上限时，停止该 Ticket 的自动重复并回到父 Lead 决策点；父 Lead 重读其全部 Evidence，记录共同失败模式、最可能原因、下一轮改变和下一 owner/路由，再决定改写指导、换 owner、自行实现或返回上游契约 owner。只有形成有实质变化且可回读的新执行输入（需持久委派时为新 Dispatch Packet）后，才可重置该 Ticket attempts 并接续；原执行结果未知或 writer 未停止时不得重复派发。

这个回转不自动终止整个父循环；父 Lead 可以继续其他不受影响的 eligible 节点，在冲突与配额允许时执行。以下情况才停止并等待用户或上游新决定：

- 高影响合同、范围、架构、数据、安全、迁移或验收需要新决定；
- 明确承诺的 Git 集成或不可逆动作缺少授权；普通快照验收不以提交为前提；
- dependency/serialization/path owner 无法由权威事实裁决；
- 没有合法可执行组合但仍有非终态 Ticket。

停止时父 Plan 保存最后 accepted 节点、active/stale dispatch、Git checkpoint、blocker、owner、下一合法动作和恢复重读清单。
