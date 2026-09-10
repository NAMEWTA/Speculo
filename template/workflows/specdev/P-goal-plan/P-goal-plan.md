---
id: specdev/goal-plan
type: workflow-entry
workflow: specdev
name: Goal 规划与执行
description: 为一个或多个 Ready change 规划、执行或恢复 Goal；只在用户要求交付编排或已有 map 需推进时使用，不代替需求探索和 Ticket 编写。
keywords: [goal, 目标, plan, run, resume, replan, verify, Lead]
---

# Goal 规划与执行

> 激活后读取 `<Path>{roots.workflows}/specdev/README.md</Path>`。P 是统一 Goal 入口；G 仍是 Grill，跨 change 由本入口统一编排。

## 读取范围

先读 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`，定位用户指定的 change 或 map，再读状态、当前 map 和所选模式。只有进入 frontier 的 Ticket、命中的项目 Skill、Gate 与恢复证据需要展开；不默认通读所有 Ticket 或永久索引。

## 模式与权威

| 用户意图 | 模式 | 必须按需读取 |
|---|---|---|
| 制定目标计划，尚未授权实现 | `plan`（默认） | `<Path>{roots.workflows}/specdev/P-goal-plan/references/goal-lifecycle.md</Path>`；单 change 再读 `<Path>{roots.workflows}/specdev/P-goal-plan/references/single-change-plan.md</Path>`，多个 change 再读 `<Path>{roots.workflows}/specdev/P-goal-plan/references/multi-change-plan.md</Path>` |
| 明确要求按计划实施 | `run` | `<Path>{roots.workflows}/specdev/P-goal-plan/references/goal-lifecycle.md</Path>` 与 `<Path>{roots.workflows}/specdev/P-goal-plan/references/map-control.md</Path>` |
| 继续既有目标 | `resume` | 同上，先校验版本、owner、授权和未闭合事务，再恢复；不重复已完成副作用 |
| 上游变更使计划失效 | `replan` | `<Path>{roots.workflows}/specdev/P-goal-plan/references/replan-and-recovery.md</Path>` |
| 整体检查与关闭 | `verify` | `<Path>{roots.workflows}/specdev/P-goal-plan/completion-control.md</Path>` 与 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>` |

单 change 的 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 是用户总控入口；Ticket frontmatter 仍是单票状态、依赖、路径的权威，Goal Plan 拥有跨票 Gate、Wave 和授权引用。少量线性票不强制增加厚重计划。

多 change 复用现有父 Implementation Map/Implementation Plan 和组合 DAG，不迁走活动状态。父 `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>` 仅作无状态入口，模板为 `<Path>{roots.workflows}/specdev/P-goal-plan/references/goal-tickets-map-template.md</Path>`。父成员至少两个；只有一个 change 时使用单 change 模式。

## 执行底线

- 先冻结 Outcome、权威来源、用户指定的交付数量、范围、Definition of Done 和失败停止条件；按风险确定 DAG/Gate/Wave，不用文档长度替代质量。
- 固定 `lead-directed`。`implementation_agent_limit` 不超过现有 config 与宿主能力；只读审查没有新增数字上限。进入派单前读取 `<Path>{roots.workflows}/specdev/P-goal-plan/lead-orchestration.md</Path>`。
- 保留原 worktree 选择：未明确时询问，默认 current 严格串行；required 才使用独立 worktree 与 candidate-merge。用户已答过不重复问。默认工具、数量、提交与集成权限均不因入口合并改变。
- `plan` 只形成计划，缺少执行授权是计划中可见的待满足条件，不等于获准执行。运行前逐项核对真实授权；文档中的“已批准”不构成授权。
- 当前票必须调用所绑定的真实 Skill，不能以“读过入口”替代；先读取 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>`。缺失必需 Skill、引用或验收证据时阻塞本票及依赖它的分支。
- 他人 owner、资源或事务冲突仅暂停受影响的依赖闭包；继续独立已授权工作，不抢占、解锁或覆盖他人内容。正式记忆仍只走原网关。
- 调度调用 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>`；调度器不代替实现、审核或授权。长期运行指可恢复，不承诺后台或无限运行。

## 校验与交付

从 map 运行只读控制检查（它不执行代码或授予写权限）：

```bash
node <Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path> --map <map-path> --repo <project-root>
```

再按单 change 的 `--stage goal-plan` 或父 change 的 `--stage goal-plan` 运行 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>`。完成时回读真实源、map、Ticket 状态和 Evidence，报告完成/阻塞/失效票、整体验收、实际交付数量、验证命令、未执行项与恢复路径。票全 done 不等于 Goal 自动完成。
