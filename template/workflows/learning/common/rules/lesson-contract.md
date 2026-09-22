# 课程合同

`L-lesson` 的每份 Lesson 必须有 `lesson_id`、`objective_ids`、`estimated_minutes`（默认 35，标准范围 30–40）、可加总的 `time_budget`、`expression_level`、`coverage_depth` 和 `source_ids`。时间按阅读/视觉/示例/停顿/总结等活动估算，不按字符数承诺。章节顺序可以随主题变化，但每个核心目标都必须有动机与宏观图、通俗直觉、精确定义和英文术语、机制/因果链、至少一种视觉表示及其完整文字等价物、正例、反例或边界、迁移说明、误区、总结和来源。类比必须标出失效边界。

`expression_level=eli5|plain` 只控制词汇、句法、脚手架和类比比例；`coverage_depth=overview|standard|deep` 控制覆盖强度。Lesson 可放非评分的 pause/self-check，但不得生成 Q/A、答案、分数、verdict 或 mastered 字段。外部图片只是可选增强，必须有 alt、caption、source、访问日期和文字等价物，课程不能依赖链接可用性。

学习者苏格拉底批次只允许出现在 `Q-question` 拥有的 `inquiry/` 内。`G-goal` 的 `audience=mine` probes 写入 `goal/probes/`，不是 Lesson Q/A，且不占用 30–40 分钟 Lesson 预算。每课最多 10 问（两批 5 槽）；满 10 后只拆课，不续问。
