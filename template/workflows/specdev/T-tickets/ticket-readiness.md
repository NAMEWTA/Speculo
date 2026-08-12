# Ticket Definition of Ready

本检查由 `<Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>` 使用，并细化 `<Path>{roots.workflows}/specdev/common/rules/readiness-and-depth.md</Path>`。

## 通用门禁

- [ ] frontmatter 字段完整，Ticket ID、文件名和 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 一致。
- [ ] 可观察产出单一、明确且可验证。
- [ ] 来源和验收合同映射存在。
- [ ] IN、REUSE、OUT 无冲突。
- [ ] 高影响未决问题为零。
- [ ] `blocked_by` 指向存在的 Ticket，DAG 无环。
- [ ] `expected_changes`、`writable_paths`、`read_only_paths` 和 `shared_paths` 中的项目路径都使用项目相对 Path 标签。
- [ ] `writable_paths` 非空；纯 review/research 不伪装成 I-implement Ticket。
- [ ] 每个 shared path 在 `shared_path_owners` 中有唯一 owner。
- [ ] 正常、失败和回归至少各有一条验证，或有可信的不适用原因。
- [ ] 明确 `E2E disposition: required | not-required: reason`；required 场景、预期和接缝可执行。
- [ ] 按 Goal Plan 策略定义 current-workspace 或 source-worktree 的非 E2E 检查；E2E owner 固定为 Lead，运行环境分别为 current-workspace 或 parent-candidate。
- [ ] Ticket 完成合同包含 implementation commit、direct-parent 或 candidate-merge、父分支 result SHA 和 Lead Evidence；仅 required 模式需要独立 worktree。
- [ ] Evidence 位置明确为 `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`。
- [ ] 单个全新上下文能够完成；否则已拆分。
- [ ] 所有内部文件与目录引用使用完整根变量 Path 标签。

## Standard 门禁

- [ ] 实现契约包含入口、输入输出、不变量、状态或数据流、失败行为和兼容。
- [ ] 有 3–7 步有序执行路线。
- [ ] 路径所有权足以支持并发判断。
- [ ] 验证矩阵可以证明外部行为，而非只检查内部调用。

## Deep 门禁

- [ ] 迁移顺序、兼容窗口、监控、回滚或前向恢复、收缩条件和批准点完整。
- [ ] 安全、隐私、资金或数据完整性风险有缓解与验证。
- [ ] 跨 implementation owner 的路径所有权和所选 direct-parent/parent-candidate 集成 Gate 明确。
- [ ] expand-contract 的收缩条件可通过扫描、指标、查询或测试证明。

## Ready 状态

只有全部适用项通过时才能设置：

```yaml
ready: true
status: ready
```

未通过时保持 `ready: false`，并在未决问题、阻塞原因或偏差记录中写明原因。
