# Parent Implementation Orchestration

本规则只约束 Ready Spec/Tickets 之后的跨 change 实现，供统一 P-goal-plan、I-implement 与 A-archive-and-consolidate 读取。

## 输入边界

父实现 change 只能在所有成员通过 Ready Spec/Tickets 输入门后创建。父 Work 不调用或代行 Triage、Grill、Wayfinder、Spec、Tickets 或普通 Goal Plan；输入不足时不留下父状态或父工件。

## 权威边界

- 父 Implementation Map：成员、组合 Ticket inventory、跨 change dependency/serialization 与 revision 的唯一权威投影。
- 父 Implementation Plan：Lead、跨 change ticket_execution、可选票据上限、明确实现者限制、Gate/Wave、serialization 和已授权 Git 交付队列；工作区只引用成员上下文。
- 子 change：自己的 Spec、Ticket、内部 Goal Gate、workspace、Git、Evidence 和完成状态的唯一权威。

父工件不得复制完整子合同。子权威变化时停止旧派单、递增父 Map revision 并重算父 Plan；不能从旧父投影覆盖子工件。

## 唯一所有权

一个 active/blocked 子 change 最多属于一个未完成父实现 change。v1 不支持父实现 change 嵌套。父 Lead 是父工件、父计划及授权 Evidence 写入、E2E、repository/ref integration queue 和父分支推进的唯一 owner；implementation agent 只写授权项目 workspace。

## I-implement 调用

父 Plan 可替代缺失的子 Goal 提供跨 change 调度/Gate 和执行边界；子计划的约束同时遵守。成员实际工作区由各自 README 唯一记录，父计划不得覆盖已有选择；完成或阻塞组合票后返回父 P。

## 归档与完成

未完成父实现 change 的成员不得归档。成员满足普通 change completion 时可以先 completed，但不自动归档。父 change 只有全部成员 completed、Map/Plan completed、aggregate Evidence 完整且无 active dispatch/candidate/lock 后才能 completed；完成或归档均不自动级联。

父完成门逐一重验成员选定工作区的实际交付和最终固定审查输入，不要求先合并成员分支。父聚合双轴审查同时绑定当前 Map、Plan、成员 Spec 与各成员最终 Evidence 的 review-input 锚点；可对这些编排工件使用 source-files 固定快照，但不能替代成员的实现变更审查。成员代码、规格或审查输入变化后，重新核验受影响成员与聚合证据；Git 交付仍只执行具体已授权动作。

## 局部阻塞不升级为全局停机

父创建前仍全部成员预检且 all-or-nothing。父开始运行后，单票 blocked/deviated、他人资源冲突或必需 Skill 失效只阻塞该票及其依赖闭包，父 Map/Plan 可保持 in_progress 与有效的全局执行门，继续独立已授权 frontier。只有共享的全局门禁失败、计划整体失效或没有合法 frontier 时，才将父运行暂停；不得为继续运行接管其他任务。
