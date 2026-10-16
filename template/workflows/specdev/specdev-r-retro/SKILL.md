---
name: specdev-r-retro
description: "复盘开发会话并积累有原文来源的独立 RETRO；明确要求时汇总未归档报告，先提出项目 Skill 升级方案，确认后更新或新增 Skill 并归档已处置报告。"
metadata:
  speculo-kind: work-skill
  speculo-id: specdev/retro
  speculo-domain: specdev
  speculo-contract-version: "2"
---

# 开发复盘与项目 Skill 迭代

先读 <Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path> 和 <Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>，再读 <Path>{roots.references}/writing-for-agents/writing-contract.md</Path>。本 Work 改善后续开发 Agent 的环境；默认只复盘，明确要求迭代才进入方案分支。代码讲解使用 L-learn，Speculo 产品反馈使用 retro Command。

## 流程

1. 识别用户要日常复盘，还是梳理/执行升级方案。日常复盘未指定会话时使用当前会话；批量梳理默认使用当前项目尚未归档的 RETRO。只有用户指定才扩大来源范围。
2. 日常复盘按 [开发复盘方法](references/development-retrospective.md) 定位一手记录、检查七类环境问题，并给每个发现保留原文、来源 change 或会话、根因或假设、影响、频率、owner 和正反验收。按严重程度呈现候选，允许没有发现。
3. 按 [报告模板](assets/retro-template.md) 和 [独立工件合同](references/records.md) 保存 <Path>{roots.state}/specdev/retro/{retro}/RETRO.md</Path>。`retro` 为首次创建时未占用的日期主题 ID；证据快照只保留相关原文。原子写后回读并运行独立校验；不创建 change，不修改来源 change 的 Outcome。
4. 明确要求集中迭代时读取 [升级流程](references/skill-upgrade.md)，固定未归档报告清单、去重并复核当前项目事实，形成 <Path>{roots.state}/specdev/retro/{upgrade}/PLAN.md</Path>。先交付完整具体方案；确认前仅保存方案及候选，不更新项目 Skill、不归档。
5. 用户确认方案后，用 <Path>{roots.references}/writing-for-agents/references/project-skill-maintenance.md</Path> 更新或新增获批项目 Skill，逐项验证并保存原方案的执行回执。只有全部计划内升级通过，才调用 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/retro-archive.md</Path> 归档方案指定且全部发现已处置的报告；仍有待处理项的报告留在现役目录。

## 改进必须能被证伪

逐项判断是规则缺失、规则未接入、规则判断错、测试不能失败或环境事实变化。建议说明真正修改位置、owner、正反验收、恢复影响和新增维护成本。机械问题进入检查工具，判断性规则进入 reviewer 的标准；Skill 承载可复用过程，不把每次失误都变成一条指令。成功经验也须有适用条件及重复使用价值。

## 结果与路由

报告 outcome 为 findings、no-findings、insufficient-evidence；报告完成不表示建议已实施。方案逐项 adopt / reject / defer，合并项通过共同目标与理由保留全部来源。事实不足时保持 defer，不用多数历史记录覆盖当前相反证据。

代码问题交 <Path>{roots.workflows}/specdev/specdev-d-diagnose-bugs/SKILL.md</Path>，代码/CI 检查实施交 <Path>{roots.workflows}/specdev/specdev-t-tickets/SKILL.md</Path>，远程反馈交 <Path>{roots.workflows}/specdev/specdev-t-triage/SKILL.md</Path>；ADR/context 写入交 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/SKILL.md</Path> 的原网关。这些动作不由 Skill 升级授权隐式覆盖。

## 完成标准

日常复盘的范围、原文来源、全部候选与未知可追溯，报告已保存并通过校验。升级方案确认前返回具体候选及未决项；确认后返回实际更新/新增/保留的 Skill、命令及退出码、未验证项、归档结果和恢复入口。未通过验证或存在漂移的分支保持阻塞，已落地结果据实保留；语法验证不认证宿主触发、用户授权或未来效果。
