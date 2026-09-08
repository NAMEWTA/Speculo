---
id: specdev/tickets
type: workflow-entry
workflow: specdev
name: 编写计划型 Tickets
description: 将已澄清的 Spec 或等价获批计划拆为可验收的实施 Ticket，并绑定真实项目 Skill；不用于探索未知需求或执行代码。
keywords: [ticket, Plan Mode, 垂直切片, Skill绑定, DAG]
---

# 编写计划型 Tickets

> 激活后读取 `<Path>{roots.workflows}/specdev/README.md</Path>`。

每张票都是供新上下文执行的 Plan：说明背景、来源、目标、非目标、真实项目 SKILL 调用、修改顺序、验证和失败停止点。Tickets Map 是统一启动与恢复入口，不是静态清单；它不复制 Ticket 的状态权威。

## 读取范围

先读 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`；按相关条目定位上游 Spec/ADR/CONTEXT、代码与项目 Agent 指令，再回读当前拆分所需原文。只枚举 Skill 的元数据与触发路由，不默认展开全部技能。

## 主流程

1. **输入与范围**：确认目标、非目标、用户指定数量、验收合同和未知项。高影响未决问题回到 G；无 Ready Spec 时，只有用户材料已等价覆盖全部合同才可规划。
2. **地形与绑定**：定位真实可维护源、调用方、测试接缝和 Skill 根。按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 为每票解析实际 Skill ID、入口摘要、调用阶段、输入、产出与失败动作；没有适用项目 Skill 时记录扫描证据，不造名称。
3. **垂直切片**：需要具体拆分时读取 `<Path>{roots.workflows}/specdev/T-tickets/references/planning-procedure.md</Path>` 与 `<Path>{roots.workflows}/specdev/T-tickets/decomposition-rules.md</Path>`。保留 Prefactor、Expand → Migrate → Contract 和真实 DAG，不按技术层制造空价值任务。
4. **写 Plan**：使用 `<Path>{roots.workflows}/specdev/T-tickets/ticket-template.md</Path>`。Lite 仅减少不适用说明，不删用户数量、权限、验收或停止条件。所有新增票使用 `plan_contract_version: 1`，旧票按迁移协议补齐后再执行。
5. **写总控**：使用 `<Path>{roots.workflows}/specdev/T-tickets/tickets-map-template.md</Path>`，记录共同背景、Skill 最低路由、合同覆盖、依赖和明确控制入口；状态仍从票投影。依赖、路径与语义共享资源都需检查。
6. **Definition of Ready**：读取 `<Path>{roots.workflows}/specdev/T-tickets/ticket-readiness.md</Path>`，并调用 `<Path>{roots.workflows}/specdev/common/skills/plan-quality-review/SKILL.md</Path>`。缺失引用、必需 Skill、可运行验收或权限边界，当前票不可 ready。
7. **与用户核对**：展示全部票、可观察产物、依赖、深度、风险、Skill 和未决问题。保留用户要求的交付数量；已授权自主规划且无关键未知时不重复请求形式确认。
8. **验证、回读和交付**：按下述命令检查，再回读真实 Ticket/Map，报告修改、验证结果和未完成项。规划完成不自动进入实现。

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --stage tickets --repo <project-root> <Path>{roots.state}/specdev/changes/{change}</Path>
node <Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path> --map <Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path> --repo <project-root>
```

需要正式 Goal、多 change、迁移或跨票 Gate 时交给 `<Path>{roots.workflows}/specdev/P-goal-plan/P-goal-plan.md</Path>`；少量线性票可从 map 按已授权范围调用 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>`。不得以“精简”为理由静默更换默认工具或少交付。
