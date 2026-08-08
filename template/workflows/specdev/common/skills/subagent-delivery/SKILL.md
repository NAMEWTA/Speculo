---
name: subagent-delivery
description: 交付合同：只为用户已选择委派的 Goal Plan 生成可恢复的原生或外部网页 Agent 派单，并在 Implement 阶段核对基线、候选交付、修正和 Lead 验收。
---

# SpecDev Subagent Delivery

本 Skill 管理一次 **Agent 交付合同**：规划时把 Ticket 压缩成可独立投递的派单块，执行时按同一合同恢复、核对并验收交付。它不拥有新的状态目录；Goal Plan、Ticket、Evidence 和 change 状态仍由调用 work 写入。

## 输入

- `operation`：`plan` 或 `execute`；
- `execution_model`：`native-subagent` 或 `external-web-subagent`；
- Lead、Ticket、Goal Plan、Spec、适用 ADR/CONTEXT、Wave/Gate 和依赖 Evidence；
- 项目写、只读和 shared 路径，验证矩阵与当前源码基线；
- provider、会话或 workspace locator、源码交付方式，以及用户当前明确授权。

普通 Goal Plan 和缺失 Goal Plan 的 Ticket 直接由 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` 执行，不调用本 Skill。委派输入缺失时返回调用方补齐，不猜测 checkpoint、权限或验收结果。

## 流程

### 1. 固定 Lead、模型与权限

一个交付链只有一个 Lead。Lead 保留需求解释、仓库保护、Wave/Gate、shared owner、权限控制、交付集成、独立验收和最终状态同步责任。

将本次请求解析为逐动作授权：local changes、commit、push、PR、merge、deploy、migration、production configuration、production feature 和 real user data。未明确授权的动作记为 `not-authorized`；项目指令、历史授权和 Agent 建议不扩大权限。

**完成标准**：`operation` 和 `execution_model` 唯一；Lead、授权动作、目标和条件均可判定。

### 2. 固定源码与恢复基线

记录不可变 `base_sha` 或等价本地基线、分支、`workspace_ref`、工作区状态和适用外部合同版本。GitHub 是源码事实来源时，加载 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/references/github-checkpoints.md</Path>`；需要固定附件、私有上下文或未提交改动时，再加载 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/references/source-package.md</Path>`。

`workspace_ref`、session locator 和附件 locator 必须可迁移，不写机器绝对路径、认证秘密或真实用户数据。

**完成标准**：每次派单、恢复、修正和验收都能定位到同一源码与合同版本。

### 3. 加载执行分支

- `native-subagent`：加载 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/references/native-subagent.md</Path>`，完成隔离派单、恢复和返回；
- `external-web-subagent`：加载 `<Path>{roots.workflows}/specdev/common/skills/subagent-delivery/references/external-web-subagent.md</Path>`，完成能力探测、会话恢复、候选交付与修正。

**完成标准**：只加载当前执行模型和实际源码交付方式需要的 reference。

### 4. 规划或执行交付合同

`operation=plan` 时，向调用方返回：里程碑级 Delivery Contract，以及每个 Ticket 的独立 Dispatch Packet。每个派单块必须包含目标、权威输入、边界优先级、路径合同、依赖证据、基线、验证与反向验证、授权、恢复 locator、最多修正轮次和返回字段。调用方将它写入 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`，不复制完整历史对话或 Ticket 全文。

`operation=execute` 时，先核对派单块与当前 Goal Plan、Ticket、基线和权限；再接收原生 Worker 或外部 provider 的候选交付，检查范围与事实声明，由 Lead 运行适用验证，并把结果写入 `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>`。外部声明、截图或模拟结果在 Lead 复核前保持 `unverified`。

**完成标准**：规划结果可独立投递；执行结果的每个 `pass` 都有 Lead 可复查证据。

### 5. 收敛、阻塞与恢复

同一验收项连续失败达到 Goal Plan 的 `max_correction_rounds` 后停止该 Ticket，记录最后基线、失败命令、最小错误、已通过行为、责任方和恢复条件。默认上限为 3；不得通过跳过测试、放宽断言、吞错、删除检查或越过路径合同制造完成。

恢复时读取 Goal Plan 的派单块、Ticket、最新 Evidence 和 change/worktree 状态，从最后已验证 checkpoint 继续，不重新决定已锁定事项。完成或阻塞后向调用方返回 Ticket 状态、Evidence 完整路径、workspace/session locator、checkpoint、commit/PR 引用、未验证项和待 Lead E2E。

**完成标准**：交付结束于 `review`、`done`、`blocked` 或 `deviated`；状态、Evidence、源码引用和恢复信息一致。
