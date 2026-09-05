---
id: learning/lesson
type: workflow-entry
workflow: learning
name: 完整课程讲解
description: 一次输出 30–40 分钟、通俗但完整的 Lesson；不生成作业、不评分、不宣称掌握。
keywords: [lesson, 教学, eli5, 图文, explanation]
---

# 完整课程讲解

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`。

## 流程

1. 确认 Change 有 `course.md`、`background/foundation.md`、`baseline.md`、目标 OBJ 和 `sources.md`；缺失时返回 A-assess-and-plan。
2. 用户指定 Lesson 主题、OBJ、期望效果和深度；读取精确背景和来源，不遍历无关 context。
3. 生成一个完整的 `lessons/L-<NNN>-<slug>.md`，元数据包含 `lesson_id`、`objective_ids`、`estimated_minutes` 30–40、`time_budget`（各段可加总）、`expression_level`、`coverage_depth` 和 `source_ids`。
4. 每个核心目标至少覆盖动机/宏观地图、通俗直觉、精确定义与英文术语、机制/因果链、ASCII/表格/可选外链图之一及文字等价物、正例、反例或边界、变式迁移、常见误区、总结和引用。允许章节顺序变化，不套用固定 5E 或单一路线。
5. 可加入非评分 pause/self-check，但不写 Q/A、答案、verdict、分数或 mastered。更新 `lessons/INDEX.md` 与 `learning-log.md`，运行 validator，清空 current_work。

## 完成标准

- Lesson 的活动预算合计 30–40 分钟，内容覆盖矩阵完整，不能用字符数替代时间估计；
- ELI5 只降低表达门槛，不删去深度、边界、证据或不确定性；
- 外链图片有 alt/caption/source/访问日期和完整文字替代，链接失效不影响理解；
- 教学和作业严格分离，用户可稍后主动激活 H。

## 子文件

- Lesson 模板：`<Path>{roots.workflows}/learning/L-lesson/lesson-template.md</Path>`
- 教学规则：`<Path>{roots.workflows}/learning/common/rules/teaching-policy.md</Path>`
