# Parent Implementation Orchestration

本规则只约束 Ready Spec/Tickets 之后的跨 change 实现，供统一 P-goal-plan、兼容 P-goal-plan、I-implement 与 A-archive-and-consolidate 读取。

## 输入边界

父实现 change 只能在所有成员通过 Ready Spec/Tickets 输入门后创建。父 Work 不调用或代行 Triage、Grill、Wayfinder、Spec、Tickets 或普通 Goal Plan；输入不足时不留下父状态或父工件。

## 权威边界

- 父 Implementation Map：成员、组合 Ticket inventory、跨 change dependency/serialization 与 revision 的唯一权威投影。
- 父 Implementation Plan：Lead、全局 workspace 策略、implementation agent/integration attempt 上限、frontier、Wave、locks 和 integration queue 的唯一权威。
- 子 change：自己的 Spec、Ticket、内部 Goal Gate、workspace、Git、Evidence 和完成状态的唯一权威。

父工件不得复制完整子合同。子权威变化时停止旧派单、递增父 Map revision 并重算父 Plan；不能从旧父投影覆盖子工件。

## 唯一所有权

一个 active/blocked 子 change 最多属于一个未完成父实现 change。v1 不支持父实现 change 嵌套。父 Lead 是父工件、全部 SpecDev 状态写入、E2E、repository/ref integration queue 和父分支推进的唯一 owner；implementation agent 只写授权项目 workspace。

## I-implement 调用

父 Plan 可以替代缺失的子 Goal Plan 提供 workspace/integration 策略和全局执行边界。子 Goal Plan 存在时继续拥有子 change 内 Gate，但不得与父策略冲突。I-implement 完成或阻塞一个组合 Ticket 后返回父 P Goal（旧 O 入口保留恢复键），不要求用户重新激活 change。

## 归档与完成

未完成父实现 change 的成员不得归档。成员满足普通 change completion 时可以先 completed，但不自动归档。父 change 只有全部成员 completed、Map/Plan completed、aggregate Evidence 完整且无 active dispatch/candidate/lock 后才能 completed；完成或归档均不自动级联。

## 局部阻塞不升级为全局停机

父创建前仍全部成员预检且 all-or-nothing。父开始运行后，单票 blocked/deviated、他人资源冲突或必需 Skill 失效只阻塞该票及其依赖闭包，父 Map/Plan 可保持 in_progress 与有效的全局执行门，继续独立已授权 frontier。只有共享的全局门禁失败、计划整体失效或没有合法 frontier 时，才将父运行暂停；不得为继续运行接管其他任务。
