# 路径所有权与并发规则

路径所有权是逻辑写入边界；worktree 是物理隔离边界，两者不能互相替代。

## 1. 四类路径

- `expected_changes`：导航预测；
- `writable_paths`：当前 Ticket implementation owner 可写的硬边界；
- `read_only_paths`：只读上下文；
- `shared_paths`：多个 Ticket 可能触达且必须有唯一 owner 的项目路径。

所有项目路径使用项目相对 Path 标签。根依赖清单、锁文件、根导出、共享 schema、迁移索引、全局路由和跨 Ticket 合同默认视为 shared。

## 2. 所有权规则

1. 可能并行的 Ticket，其 writable paths 不得相交；glob 按覆盖关系判断。
2. shared path 只由专用 owner Ticket 修改；消费者 Ticket 只读。Lead 负责集成，不以冲突解决替代 shared owner。
3. 实现执行者 只写其 Packet 与 Ticket 授权路径；Lead 自行实现也受同一边界约束。
4. review/research/test-observation agent 只读项目与 SpecDev 工件。
5. 越界前停止并按 deviation control 提出 ownership change；不得先改后报。
6. 上游 Ticket 改变目录/合同后，下游基于已集成父分支重新解析路径和 preflight。

## 3. change 工作区与协作

按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 独立确定票据调度、Agent 编排与工作区。每个 change 的工作区事实只在 README 执行上下文保存，所有票据和执行者复用；不以同一工作区推导单 writer，也不以并行推导独立 worktree。

Ticket owner 负责本票交付，可以安排多个执行者并细分授权写集；Lead 参与实现也遵守相同路径边界。SpecDev 状态、Evidence 和最终验收仍由 Lead 写入。只读任务可以并行，不占票据并发数；当前 Work 的独立 reviewer 要求仍生效。

## 4. 并发与验收时序

并行候选必须满足依赖、可写路径、shared owner、语义资源和明确并发限制。冲突操作由 owner 排序，不创建额外 worktree 规避共享语义冲突。单票 serial 不限制该票内部 Agent 合作；同一票多个 Agent 的写集仍不得相撞。

Git index/提交/切换分支/合并串行协调；不得提交其他票或用户改动。固定审查输入与整体测试前停止相关 writer，记录真实 checkpoint 或工作副本快照，回读发现漂移后使受影响证据失效。Lead 的 E2E Gate 在选定 change 工作区执行。

父实现存在时，按组合 ID 协调跨 change 依赖和 serialization；保留每个成员工作区，父票据上限计量 Ticket，已有实现者限制单独执行。跨分支交付若要求合并，按具体授权和 Git 事实串行执行，不由单票 Done 自动触发。

**完成标准**：每个写集有唯一票据/实现者归属，所有票据可追溯至该 change 的唯一工作区，审查与验证覆盖真实交付。
