---
schema_version: 1
artifact: delivery
change: <YYYY-MM-DD-topic>
external_action: not-applicable
publish: null
updated_at: <ISO-8601>
---

# Delivery

## 来源完成回写
仅请求 reconcile 时核对 source 中的真实 GitHub Issue 并设置 pending-close。记录目标、确认原文、评论/关闭的 marker 与逐步回执。closed/waived 必须有实际远程重读或放弃授权依据。

## 发布投影
未请求时 publish 为 null；请求后为 <Path>{roots.state}/specdev/changes/{change}/publish.md</Path>，进度只从该账本读取。不在本文件复制 publish_action，不补造 source/triage。

## 恢复
已完成步骤、结果不明、错误、原 owner 和下一次对账动作；未请求的分支明确不适用。
