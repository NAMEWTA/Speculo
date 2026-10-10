# Tutor 问答课分支

仅 mode=tutor 时读取；共同启动、锁、稳定 Change ID 和授权由 Q 入口完成。此分支保留现有学习者提交协议，explore 不使用本分支。

## 出题与授课

1. 读取 `<Path>{roots.workflows}/learning/common/skills/socratic-questioning/SKILL.md</Path>`、`<Path>{roots.workflows}/learning/common/rules/questioning-policy.md</Path>` 与 `<Path>{roots.workflows}/learning/Q-question/inquiry-template.md</Path>`。选择用户教法或默认 socratic；用户指定正整数 n 则使用该值，否则 5，不套用 mine 十问上限。
2. 依共享深挖规则从相关遗漏、前一批回答或新证据选择问题，在题目旁给简短、不泄露目标答案的关注理由。每题关联问题地图 ID；地图只登记新问题，不迁移历史。创建 inquiry/IQ-<NNN>-<slug>-batch-NN.md：question_count=n、Q1…Qn、空 A1…An、精确行 Response: pending。不得把答案写入题目。
3. 学习者填写 A1…并写入精确行 Response: ready 后再次激活。校验并冻结原始元数据、Q/A。没有 ready 不追加 Teaching / Inquiry Lesson；不以模型自述或推测替代用户提交。
4. 只在同一文件末尾追加 ## Teaching 和 ## Inquiry Lesson。Teaching 逐题给思路复原、aligned|partial|off|uncertain、中文详解、Explain (English)、纠错路径、先前未覆盖知识及其重要原因、来源锚点和验证思路。Inquiry Lesson 将实际 n 题收成一节短课，留下基于新证据的下一批种子或可选补课/作业/复习入口。Response 更新为 closed。没有证据不能宣布用户掌握。
5. 更新 inquiry/INDEX.md、问题地图、learning-log.md 和 Change .status.json；works_run 追加 learning/question，清空 current_work。不写 mastered、lessons/ 或 homework/，不自动激活其他 Work。重答新建批次并链接旧文件；记录 revisit_reason，不改写旧批次。

## 当前批次验证

生成新批次后，以实际用户数量 n 运行：

```bash
node <Path>{roots.workflows}/learning/Q-question/tools/validate-inquiry.mjs</Path> --change-dir <当前Change绝对路径> --file <当前批次相对路径> --expected-count <n>
```

关闭前在当前 Change 内保留用户已提交的 Response: ready 原文快照，以候选 closed 文件和 --before <ready快照相对路径> 校验元数据及 Q/A 字节不变，再发布。快照是本批证据，不建立第二套状态树。失败不更新 Response 或状态；归档或合并的 Change 按稳定 ID 解析当前 locator，不硬编码 changes/ 位置。

新建地图使用 `<Path>{roots.workflows}/learning/Q-question/question-map-template.json</Path>`。批次结构验证并发布后，验证尚未发布的候选地图：

```bash
node <Path>{roots.workflows}/learning/Q-question/tools/validate-exploration.mjs</Path> --change-dir <当前Change绝对路径> --map <候选地图相对路径>
```

地图引用真实已发布 IQ，验证成功后发布地图再更新索引/日志/状态；失败保留有效 IQ 和候选地图，报告恢复路径，不提前推进状态。验证器只证明提供的原文字节/结构与路径，不认证回答作者、内容正确性或授课质量。

Teaching 不是作业评分 Review，不使用 Submission 或 verdict: correct|partial|incorrect。完整 30–40 分钟讲义仍归 L；真新手或高元素交互时使用降级探针或建议先补课，不强制硬答。
