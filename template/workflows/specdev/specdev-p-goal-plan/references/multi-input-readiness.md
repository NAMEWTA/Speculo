# Implementation Input Readiness

## 父图创建与节点执行分开判断

对每个用户指定成员穷尽检查整体合同，而不是要求全员此刻可执行：

1. change 位于 active namespace，身份明确，没有另一个未完成父实现 owner；
2. Spec 使用当前 schema，`status: ready` 且 `ready_for_tickets: true`，整体目标、范围、公共接口与验收已有依据；
3. Tickets Map 使用当前 schema，状态为 ready、in_progress 或 completed，完整列出原 Ticket；
4. Ticket 目录非空，ID/文件名唯一，内部依赖与跨 change 依赖可解析、无环；
5. 每个节点符合本身状态的合同。可以保留 `status: draft`、`ready: false` 的下游消费者及其待上游产物的原因；它不获得执行资格，也不能标 done。deferred 是原 Map/Ticket 的范围/等待说明，不新增第二套状态；
6. Ready 节点决策完备、写集/验证/验收充分；in_progress/review 仍须 `ready: true` 且前置已成功；
7. done Ticket 有真实 Evidence 与完成 workspace 记录，cancelled 有权威理由且不能满足下游依赖；
8. Spec 合同全部 covered 或有用户批准的 deferred，整体目标、成员身份、依赖及公共合同不得以“渐进”掩盖未决；
9. 检查实际代码与准备执行节点的入口、路径及验证接缝，漂移按对应 owner 与依赖闭包处理。

身份、整体合同、DAG 或父级公共门失败时停止父图创建，返回缺口和 owning Work，不创建伪 Ready 父记录。节点自身尚未 Ready 不等于父图无效；在原 Ticket 保留缺口、原因和恢复 owner，父 Work 不代替 owning Work 完成其决策。

## 执行与恢复

父 Plan 的 `ready_for_execution` 表示总体计划可用于调度，不表示每个成员 Ticket 都 Ready。每轮从原 Ticket/Spec/Evidence 和实际 writer 重算 eligible；只有自身 DoR 满足、依赖成功、授权有效、无运行中冲突且有配额的节点可执行。Ready 生产者可以先行，draft 消费者等待真实产物后由原 owner 更新其 Ticket。

单票 draft、blocked/deviated 或本地漂移只阻塞该节点及依赖闭包，不撤销独立上游的执行门。全局门失效或没有可推进的合法节点时暂停相应运行并保留原因，不反复派单。分析器输出与建议批次见 <Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/multi-super-dag.md</Path>。

## 已完成成员

全部 Ticket 已 done/cancelled 且 change 已 completed 的成员可以作为已结束基线，不占用实现配额。依赖仍逐票核验：done 且证据有效才表示成功交付；cancelled 不提供产物。原 Lead 根据真实交付或获批范围调整重规划，不将取消当成功。若所有成员已结束且没有待实现工作，停止，因为不存在新的实现编排目标。
