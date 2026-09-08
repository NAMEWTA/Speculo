---
name: subagent-delivery
description: 仅在 Lead 规划派单合同、发出受限任务或验收其返回时调用；不是通用实现入口，外部网页交付仍为 ZIP-only。
---

# Subagent Delivery

本 Skill 被 P-goal-plan 与 I-implement 调用，并在子 change 属于父 Implementation Map 时遵守统一 P（兼容旧 O）的父 Plan。Lead 是固定外层 owner；本 Skill 只负责把一次任务变成可独立投递、可恢复、可验收的 Dispatch Packet，不创建第二个 SpecDev 状态写入者。

## 输入

所有调用都必须提供 `operation=plan | dispatch | accept` 与 Lead owner/session locator。其余输入按 operation 判定，不得把后续阶段事实反向要求给 `plan`：

- `operation=plan`：提供允许的 `task_kind` 集合、implementation subagent 上限、Lead/SpecDev/父分支/E2E 所有权和通用授权边界；Goal Plan 此时可以尚未写入，也不要求 Ticket、provider、checkpoint、workspace 或外部附件；
- `operation=dispatch`：提供 `task_kind=implementation | review | research | test-observation`、已存在 Goal Plan（若有）、Ticket/固定审查目标、依赖 Evidence、适用合同、repository、不可变 checkpoint、项目 Agent 指令、workspace/session locator、provider、`delivery_channel=native | external-web`、允许动作、路径边界、检查、停止条件与返回格式；
- `operation=accept`：提供原 Dispatch Packet、subagent 返回、当前 repository/workspace、预期与实际 checkpoint，以及 Lead 可用于独立核对的文件、Git 与命令事实。`delivery_channel` 从原 Packet 读取，不在验收时重新推断。

`operation=dispatch` 且 `task_kind=implementation` 时，必须提供子 Goal Plan 或父 Implementation Plan 的 workspace strategy、branch、`base_sha`、writable/shared owner、implementation commit 授权与对应检查。`required` 必须提供独立 Ticket worktree 和 source-worktree 非 E2E 检查；`current` 必须提供 `workspace_ref=current`、parent branch 和 current-workspace 串行锁。两种计划都不存在时返回 blocked，不推断策略或并发权限。

每个 implementation dispatch 还必须提供当前 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`、当前 Ticket ID，以及 Map 中适用于 `ALL` 或该 Ticket 的项目 Skill 项目根相对路径。Packet 固定读取顺序为 Tickets Map -> 适用项目 Skill -> 当前 Ticket；矩阵是最低必读集合而非 allowlist。原生通道引用同一 workspace 中的真实文件；外部网页通道按 source-package reference 把 Map 与项目 Skill 的任务所需依赖闭包装入 outbound ZIP。

若 Ticket 属于父实现 change，dispatch 还必须提供父 Implementation Map revision、父 Plan source revision、全局 workspace 策略、implementation agent limit、dependency Gate、serialization lock、integration queue slot 和组合 `task_id=<member-change>::<ticket-id>`。任一 revision/strategy/lock 在接收前漂移时，Packet 失效并返回父 Lead 重算。

`delivery_channel=external-web` 时还必须提供：

- `dispatch_id` 与只含 `[A-Za-z0-9._-]` 的可迁移标识；
- 用户对目标 provider 和发送内容范围的明确授权；
- provider/session locator、文件上传能力、返回捕获能力、文件/上下文上限与数据保留边界；
- 项目根目录内的 `artifact_root=<Path>temp/subagent-delivery/{scope-id}/{task-id}/{dispatch-id}/</Path>`；
- outbound ZIP locator 与 SHA-256（在实际生成后写回 Packet）；
- 联网任务的允许域、来源质量、引用格式、工具调用预算或停止条件。

任一外部必需字段、能力或授权不足时返回 blocked，或由 Lead 改用原生/Lead 执行；不得降低合同。

## 1. 固定 Lead 与任务类型

Lead 保留需求解释、DAG/Wave/Gate、shared owner、权限、SpecDev 工件、Evidence、candidate integration、父分支和最终回复。subagent 不写 Ticket、Map、Goal Plan、Evidence、change status 或父分支。

- 原生 implementation subagent 可以在 `required` 模式写唯一 Ticket worktree，或在 `current` 模式按串行锁写当前 workspace，并在明确授权时创建 implementation commit；
- 外部网页 subagent 永远不拥有本地 repository、workspace/worktree、commit、SpecDev 状态或凭据，只返回候选；
- review/research/test-observation 默认只读，返回 findings、来源或命令观察；
- E2E Gate 永远由 Lead 拥有，不能派给 implementation 或只读 subagent；`required` Ticket E2E 在 parent-candidate 状态执行，`current` Ticket 和 Direct Spec E2E 在 Lead-owned current workspace 执行。

**完成标准**：Lead、task kind、写入边界和 E2E owner 唯一。

## 按需执行入口

`operation=plan` 返回上述通用合同，Goal Plan 此时可以尚未写入，不预分配 Ticket agent/provider/workspace。`operation=dispatch` 或 `operation=accept` 必须读取 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/references/dispatch-and-accept.md</Path>`，再按实际 native/external-web 通道展开对应参考。

返回完整 Packet 或验收结果，不缩减调用方的产物数量。外部网页仍只通过项目内持久化 ZIP 交付，授权不足、路径/版本漂移或证据不足时阻塞相关 Packet；Lead 独立验收，不把“阅读 Skill”当成执行。原 implementation 重试上限、失败复盘和局部继续策略保持。
