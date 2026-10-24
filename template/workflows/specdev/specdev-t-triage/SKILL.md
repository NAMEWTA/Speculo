---
name: specdev-t-triage
description: "核验外部 Issue、PR 或请求，创建 change 保存分析、复现和实施简报，并按授权打标；通过评估后交现有 Spec、Tickets、Goal Plan，交付操作使用 Delivery。"
metadata:
  speculo-kind: work-skill
  speculo-id: specdev/triage
  speculo-domain: specdev
  speculo-contract-version: "2"
---

# 请求评估与分诊

激活后读取 <Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path> 和 <Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>。本地工件是开发权威；远程标签表示评估结果，不替代 Ready 或实施授权。

## 选择分支

| 模式 | 协议 | 产物与边界 |
|---|---|---|
| queue | <Path>{roots.workflows}/specdev/specdev-t-triage/references/queue-protocol.md</Path> | 只读候选，不创建 change |
| capture | <Path>{roots.workflows}/specdev/specdev-t-triage/references/capture-protocol.md</Path> | workspace <Path>{roots.state}/specdev/capture.md</Path>，保持 Issue open，不创建 change |
| intake | <Path>{roots.workflows}/specdev/specdev-t-triage/references/intake-protocol.md</Path> | 开始分析即创建/恢复 change，冻结 source，维护 <Path>{roots.state}/specdev/changes/{change}/triage.md</Path> |

capture 不创建也不选择 change；intake 才开始 change 分析。只读选中分支。远程读取和获批写入使用 <Path>{roots.workflows}/specdev/common/rules/github-operations.md</Path>；直接复用该协议不激活 Work。清晰本地需求可直接进入对应 Work。

## 分析与交接

1. 确定来源、项目和 change，按 intake 合同查重并冻结完整可持久化来源；读取命中的 ADR/context、代码、测试与既有评估。来源漂移生成后继快照，保留原件。
2. 判断请求是否成立、是否已有实现/重复/既往拒绝、是否符合项目方向、影响与可行性。Bug 保存实际复现和定位证据；需求说明现状、目标行为、约束和实现方向；PR 固定 base/head，验证已有 diff 并列剩余工作。
3. 按 <Path>{roots.workflows}/specdev/specdev-t-triage/references/issue-pr-policy.md</Path> 给出 disposition 和 verification。事实缺失保持 needs-info/needs-triage；维护者明确拒绝才 wontfix。“已经实现”与“拒绝”分开记录依据，不以重复请求自动取消 change。
4. 使用 <Path>{roots.workflows}/specdev/specdev-t-triage/assets/triage-template.md</Path> 在 <Path>{roots.state}/specdev/changes/{change}/triage.md</Path> 保存实施简报：范围、事实证据、建议、验收、风险和未决项。ready-for-agent 必须 verification=passed 且简报可执行，仍不等于 Ticket Ready 或 run 授权。
5. 标签通过 config.github.labels 映射，缺映射仅阻塞远程打标。准确动作获授权后执行并重读，将回执写 triage.remote_actions；本地分析不因远程失败丢失。
6. 有未决决定交 Grill，未知根因交 Diagnose，大范围交 Wayfinder，清晰范围交 Spec/Tickets；用户要求规划或派遣时再交 <Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path>。使用现有 Ready gate 和调度机制，不从标签直接开工。

## 完成与下一步

intake 使用 <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> 的 --stage triage；capture 仅账本存在时 --capture，不为校验创建账本。queue 返回覆盖范围、分页和未知项。

返回 source/triage 实际路径、判断、验证命令/退出码、打标结果及下一 Work。仅接受当前 triage 协议，不转换旧记录。完成回写、Ticket 投影、PR、CI、安全、发布和恢复统一交 <Path>{roots.workflows}/specdev/specdev-d-delivery/SKILL.md</Path>；T 不写 delivery/publish/PR 账本。
