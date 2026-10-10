# 课程合同

<!-- portable:lesson:start -->
## 完整课程合同

每份完整 Lesson 必须有 `lesson_id`、`objective_ids`、`estimated_minutes`（默认 35，标准范围 30–40）、可加总的 `time_budget`、`expression_level`、`coverage_depth` 和 `source_ids`。时间按阅读/视觉/示例/停顿/总结等活动估算，不按字符数承诺。章节顺序可以随主题变化，但每个核心目标都必须有动机与宏观图、通俗直觉、精确定义和英文术语、机制/因果链、至少一种视觉表示及其完整文字等价物、正例、反例或边界、迁移说明、误区、总结和来源。类比必须标出失效边界。

`expression_level=eli5|plain` 只控制词汇、句法、脚手架和类比比例；`coverage_depth=overview|standard|deep` 控制覆盖强度。Lesson 可放非评分的 pause/self-check，但不得生成 Q/A、答案、分数、verdict 或 mastered 字段。外部图片只是可选增强，必须有 alt、caption、source、访问日期和文字等价物，课程不能依赖链接可用性。

相关核心目标应加入容易遗漏的条件与现实检验：说明潜在盲区、遗漏原因、反例或失败机制、判断/处理原则与验证设计。以讲解案例完成，不插入学习者答题区，不把完整授课改成等待作答。过大分支放入可选后续，不挤掉基础解释或突破活动预算。
<!-- portable:lesson:end -->

学习者苏格拉底批次只允许出现在 `Q-question` 拥有的 `inquiry/` 内。`G-goal` 的 `audience=mine` probes 写入 `goal/probes/`，不是 Lesson Q/A，且不占用 30–40 分钟 Lesson 预算。每课最多 10 问（两批 5 槽）；满 10 后只拆课，不续问。

授课与挖掘读取 `<Path>{roots.workflows}/learning/common/rules/inquiry-depth-policy.md</Path>`；工程主题才读取 `<Path>{roots.workflows}/learning/common/rules/production-inquiry.md</Path>`。共同方法不改变上述预算与写集。
