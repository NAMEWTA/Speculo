---
id: learning/review
type: workflow-entry
workflow: learning
name: 延迟保持与周期复习
description: 在真实时间间隔后验证回忆和迁移，决定新知识能否掌握或已归档知识是否需要刷新。
keywords: [复习, retention, spaced-review, transfer, review-due]
---

# 延迟保持与周期复习

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`，再执行本入口。

R 有两个模式：`retention-gate` 处理 awaiting_retention change；`periodic-review` 从 REVIEW 选择已归档知识并创建新的 review change。时间未到时只报告日期，不伪造完成。

## 流程

1. 确定模式。多个到期项或 active change 时请求消歧；周期复习必须创建新 change，不能改写 archive。
2. 读取 mastery policy、原 learning plan 或知识文件中的掌握目标与证据。保持测验不得简单复用即时题或刚看过的课程示例。
3. 创建 `quiz/retention-NN-questions.md`，等待并保存原始 response，再按 assessment policy 写 result；顺序和评分合同与 Q 相同。
4. 失败或 needs_review：保持 change active，写补救范围并路由 E/P。周期复习失败时调用 knowledge-promotion 的 `mark-review-state`，经用户确认把相应知识标记 `needs_refresh` 并更新 REVIEW；archive 保持不变。
5. 首次保持门通过：设置 retention=`passed`、phase=`ready_to_archive`、change_status=`completed` 和 `completed_at`；记录即时与保持 result 路径，路由 A-archive。
6. 周期复习通过：result 成为新证据；调用 `mark-review-state` 更新最近验证和下一复习日期。完成 review change 后仍通过 A-archive 归档本次复习历史。

## 完成标准

- 保持证据发生在真实间隔后，并含新的迁移情境；
- 双门未通过时不会设置 completed；
- 失败只改变当前知识状态，不删除历史证据；
- 所有 context 改写有明确确认、精确路径和重读验证。

## 子文件引用

- 复习模板：`<Path>{roots.workflows}/learning/R-review/review-template.md</Path>`
- 知识更新过程：`<Path>{roots.workflows}/learning/common/skills/knowledge-promotion/SKILL.md</Path>`
