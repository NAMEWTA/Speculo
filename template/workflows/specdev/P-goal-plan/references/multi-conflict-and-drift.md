# Implementation Conflict and Drift

## 冲突分类

1. **真实依赖**：加入 dependency，前置 Ticket 完成前不启动后置 Ticket。
2. **资源冲突**：加入 serialization，记录唯一 owner 与释放条件，不改变产品语义。
3. **合同冲突**：行为、公共接口、数据、安全、范围或验收不一致；阻塞父 Plan，返回子 ADR/Spec/用户 owner。
4. **基线漂移**：Ticket、Map revision、branch、HEAD、workspace 或 candidate 变化；废弃旧 dispatch/candidate，基于最新事实重新 preflight。

## 路径与共享合同

比较所有非终态 Ticket 的 writable/shared paths。无传递 dependency 的 overlap 必须有父 serialization；若两边 Ticket 的路径 owner 自身不合法，先阻塞并返回原 Ticket owner，父 Map 不能替它补 owner。

同一共享 API/schema/锁文件/迁移索引即使路径预测不重叠，也必须根据实际消费者和集成事实决定 dependency 或 serialization。

## 集成冲突

同一 repository/ref 的 direct-parent/candidate integration 严格串行。一次父 HEAD 推进后，其他 candidate 全部 stale；必须在最新父状态重新组合并重跑要求的 full suite/E2E。需要新行为或上层决定的 merge conflict 立即停止。
