---
id: specdev/retro
type: workflow-entry
workflow: specdev
name: 开发复盘
description: 对指定开发活动、环境或协作流程的已观察摩擦做证据化复盘，形成根因、改进 owner 与可检验提案；代码讲解使用 L-learn-change，Speculo 产品反馈使用 retro 命令。
keywords: [retro, retrospective, 复盘, 环境, 反馈, 改进]
---

# 开发复盘

先读 <Path>{roots.workflows}/specdev/README.md</Path> 和 <Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>。本 Work 不自动修代码、提 Issue 或改永久知识。

## 流程

1. 固定本次会话/活动范围，按来源 ID 定位 change、测试、CI、交接和失败证据，不全读历史。缺失资料列 unknown；范围清楚且证据可定位才开始分析。
2. 未归档且尚未 completed 的当前 change 使用其 retro 目录。completed 或 archived 来源以及独立复盘建立非实现 review change，引用原 locator；不重开来源状态或改写归档。按 <Path>{roots.workflows}/specdev/common/rules/workflow-state-and-lifecycle.md</Path> 初始化/恢复；他项占用 current_work 时先 handoff。
3. 调用 <Path>{roots.skills}/retrospective/SKILL.md</Path>，检查约束是否缺失、已有检查是否失效或未接入；区分环境事实、机械检查和判断规则。每个发现有因果证据或明确假设，建议有 owner、正反验收与路由。
4. 按 <Path>{roots.workflows}/specdev/R-retro/retro-template.md</Path> 创建 <Path>{roots.state}/specdev/changes/{change}/retro/RETRO-###.md</Path>，选择最小未占用 ID。原子保存并重读，运行 SpecDev --stage retro；修订保留来源与被替代结论。
5. 验证通过后追加 works_run=specdev/retro 并清空 current_work；证据不足可完成一份 outcome=insufficient-evidence 的诚实报告，不冒充解决问题。只读复盘不创建 Spec/Ticket 或 implementation Evidence。review-only change 按专用完成门关闭。

## 结果与路由

合法 outcome：findings、no-findings、insufficient-evidence。发现的 disposition 为 file-issue / lesson-only / discard / duplicate；每项记录理由，允许没有发现。

代码问题交 <Path>{roots.workflows}/specdev/D-diagnose-bugs/D-diagnose-bugs.md</Path>，计划改进交 <Path>{roots.workflows}/specdev/T-tickets/T-tickets.md</Path>，远程反馈交 <Path>{roots.workflows}/specdev/T-triage/T-triage.md</Path>；永久知识交 <Path>{roots.workflows}/specdev/A-archive-and-consolidate/A-archive-and-consolidate.md</Path>。返回完整报告、已验证与未验证项、下一入口；不自动推进这些后续副作用。
