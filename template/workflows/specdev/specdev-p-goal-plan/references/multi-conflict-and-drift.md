# Implementation Conflict and Drift

## 冲突分类

1. **真实依赖**：加入 dependency，前置 Ticket 完成前不启动后置 Ticket。
2. **资源冲突**：加入 serialization，记录唯一 owner 与释放条件，不改变产品语义。
3. **合同冲突**：行为、公共接口、数据、安全、范围或验收不一致；阻塞父 Plan，返回子 ADR/Spec/用户 owner。
4. **基线漂移**：Ticket、Map revision、branch、HEAD、workspace 或 candidate 变化；废弃旧 dispatch/candidate，基于最新事实重新 preflight。

## 路径与共享合同

比较所有非终态 Ticket 的 writable/shared paths。无传递 dependency 的 overlap 必须有父 serialization；若两边 Ticket 的路径 owner 自身不合法，先阻塞并返回原 Ticket owner，父 Map 不能替它补 owner。

同一共享 API/schema/锁文件/迁移索引即使路径预测不重叠，也必须根据实际消费者和集成事实决定 dependency 或 serialization。

## 共享工作区和 Git 冲突

同一 workspace 的 Git index/commit/checkout/merge 及共享验证资源串行协调；不同票据的无冲突路径可并行。固定输入漂移后重新冻结并验证，不增加 candidate worktree。只有明确要求跨分支集成交付且授权匹配时才合并；需要新行为或上层决定的冲突停止并保留现场。
