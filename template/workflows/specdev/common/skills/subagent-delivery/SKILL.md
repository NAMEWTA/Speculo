---
name: subagent-delivery
description: 动态派单合同：为 Lead 生成受限的 implementation/review/research/test-observation packet，绑定不可变 checkpoint，并在返回时核对 commit、范围和候选声明。
---

# Subagent Delivery

本 Skill 被 P-goal-plan 与 I-implement 调用。它不选择是否使用 Lead 模式：Lead 是固定外层 owner；本 Skill 只保证每次动态派单可恢复、可验收且不产生第二个 SpecDev 状态写入者。

## 输入

所有调用都必须提供 `operation=plan | dispatch | accept` 与 Lead owner/session locator。其余输入按 operation 判定，不得把后续阶段事实反向要求给 `plan`：

- `operation=plan`：提供允许的 `task_kind` 集合、implementation subagent 上限、Lead/SpecDev/父分支/E2E 所有权和通用授权边界；Goal Plan 此时可以尚未写入，不要求 Ticket、provider、checkpoint 或 workspace；
- `operation=dispatch`：提供 `task_kind=implementation | review | research | test-observation`、已存在 Goal Plan（若有）、Ticket/固定审查目标、依赖 Evidence、适用合同、repository、不可变 checkpoint、项目 Agent 指令、workspace/session locator、provider、允许动作、路径边界、检查、停止条件与返回格式；
- `operation=accept`：提供原 Dispatch Packet、subagent 返回、当前 repository/workspace、预期与实际 checkpoint，以及 Lead 可用于独立核对的 Git/命令事实。

`operation=dispatch` 且 `task_kind=implementation` 时，必须提供 Goal Plan 的 workspace strategy、branch、`base_sha`、writable/shared owner、implementation commit 授权与对应检查。`required` 必须提供独立 Ticket worktree 和 source-worktree 非 E2E 检查；`current` 必须提供 `workspace_ref=current`、parent branch 和 current-workspace 串行锁。缺失时返回 blocked，不推断策略或并发权限。

## 1. 固定 Lead 与任务类型

Lead 保留需求解释、DAG/Wave/Gate、shared owner、权限、SpecDev 工件、Evidence、candidate-merge、父分支和最终回复。subagent 不写 Ticket、Map、Goal Plan、Evidence、change status 或父分支。

- implementation 可以在 required 模式写唯一 Ticket worktree，或在 current 模式按串行锁写当前 workspace，并在授权时创建实现 commit；
- review/research/test-observation 只读，返回 findings、来源或命令观察；
- E2E Gate 永远由 Lead 拥有，不能派给 implementation 或只读 agent；required Ticket E2E 在 parent-candidate 状态执行，current Ticket 和 Direct Spec E2E 在 Lead-owned current workspace 执行。

**完成标准**：Lead、task kind、写入边界和 E2E owner 唯一。

## 2. 锁定基线、provider 与授权

记录 repository、branch、`base_sha`/固定审查 SHA、workspace/session locator 和 provider。GitHub 是源码事实来源时加载 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/references/github-checkpoints.md</Path>`；需要向外部 provider 发送附件或私有上下文时，取得发送授权后加载 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/references/source-package.md</Path>`。

授权逐动作记录：worktree local changes、implementation commit、外部内容发送、push、PR、remote merge、deploy、migration 和 production actions。Goal Plan 的本地 commit/integration 授权不扩展到远端、清理或生产动作。

**完成标准**：每个可变输入绑定 checkpoint；provider 只接收已授权范围；未授权动作不可执行。

## 3. 生成动态 Dispatch Packet

`operation=plan` 时只返回通用 Lead delivery contract，不读取尚未生成的 Goal Plan，也不为 Ticket 预分配 agent/provider。

`operation=dispatch` 时为单次任务生成 Packet：目标、IN/OUT、已锁定决定、固定输入、workspace、writable/read-only/shared paths、允许动作、必跑检查、禁止在 source worktree 运行 E2E、停止条件和返回字段。

- 原生 Agent：加载 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/references/native-subagent.md</Path>`；
- 外部网页 Agent：加载 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/references/external-web-subagent.md</Path>`。

implementation Packet 必须适合一个上下文独立完成；required 模式多个 implementation subagent 由 Lead 控制在 Goal Plan、config 与平台能力共同上限内，current 模式保持单 writer 串行。只读 agent 不设置 SpecDev 数字上限，但不得争用可变环境。

**完成标准**：Packet 可独立投递；目标、checkpoint、路径、权限、检查和返回均可判定。

## 4. 接收与验收候选

`operation=accept` 时，Lead 核对 Packet、当前父/来源基线、实际路径、dirty 状态、commit 可达性、命令输出和未验证项。外部声明、截图、provider 自报测试和推断保持 `unverified`，直到 Lead 在本地复核。

implementation 返回必须包含 Ticket ID、workspace locator、最终 commit、dirty 状态、修改路径、非 E2E 检查、失败/未运行项和恢复条件。review/research/test-observation 返回固定输入、findings、来源、命令与未验证声明。Lead 把验收结果写入调用方拥有的 Evidence/状态。

**完成标准**：每个 pass 有 Lead 可复查事实；candidate 未被误写为 Done 或父分支结果。

## 5. 修正与恢复

修正继续使用同一 Ticket 与 worktree，基于最后 source checkpoint 生成新 commit。基线或父分支漂移时由 Lead 暂停派单、重算影响并更新 Packet；契约冲突返回拥有该决定的工件。Lead 可以按当次风险在 Dispatch Packet 中定义停止条件，但 SpecDev 不推断全局修正次数；继续修正已无合理收益或需要上游决定时，返回 blocked、最后可信 checkpoint、失败命令和恢复条件。

**完成标准**：恢复不重新决定已锁定事项；每次候选都有唯一 checkpoint 和明确 owner。
