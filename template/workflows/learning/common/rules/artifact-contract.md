# Learning 工件合同

## 权威与所有权

| 工件 | Owner | 权威内容 |
| --- | --- | --- |
| `intake.md` | A-assess | 学习对象、动机、范围和约束 |
| `baseline.md` | A-assess | 未教学前的已有能力证据 |
| `learning-plan.md` | A-assess | 目标、关键目标、前置知识、完成证据和深度 |
| `sources.md` | A-assess / E-eli5 | 来源、定位、可信度和已验证范围 |
| `lessons/` | E-eli5 | 教学解释、图解、类比及边界 |
| `practice/` | P-practice | 原始练习作答、提示层级和反馈 |
| `quiz/*-response.md` | 学习者 | 不经改写的原始答案 |
| `quiz/*-result.md` | Q-quiz / R-review | 按锁定 rubric 产生的评分和差距 |
| `promotion-plan.md` | A-archive | 待创建、合并、取代、索引更新和归档动作 |
| `context/` | A-archive；R 仅限复习状态 | 当前已掌握知识 |
| `archive/` | A-archive | 不可变学习历史 |

冲突时按实际事实、学习者原始作答、锁定目标/rubric、测验 result、promotion plan、永久知识、课程解释和索引摘要的顺序裁决。状态 JSON 只是投影，必须与上述工件一致。

## 不变量

- `baseline.md` 必须在首份 lesson 前形成；缺失时不能宣称教学适配了背景。
- 目标内容可以澄清但不能在看到测验结果后静默降低；实质变化创建修订记录并重新测验。
- AI 不得改写学习者答案后再评分。
- 未同时通过即时和保持门的内容只能留在 change，不能进入 context。
- 归档内容只读；纠正通过新 change 和 supersedes 关系完成。
