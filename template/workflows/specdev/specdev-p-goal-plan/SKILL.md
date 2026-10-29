---
name: specdev-p-goal-plan
description: "为简单目标、单个已拆票 change 或多个 change 规划、执行或恢复 Goal；只在用户要求目标计划、交付编排或已有 map 需推进时使用，不代替需求探索和 Ticket 编写。"
metadata:
  speculo-kind: work-skill
  speculo-id: specdev/goal-plan
  speculo-domain: specdev
  speculo-contract-version: "2"
---

# Goal 规划与执行

> 激活后读取 `<Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path>`。P 是统一 Goal 入口；G 仍是 Grill，跨 change 由本入口统一编排。

## 读取范围

先读 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`，定位用户指定的 change 或 map，再读 README Outcome、实际存在的计划和所选模式。有票时每次只展开实际选入执行批次的 eligible Ticket、直接依赖 Evidence、命中的项目 Skill、当前 Gate 与恢复证据；不默认通读所有 Ticket 或永久索引。

用户要求简单 Goal 且无需独立 Ticket 时，按 <Path>{roots.workflows}/specdev/specdev-p-goal-plan/assets/lightweight-goal-plan-template.md</Path> 的显式轻量形态，以原 goal-plan 清单负责进度与整体门，README 保留范围/AC/验证，README 只导航；不制造 Ticket/Map。需要持久依赖图、跨会话恢复、多写入 owner、共享资源协调或跨 Ticket/change 集成 Gate 时才切入完整模式并将迁出的清单改为导航；普通只读并行工具或无状态任务不触发升级。用户明确要求完整 Goal 时照办，Deep 风险仍需相应完整验收合同。

## 按意图选择模式与权威

轻量 Goal 的 plan/run/resume/verify 直接使用轻量模板规定的原 Tasks、整体验证和接续章节；replan 只调整实际受影响清单，并保留原授权和已完成证据。不得为通过下表完整模式的 map 控制而制造 Ticket/Map；复杂程度已超出轻量限制时先明确升级。下表及票级编排规则仅用于已有独立 Ticket 或跨 change 的完整模式。

| 用户意图 | 模式 | 必须按需读取 |
|---|---|---|
| 制定目标计划，尚未授权实现 | `plan`（默认） | `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/goal-lifecycle.md</Path>`；单 change 再读 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/single-change-plan.md</Path>`，多个 change 再读 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/multi-change-plan.md</Path>` |
| 明确要求按计划实施 | `run` | `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/goal-lifecycle.md</Path>` 与 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/map-control.md</Path>` |
| 继续既有目标 | `resume` | 同上，先校验版本、owner、授权和未闭合事务，再恢复；不重复已完成副作用 |
| 上游变更使计划失效 | `replan` | `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/replan-and-recovery.md</Path>` |
| 整体检查与关闭 | `verify` | `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/completion-control.md</Path>` 与 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>` |

有独立票的单 change 以 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 为用户总控入口；Ticket frontmatter 仍是单票状态、依赖、路径的权威，Goal Plan 拥有跨票 Gate、Wave 和授权引用。少量线性票不强制增加厚重计划。

单 change 的 Map 结构就绪、Goal 全局执行门与逐票 DoR 分开判断。等待上游真实产物的未来票可保持 draft，并记录缺口和重审条件；独立 Ready 票仍可进入 eligible。具体门禁读取 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/planning-modes.md</Path>`。

多 change 复用现有父 Implementation Map/Implementation Plan 和组合 DAG，不迁走活动状态。父 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 仅作无状态入口，模板为 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/goal-tickets-map-template.md</Path>`。父成员至少两个；只有一个 change 时使用单 change 模式。

## 执行底线

- 先冻结 Outcome、权威来源、用户指定的交付数量、范围、Definition of Done 和失败停止条件；按风险确定 DAG/Gate/Wave，不用文档长度替代质量。
- 固定 `lead-directed`，Lead 拥有状态和验收，不固定实现团队。票据切分、派遣通道与执行者分配分别决定，同一个 Agent 可连续执行多票；复用条件与逐票门遵循 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path>。ticket_execution 默认 auto；max_parallel_tickets 计量票据，显式 concurrent_implementation_limit 计量实现者；策略来源写 Execution Policy Source。派单读取 <Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/lead-orchestration.md</Path>。
- 保留 change 已选工作区，未指定复用 current；明确要求才创建一个 change worktree。串并行、派遣和审查不增建工作区，提交/合并按实际授权执行。
- `plan` 只形成计划，缺少执行授权是计划中可见的待满足条件，不等于获准执行。运行前逐项核对真实授权；文档中的“已批准”不构成授权。
- 当前票必须调用必需绑定的真实 Skill；普通可选 Skill 可按需发现并记录实际使用，不能以“读过入口”替代；先读取 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>`。缺失必需 Skill、引用或验收证据时阻塞本票及依赖它的分支。
- 他人 owner、资源或事务冲突仅暂停受影响的依赖闭包；继续独立已授权工作，不抢占、解锁或覆盖他人内容。正式记忆仍只走原网关。
- 调度调用 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；调度器不代替实现、审核或授权。长期运行指可恢复，不承诺后台或无限运行。

## 证据复用与停滞恢复

验证复用按 <Path>{roots.workflows}/specdev/common/rules/evidence-and-verification.md</Path> 核对代码、配置、输入、Skill、环境和原输出；只使受影响证据失效。升级兼容、迁移、用户可见行为或性能测量仅在风险相关时成为 Goal Gate，不增加普遍必跑流程。

保留原无进展停止：同一 blocker 没有新证据时不重复派发。新 Dispatch 必须说明输入、方法、范围、环境或责任处置的实质变化；换 Agent 或清空 attempts 不是变化。恢复仍核对原授权、owner、当前 Lead 身份 和未决副作用，不接管他人资源。

## 校验与交付

轻量 Goal 以 `--stage goal-plan` 验证显式 `artifact: lightweight-goal-plan`、原 README 规格和轻量章节；完成时逐项回读实际任务、README AC 证据与整体门，按 change-completion 决定 Outcome，不运行不存在的 map。完整模式从 map 运行只读控制检查（它不执行代码或授予写权限）：

```bash
node <Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path> --map <map-path> --repo <project-root>
```

再以 `--stage goal-plan` 运行 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>`：单 change 要求自己的 Goal Plan，合法 draft 可通过结构校验；存在任一父 Map、Plan 或父入口时校验完整父编排，残缺父工件不得回退单 change。校验通过不授予执行权限。完成时回读真实源、map、Ticket 状态和 Evidence，报告完成/阻塞/失效票、整体验收、实际交付数量、验证命令、未执行项与恢复路径。票全 done 不等于 Goal 自动完成。

## 编排与执行上下文

安排执行或审查前读取 <Path>{roots.workflows}/specdev/common/rules/coordination.md</Path>，绑定原 Goal/Map revision、依赖证据和写集。plan 只交付规划；已授权 run/resume 按合法 eligible 与实际资源约束持续执行，suggested_batch 只是建议，原 Lead 拥有正式状态、Evidence 与整体完成。

