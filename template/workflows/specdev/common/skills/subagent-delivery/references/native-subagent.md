# Native Subagent

Lead 可以直接创建和管理隔离 Agent 时加载。

## 派单

Lead 为每个 Agent 发送一个完整 Dispatch Packet。implementation Agent 只进入指定 Ticket worktree；review/research/test-observation Agent 只读取固定输入。并行前核对 Ticket 依赖与 writable/shared path，不以“不同 Agent”代替路径隔离。

Packet 对 implementation 明确：

- Ticket、Goal Plan、依赖 Evidence 与 `base_sha`；
- branch、portable `workspace_ref`、writable/read-only/shared paths；
- 允许 worktree local changes 与 implementation commit；
- 单元、组件、静态、类型、lint/build 等适用非 E2E 检查；
- E2E 由 Lead 在 parent-candidate 状态执行；
- 越界、合同冲突、基线漂移和无法提交时立即停止。

## 返回

implementation Agent 返回 Ticket ID、workspace locator、最终 commit、`git status`、修改路径、命令/结果、未运行项、冲突和恢复条件，不写 SpecDev Evidence。只读 Agent 返回固定 checkpoint、findings、来源、命令观察和未验证项。

Lead 重读 worktree、验证 commit 可达且 tip 一致、检查实际 diff 与路径合同，再决定接受、修正或 blocked。接受的 implementation 候选进入 dev-worktree candidate-merge；只读结论由 Lead 写入对应权威工件。

**完成标准**：原生 Agent 的写入与返回均绑定一个 Packet；Lead 可以独立复现其事实声明。
