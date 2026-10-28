# Ticket Definition of Ready

本检查由 `<Path>{roots.workflows}/specdev/specdev-t-tickets/SKILL.md</Path>` 使用，并细化 `<Path>{roots.workflows}/specdev/common/rules/readiness-and-depth.md</Path>`。

## 通用门禁

- [ ] frontmatter 字段完整，Ticket ID、文件名和 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 一致。
- [ ] Tickets Map 提供总体实施背景；项目 Skill 矩阵是可选导航，不要求扫描全目录或覆盖每票。
- [ ] 已知必需方法按 `required:` 矩阵项和 Ticket required binding 保留真实来源、版本、调用及验收责任；未发现可选知识不阻止 Ready。
- [ ] 普通知识按任务命中条件渐进发现，记录实际使用；新增可选 Skill 不自动重规划。
- [ ] 可观察产出单一、明确且可验证。
- [ ] 来源和验收合同映射存在。
- [ ] UI Ticket 的 ui_change/design_ref 固定批准 DESIGN 的 revision、digest、pages 与 acceptance；实际 UI 文件范围不能靠省略标记绕过，非 UI 票无此门禁。
- [ ] UI 实施的 Design Conformance 证据责任、页面/状态验收与真实浏览器路径明确；设计漂移返回 P。
- [ ] IN、REUSE、OUT 无冲突。
- [ ] 高影响未决问题为零。
- [ ] `blocked_by` 指向存在的 Ticket，DAG 无环。
- [ ] `expected_changes`、`writable_paths`、`read_only_paths` 和 `shared_paths` 中的项目路径都使用项目相对 Path 标签。
- [ ] `writable_paths` 非空；纯 review/research 不伪装成 I-implement Ticket。
- [ ] 每个 shared path 在 `shared_path_owners` 中有唯一 owner。
- [ ] 正常、失败和回归至少各有一条验证，或有可信的不适用原因。
- [ ] 明确 `E2E disposition: required | not-required: reason`；required 场景、预期和接缝可执行。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。
- [ ] Ticket 已明确进入 I，由其负责真实实现、checkpoint/快照、风险适配双轴审查、验证和 Lead Evidence；不强制每票 commit/merge。
- [ ] Evidence 位置明确为 `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`。
- [ ] 单个全新上下文能够完成；否则已拆分。
- [ ] 所有内部文件与目录引用使用完整根变量 Path 标签。

## Standard 门禁

- [ ] 适用的接口、不变量、失败与兼容合同可由 Spec 和本票差异定位。
- [ ] 影响安全或正确性的关键顺序已明确；不要求固定数量的执行步骤。
- [ ] 路径所有权足以支持并发判断。
- [ ] 验证矩阵可以证明外部行为，而非只检查内部调用。

## Deep 门禁

- [ ] 实际涉及的迁移、兼容、监控、恢复、收缩条件和批准点完整；无关项省略。
- [ ] 安全、隐私、资金或数据完整性风险有缓解与验证。
- [ ] 跨实现者的写集/共享资源 owner 与稳定输入验收安排明确，所有协作者复用所属 change 工作区。
- [ ] expand-contract 的收缩条件可通过扫描、指标、查询或测试证明。

## Ready 状态

只有全部适用项通过时才能设置：

```yaml
ready: true
status: ready
```

未通过时保持 `ready: false`，并在未决问题、阻塞原因或偏差记录中写明原因。

## 适用工程义务

Ready 前确认真实调用方、文档/升级说明、正常与失败验证、恢复条件和证据失效条件。删除测试有风险承接；性能票有测量基线和真实用户操作；文档票分清纯说明与可见行为。缺少 required 验证不因工具暂不可用而标 ready。
