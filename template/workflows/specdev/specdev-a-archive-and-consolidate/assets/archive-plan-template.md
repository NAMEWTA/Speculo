# 本次收尾

范围：<固定对象/主题、archive-single/archive-batch/knowledge-maintenance>
Owner 与依据：<实际会话/原计划 locator>
结论门：<completed/cancelled 的原工件及验证，或独立维护依据>
授权：<真实请求、具体目标/动作/范围、时间及原批准摘要>

## 资产计划

| 资产 | 源/目标 | 动作或无变更依据 | 内容 owner / 执行 owner | 批准与 before-image | 验证/恢复 |
|---|---|---|---|---|---|
| change | <稳定名称和实际位置> | <移动/保留> | <owner> | <依据> | <完成/取消、依赖与外部门> |
| ADR | <相关条目> | <新建/纠错/部分替代/完整替代/无变更> | <owner> | <依据> | <理由/负向保证/恢复义务承接> |
| context | <相关条目> | <维护或无变更> | <owner> | <依据> | <旧数据与兼容范围> |
| docs | <唯一负责文档> | <当前事实修正或无变更> | <owner> | <依据> | <实际命令/链接/未验证> |
| DESIGN（相关时） | <current/revision/candidate> | <网关动作/跳过> | <A/来源 owner> | <不可变批准及摘要> | <来源、原型、发布恢复> |

## 执行检查点

按 A0–A8 记录实际结果：固定范围 → 具体批准及原件 → 现役 docs/ADR/context → 适用 DESIGN → 引用和批准清理 → 最后无覆盖移动 → 目标消费者验证 → 原回执完成。每步填写真实命令/退出码、已落地路径、未完成项；不预填通过。

源：<Path>{roots.state}/specdev/changes/{change}/</Path>
目标：<Path>{roots.state}/specdev/changes/archive/{change}/</Path>
移动能力：<无覆盖、同文件系统、单写入者/隔离证据>

## 恢复与余项

<原 owner、原批准/输入摘要、before-image、实际唯一位置、下一核验步骤与不可自动回滚的结果。完成封存后只写外部补充，不改历史。>

## 实际归档时的结果段

confirmed 且进入移动分支后，按 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/archive-receipt-contract.md</Path> 在此原回执添加每个对象的唯一 anchor、批准引用和摘要、原/目标路径、真实 Result 与完整性清单。A7 的 moved 不代表封存，A8 的 verified 还须通过 archived --sealed。独立知识维护或 dry-run 不生成空移动结果段。
