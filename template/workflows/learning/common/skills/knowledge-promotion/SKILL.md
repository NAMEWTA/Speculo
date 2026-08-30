---
name: knowledge-promotion
description: 在 Learning 内按掌握证据规划或应用 Markdown 知识提升，并为周期复习更新当前知识状态和分层索引。
---

# Knowledge Promotion

本 Skill 由 R-review 和 A-archive 调用，写入路径必须由调用方提供且位于 Learning context。默认 `plan-promotion` 只分析；任何 context 写入均需调用方获得用户对精确路径和动作的确认。

## 模式

- `plan-promotion`：读取 completed change 和现有索引，产生 create/merge/supersede/archive-only 计划。
- `apply-promotion`：只执行已确认且重新验证无 drift 的计划。
- `mark-review-state`：更新指定知识的 `mastered | review_due | needs_refresh`、最近验证、下次复习和 REVIEW 行。

## Plan Promotion

1. 验证即时/保持 result、关键目标、迁移、误区和 change 状态；任一门不满足返回 blocked。
2. 每个通过 OBJ 形成一个候选 Knowledge ID。读取总目录、目标领域 INDEX 和精确同 id 文件；不得以全文相似搜索代替 id/索引判断。
3. 无同 id 时 `create`；当前结论兼容时 `merge`；新证据推翻当前结论时 `supersede`；仅会话性内容 `archive-only`。
4. 计划必须列出所有叶子、领域 overview/INDEX、总 INDEX、REVIEW 和证据链接变化，并把完整候选 Markdown 写入调用方 change 的 `promotion-staging/`。重复 id、断链或来源冲突标记 needs-confirmation；staging 不等于 context 写入。

## Apply Promotion

1. 重读计划涉及的全部文件并核对 drift；目标意外出现、内容 hash 变化或证据状态变化即停止。
2. 在调用方 change 的 `promotion-rollback/` 为每个目标保存原 Markdown；原目标不存在时在 `rollback-manifest.md` 明确记录。快照完整前不写 context。
3. 知识文件按 `<Path>{roots.workflows}/learning/common/skills/knowledge-promotion/knowledge-template.md</Path>` 创建/合并；新领域同时使用 domain index 和 overview 模板。掌握证据指向即将形成的 archive 路径，只使用 `promotion-staging/` 中已确认的候选内容。
4. 自叶到根更新领域 INDEX、总 INDEX 和 REVIEW。表格按稳定 Knowledge ID 排序，同一 id 只有一行。
5. 重读所有链接并运行 Learning validator。任一失败按 manifest 逆序恢复：原文件覆盖回去，原本不存在的文件删除；恢复后再次验证。恢复成功前不得继续归档移动。

## Mark Review State

只修改调用方指定的知识文件和 REVIEW 行。失败标记 `needs_refresh`，通过更新 `mastered`、最近证据和下一日期；不删除或改写 archive，也不修改无关知识正文。

## 完成标准

- 没有 RAG、向量或隐式相似匹配；
- 每个动作由双门证据和一个 Knowledge ID 支持；
- 计划模式无写入，执行模式有明确确认和 drift 检查；
- 更新后从总 INDEX 可以通过真实链接到达每个当前知识文件。

## 模板引用

- 知识正文：`<Path>{roots.workflows}/learning/common/skills/knowledge-promotion/knowledge-template.md</Path>`
- 领域目录：`<Path>{roots.workflows}/learning/common/skills/knowledge-promotion/domain-index-template.md</Path>`
- 领域概览：`<Path>{roots.workflows}/learning/common/skills/knowledge-promotion/domain-overview-template.md</Path>`
