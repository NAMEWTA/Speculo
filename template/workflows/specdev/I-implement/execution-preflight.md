# Execution Preflight

## 硬检查

- [ ] Ticket frontmatter 可解析，`ready: true`，`status: ready`。
- [ ] 所有 blocked_by Ticket 为 done 且证据存在。
- [ ] Spec、ADR、Ticket 和 Goal Plan 无冲突。
- [ ] 当前代码入口、接口和路径仍与 Ticket 假设一致。
- [ ] writable_paths 无并发 owner 冲突。
- [ ] Goal Plan 的 coordination mode 与 workspace strategy 均可判定；旧计划缺少字段时只按兼容规则推导，不把 Agent Team 当作 worktree 触发条件。
- [ ] Ticket 分配到 worktree 时，记录为 `active`，合法 trigger、`base_sha`、父分支、implementation/integration owner、分支、`workspace_ref` 和结束动作与计划一致。
- [ ] `lead-team` 时只有一个 execution model 和 Lead，mutation role、派单 checkpoint 与当前源码一致，workspace/session locator 可恢复；`worker-write` 不指向 current workspace。
- [ ] 授权矩阵分别覆盖 local changes、implementation commit、local worktree integration、push、PR、remote merge、deploy、migration 和生产动作；未授权动作不会执行。
- [ ] 委派候选交付的附件 hash、修改范围和事实声明可由 Lead 独立核对。
- [ ] 验证命令/环境可用。
- [ ] 可静默失效的关键门禁定义了受控反向验证；普通测试不为形式追加破坏性检查。
- [ ] Deep Ticket 的批准点已满足。

## 失效分类

- **stale-navigation**：仅 expected_changes/行号过时，契约仍有效；更新导航后继续。
- **local-implementation**：局部实现方式需调整，不改变契约；记录后继续。
- **ticket-invalid**：范围、接口、依赖、验证或路径契约失效；停止并修 Ticket。
- **spec-invalid**：外部行为/合同需改变；停止并修 Spec。
- **adr-conflict**：架构决策冲突；停止并处理 ADR。
- **checkpoint-drift**：委派派单基线、源码包或当前代码已经漂移；暂停并由 Lead 重放、重派或建立新 checkpoint。
- **workspace-contract-invalid**：worktree 缺少合法 trigger、父分支、owner、locator、source checkpoint 或结束动作；停止并修 Goal Plan/状态记录。
- **delivery-unverified**：候选交付、provider 声明或附件无法独立核对；保持 `unverified`，不得推进 `done`。
