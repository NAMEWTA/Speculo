---
name: specdev-d-delivery
description: "交付已完成开发结果：来源 Issue 完成回写、Ticket 投影、PR、CI/安全处理、发布预检、版本发布与恢复；保留逐目标回执，不代替 Triage 分析或本地实现完成判定。"
metadata:
  speculo-kind: work-skill
  speculo-id: specdev/delivery
  speculo-domain: specdev
  speculo-contract-version: "2"
---

# 开发交付

激活后读取 <Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path> 与 <Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>。只展开选中分支；publish 专指 Ticket→Issue，release 专指包/GitHub Release。

## 分支与 owner

| 模式 | 协议 | 权威产物 |
|---|---|---|
| reconcile | <Path>{roots.workflows}/specdev/specdev-d-delivery/references/reconcile-protocol.md</Path> | <Path>{roots.state}/specdev/changes/{change}/delivery.md</Path> 的 external_action |
| publish | <Path>{roots.workflows}/specdev/specdev-d-delivery/references/publish-protocol.md</Path> | <Path>{roots.state}/specdev/changes/{change}/publish.md</Path>，<Path>{roots.state}/specdev/changes/{change}/delivery.md</Path> 只指向账本 |
| pr-delivery | <Path>{roots.workflows}/specdev/specdev-d-delivery/references/pr-delivery-protocol.md</Path> | pull-requests/ 下的 PR 记录 |
| ci-security | <Path>{roots.workflows}/specdev/specdev-d-delivery/references/ci-security-protocol.md</Path> | 独立 DEL 操作记录 |
| release-preflight | <Path>{roots.workflows}/specdev/specdev-d-delivery/references/release-preflight.md</Path> | 预检与逐目标判定 |
| release | <Path>{roots.workflows}/specdev/specdev-d-delivery/references/release-protocol.md</Path> | 已授权发布及逐目标回执 |
| recover | <Path>{roots.workflows}/specdev/specdev-d-delivery/references/release-recovery.md</Path> | 指定原记录，不另建恢复账本 |

远程原语复用 <Path>{roots.workflows}/specdev/common/rules/github-operations.md</Path>。分支输入缺失、来源漂移或事务冲突仅阻塞受影响操作。

## 状态与执行

1. reconcile/publish 选择满足 <Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path> 的现有 change；PR 交付沿原 PR 合同。不得为本地结果发布补造 intake、source 或 triage。来源 Issue 的关闭仅在 reconcile 需要实际 source。
2. 首次请求 reconcile/publish 时按 <Path>{roots.workflows}/specdev/specdev-d-delivery/assets/delivery-template.md</Path> 原子创建 <Path>{roots.state}/specdev/changes/{change}/delivery.md</Path> 并重读；D 是唯一 writer。publish_action 的唯一权威是 <Path>{roots.state}/specdev/changes/{change}/publish.md</Path>，<Path>{roots.state}/specdev/changes/{change}/delivery.md</Path> 只保存 publish 路径，不复制状态。未请求交付不创建空记录。
3. CI/发布独立记录使用 <Path>{roots.state}/specdev/delivery-runs/DEL-###.md</Path>，首次具体操作选最小未用 ID，按 <Path>{roots.workflows}/specdev/specdev-d-delivery/assets/delivery-run-template.md</Path> 保存，不占用 change 状态。
4. 固定真实 base/head、目标、操作和已有授权。push、PR created/ready/merged、Issue closed、npm 与 GitHub Release 分别重读；queued/pending/skipped/环境失败不能写 passed。按需读取 <Path>{roots.workflows}/specdev/common/rules/test-reliability.md</Path>，只重跑失效或失败的检查。
5. 超时先沿原 marker/目标对账，部分成功恢复原账本，不重建。远程失败不重开已完成 Outcome。删除分支、merge、发布等副作用只执行已授权范围；有依赖时先核对，不假设宿主有 stack 扩展。

## 验证与返回

使用 <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>：reconcile/publish 为 --stage delivery，PR 为 --stage pr-delivery，独立操作为 --delivery-run。校验后回读本地工件及真实远程回执，返回实际结果、未完成项、命令/退出码和原恢复位置。

external_action 的 pending-close/close-failed、<Path>{roots.state}/specdev/changes/{change}/publish.md</Path> 中 pending/publish-failed、已请求未闭合 PR 都阻塞归档；未请求交付不挡门。独立 DEL 不自动阻塞 change 归档。完成后归档交 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/SKILL.md</Path>。仅接受新协议；旧 triage 交付字段与旧操作记录不读取、不转换。
