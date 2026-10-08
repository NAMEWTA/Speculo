---
id: specdev/triage
type: workflow-entry
workflow: specdev
name: 请求分诊与 GitHub 交付
description: 摄入与核验外部请求、投影本地完成事实、交付 PR，或按明确目标处理 CI、安全告警、npm/GitHub Release 预检、发布和恢复；清晰的本地需求直接进入对应 Work。
keywords: [triage, issue, PR, intake, reconcile, publish, capture, queue, release, npm, CI, security, recover]
---

# 请求分诊与 GitHub 交付

激活后读取 <Path>{roots.workflows}/specdev/README.md</Path> 与 <Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>。本地 Spec/Ticket/Map/Goal/Evidence 始终是开发权威，GitHub 不成为开发 tracker。

## 选择模式

只读取选中分支，publish 专指 Ticket→Issue，release 专指包/GitHub Release。

| 模式 | 协议 | owner 与结果 |
|---|---|---|
| queue | <Path>{roots.workflows}/specdev/T-triage/queue-protocol.md</Path> | 只读候选，不创建 change |
| intake | <Path>{roots.workflows}/specdev/T-triage/intake-protocol.md</Path> | 冻结 source/triage，验证与路由 |
| reconcile | <Path>{roots.workflows}/specdev/T-triage/reconcile-protocol.md</Path> | 来源 Issue 的 external_action |
| publish | <Path>{roots.workflows}/specdev/T-triage/publish-protocol.md</Path> | 已完成 Ticket 的 publish 账本 |
| capture | <Path>{roots.workflows}/specdev/T-triage/capture-protocol.md</Path> | workspace capture，保持 Issue open |
| pr-delivery | <Path>{roots.workflows}/specdev/T-triage/pr-delivery-protocol.md</Path> | change 的 PR 记录 |
| ci-security | <Path>{roots.workflows}/specdev/T-triage/ci-security-protocol.md</Path> | 独立 TRI 操作记录 |
| release-preflight | <Path>{roots.workflows}/specdev/T-triage/release-preflight.md</Path> | 只读预检与 TRI 记录 |
| release | <Path>{roots.workflows}/specdev/T-triage/release-protocol.md</Path> | 已授权发布及逐目标回执 |
| recover | <Path>{roots.workflows}/specdev/T-triage/release-recovery.md</Path> | 恢复指定原记录 |

远程原语统一见 <Path>{roots.workflows}/specdev/T-triage/remote-operations.md</Path>。其他调用方可直接复用该协议，不激活 T，也不初始化 SpecDev。

## 定位与状态

从 workspace 解析 roots。intake 可创建/恢复 change；reconcile/publish 只选择满足 <Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path> 的现有 change。多个候选先消歧；冻结来源不覆盖。

capture 不创建也不选择 change，不写 current_work，只使用 <Path>{roots.state}/specdev/capture.md</Path>。queue 只返回候选。CI/发布独立记录写入 <Path>{roots.state}/specdev/triage-runs/TRI-###.md</Path>；T 在首次具体操作时选最小未用 ID，按 <Path>{roots.workflows}/specdev/T-triage/triage-run-template.md</Path> 原子写入并重读，不占用 change 状态。recover 使用原账本 owner。

尚未完成 change 的 intake 在 current_work 为空时登记 specdev/triage，他项占用先恢复或 handoff；成功去重追加 works_run 并清空 current_work，可恢复失败保留。已完成 change 的 reconcile/publish 和 PR 交付只更新各自账本，不占用 current_work，不重开实现状态。PR 不能修改来源关闭、Ticket publish 或 capture 状态。远程失败不能把已完成代码状态改回未完成。

## 验证与返回

使用 <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>：

- intake/reconcile/publish：--stage triage，输入当前 change。
- pr-delivery：--stage pr-delivery，输入当前 change。
- capture：仅账本存在时 --capture，不为验证创建账本。
- 独立 TRI：--triage-run，输入原记录。
- queue：报告检索范围、分页、未知项，不制造完成证据。

回读真实工件、账本和远程回执，返回结果、未完成项、验证命令及完整恢复位置。external_action 的 closed/waived/not-applicable 与 publish_action 的 not-requested/published/waived 各自满足归档门；pending/failed 恢复原模式。PR 仅 requested=true 的未闭合交付挡门，独立发布不自动挡 change 归档。归档交 <Path>{roots.workflows}/specdev/A-archive-and-consolidate/A-archive-and-consolidate.md</Path>。
