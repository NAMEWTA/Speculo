# Execution Preflight

## 硬检查

- [ ] Ticket frontmatter 可解析，`ready: true`，`status: ready`。
- [ ] 所有 blocked_by Ticket 为 done 且证据存在。
- [ ] Spec、ADR、Ticket 和 Goal Plan 无冲突。
- [ ] 当前代码入口、接口和路径仍与 Ticket 假设一致。
- [ ] writable_paths 无并发 owner 冲突。
- [ ] 并行执行时，`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `worktrees` 中本 Ticket 为 `active`，`base_sha`、分支和 `workspace_ref` 与派单一致。
- [ ] 验证命令/环境可用。
- [ ] Deep Ticket 的批准点已满足。

## 失效分类

- **stale-navigation**：仅 expected_changes/行号过时，契约仍有效；更新导航后继续。
- **local-implementation**：局部实现方式需调整，不改变契约；记录后继续。
- **ticket-invalid**：范围、接口、依赖、验证或路径契约失效；停止并修 Ticket。
- **spec-invalid**：外部行为/合同需改变；停止并修 Spec。
- **adr-conflict**：架构决策冲突；停止并处理 ADR。
