# 运行模板

这是模板，不是已保存的用户课程。尖括号内容需要用真实输入或明确未确认项替换；不能照抄时间、来源或学生答案。

## 原始输入 source.md

```markdown
# 原始输入
## INPUT-001 | <实际时间>
来源：<用户消息/附件定位>
原文：<保留请求、目标、基础、限制与真实材料>

## INPUT-002 | <实际时间>
<后续输入只追加，不改写先前原文>
```

## baseline 与 outline

baseline.md写：已确认基础及原文定位、已确认偏好、教学假设、缺失但不阻塞的信息、真正阻塞项及原因。不能将模型猜测变成已知用户背景。

course-outline.md写：本课范围、O-001式目标、最小先修、目标与章节对应、暂缓分支及原因。没有课程全图时可以先给最小提纲，不宣称完成全面评估。

## Lesson

```yaml
lesson_id: LESSON-001-topic
objective_ids: [O-001]
estimated_minutes: 35
time_budget:
  - {activity: 定位与地图, minutes: 3}
  - {activity: 情境与直觉, minutes: 5}
  - {activity: 定义与机制, minutes: 10}
  - {activity: 图示与示例, minutes: 8}
  - {activity: 边界与盲区, minutes: 5}
  - {activity: 迁移与总结, minutes: 4}
expression_level: eli5
coverage_depth: standard
source_ids: [SRC-001]
```

将元数据放入---围成的frontmatter，正文按[Lesson合同](../SKILL.md#lesson)及第3、4、9节自然展开，逐目标讲解、解释重要遗漏并检查交付。不设置学生Q/A或提交区。

## Tutor

```yaml
inquiry_id: IQ-001-topic
batch: 1
lesson_unit_id: null
objective_ids: [O-001]
question_count: 1
teaching_method: socratic
expression_level: eli5
coverage_depth: standard
source_ids: [SRC-001]
created_at: '<含时区的真实ISO时间>'
```

```markdown
## Questions
### Q1
objective_id: O-001
bloom_level: understand
socratic_move: mechanism
expected_evidence: <应提供的理由、推导或例子类型，不泄露答案>
difficulty: introductory
<具体问题和关注理由>

## Learner Answers
### A1

Response: pending
```

这里是一题模板，默认使用仍应生成5题；用户指定n时按n生成。真实提交后先保存ready快照，再按SKILL.md追加Teaching和Inquiry Lesson；只改变协议状态，不润色原Q/A。没有快照不能通过关闭候选的自动字节门禁。

原文冻结示例：[pending](../examples/tutor-pending.md)→[ready](../examples/tutor-ready.md)→[closed](../examples/tutor-closed.md)，是同一虚构答卷的三个快照，不是真实提交。SRC-001指[分数解释](../examples/explain-fractions.md)中的通分推导。

## Explore

```yaml
exploration_id: EX-001-topic
mode: explore
status: active
question_ids: [P-001]
focus_ids: [P-001]
```

正文顺序为Scope、Discovery、Deep Dive、Verification、Next二级英文标题。重要发现有类型、触发证据/父问题、遗漏原因、影响和核验。关闭前对照问题地图检查focus归属及终态。没有学习者答案区。

## 来源 sources.md

按[证据与来源](../SKILL.md#6-证据与来源)记录每条来源，类型区分用户材料/来源/推断/假设/待验证。模型一般知识未核验时应明确，不编造参考书或论文。

## LOG 与 catalog

LOG.md只追加实际决定、模式切换、证据缺口、已执行检查、未验证项、写入失败落点和恢复条件。catalog.md列实际工件及模式/记录状态，不计算“掌握率”。关闭后纠错另建修订并链接旧文，不抹掉历史。
