# Execution Preflight

先按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 解析有效执行选择；用户选择 Herdr 时先完成其项目 Skill 接入与环境检查。无 Goal 不构成阻塞，不能用另一个 CLI 或工作区替换用户固定选择。

## Ticket 硬检查

- [ ] Ticket frontmatter 可解析，`ready: true`，`status: ready`。
- [ ] Tickets Map 已完整读取，包含总体实施背景和项目 Skill 读取矩阵；当前 Ticket 被 `ALL` 或自身 ID 覆盖。
- [ ] 当前 Ticket 映射的项目 Skill 路径均为真实存在的项目根相对入口文件，Lead 已读取入口并完整展开命中的 Skill；实现执行者 Packet 包含 Map 与同一最低必读集合。
- [ ] 项目 Agent 指令或当前实现范围没有触发矩阵外的未读项目 Skill；发现新匹配项时由 Lead 更新 Map、重新运行 tickets 校验后再恢复受影响写入。
- [ ] 所有 `blocked_by` Ticket 为 done 且 Evidence 存在。
- [ ] UI Ticket 的 design_ref revision/digest/pages/acceptance 与已批准 change DESIGN 一致，prototype/基线引用未漂移；实际 UI 文件范围不能通过省略 ui_change 绕过。
- [ ] Spec、ADR、Ticket 与 Goal Plan 无冲突；Goal Plan 只接受当前 schema v8，不自动读取或升级旧协议。
- [ ] Goal Plan（若存在）为 lead-directed，票据策略为 auto/serial/parallel；max_parallel_tickets 与实际实现者人数限制分别核对，来源可回读。
- [ ] 当前代码入口、接口、路径和父分支仍与 Ticket 假设一致。
- [ ] writable/shared paths 和语义资源有唯一 owner；并行候选无冲突，serial 时没有另一张 in_progress/review 票。
- [ ] 实现已授权；提交、合并、push/PR/deploy 等仅在本次实际需要且已有明确授权时执行，不作为默认每票门。
- [ ] README 的 Execution Context 与实际 change 工作区、branch、base、owner 一致；本票执行记录引用它，缺失时由 Lead 先登记真实上下文。
- [ ] 派遣 Packet 绑定本票、选定 change 工作区、固定输入与具体写集；多个协作者各有明确范围，不写正式状态。
- [ ] 检查在 change-workspace 运行；独立审查和整体验收前协调相关 writer 停写，E2E 由 Lead 拥有。
- [ ] 验证命令/环境可用，关键静默失败风险有受控反向验证。
- [ ] Deep Ticket 批准点已满足。
- [ ] 属于父实现时：revision、组合 ID、dependency/serialization、实际 workspace 和票据配额一致；父计划引用成员工作区，不能改选或新增。

## Direct Spec 硬检查

- [ ] 用户已授权按当前规格实现；独立 Spec 已就绪（ready_for_tickets=true），目标、行为、风险门与验收完整；README 替代规格时仍满足轻量边界。不要求单一行为或低风险，确需独立调度/依赖 DAG 才拆票。
- [ ] Direct Spec 的执行者复用 change 唯一工作区，写集无冲突；可由 worker 写获分配的业务文档，正式状态和 Evidence 仍由 Lead 核验维护。
- [ ] 目标、IN/OUT、可写范围、不变量、验证与验收完整。
- [ ] Direct Spec 涉及 UI 时读取批准 DESIGN 并冻结版本、页面/状态与原型摘要；无 UI 不要求此项。
- [ ] 实施前 Git checkpoint、dirty 状态和现有用户改动已记录，不覆盖无关改动。
- [ ] 已读命中 Skill，适用检查与 E2E 环境可执行，E2E owner 为 Lead，验证输入可冻结回读。
- [ ] 未获提交授权时固定工作副本快照；选 worktree 不额外要求 commit/merge 授权。

- [ ] Direct Spec 执行记录以 purpose/change 标识，引用唯一 Execution Context；不与未处置 Ticket 执行记录混用。

## 失效分类

- **stale-navigation**：导航过时但契约仍有效；更新导航继续。
- **local-implementation**：局部实现调整不改变契约；记录后继续。
- **ticket-invalid**：范围、接口、依赖、验证或路径合同失效；停止并修 Ticket。
- **map-context-stale**：总体实施背景、项目 Skill 矩阵、Ticket 覆盖或 Skill 路径失效；停止依赖失效内容的写入并返回 T-tickets 更新 Map。
- **design-invalid / design-drift**：UI 批准缺失、revision/digest/原型/基线不一致或页面合同失效；停止受影响实现并返回 P-prototype，不能由 I 改写 DESIGN 消除偏差。
- **spec-invalid / adr-conflict**：返回对应上游 owner。
- **checkpoint-drift**：固定输入与实际变更不一致；停止受影响验收，重新冻结并重验，不新建 worktree。
- **workspace-contract-invalid**：工作区、branch、基线、owner 或授权无法核对；停止受影响写入并保留现场。
- **workspace-strategy-invalid**：上下文冲突、额外工作区或非法调度策略；由原 owner 整理后恢复。
- **delivery-unverified**：候选、provider 声明或附件不能独立核对；保持 unverified。
- **e2e-owner-invalid**：适用 E2E 未在稳定交付上由 Lead 验收；修正验证安排。
- **delivery-checkpoint-invalid**：完成证据未覆盖真实交付；保留最后可信快照并阻塞本票。
- **parent-plan-stale**：父 Implementation Map revision、成员 Ticket、serialization、workspace 策略、全局实现配额或 repository/ref 已变化；停止受影响派单并返回 P-goal-plan 重算，全局结构失效才暂停全部 frontier。

## 验证范围与失败保证

冻结本票真实消费者、配置/构建入口、适用文档与验证命令；不把 DSH 命令当项目事实。只复用输入和环境仍有效的证据；失败副作用未知时按 <Path>{roots.workflows}/specdev/common/rules/error-handling.md</Path> 暂停依赖工作，恢复前沿原 owner 核实，不重放未决动作。
