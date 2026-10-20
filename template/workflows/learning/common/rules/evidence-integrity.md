# Learning 工件引用与证据校验

本合同只约束工件的机器可验证部分，不替代教学、五题作业配方或 R 的内容判断。所有下述相对引用以其所属 Change 的当前 locator 为根，先由稳定 Change ID 解析位置；不存绝对路径、不跨越父目录、不跟随符号链接。

## 声明与 Lesson

- `course.md` 的 OBJ 表第一列声明唯一 `OBJ-*`；计划表里的未来 Lesson/Homework 可以尚未生成。
- `sources.md` 的来源表第一列声明唯一 `S-*` 或 `SRC-*`。引用必须指向已声明的 ID，来源正文仍需可回读的 URL、仓库提交/路径或页码。
- 已生成 Lesson 的 `objective_ids`、`source_ids` 必须可解析；`time_budget` 每段有非空 `segment`、正数 `minutes`，合计严格等于 30–40 的 `estimated_minutes`。
- `delivered_at` 记录实际交付该 Lesson 工件的 ISO 时间。它不证明学习者已阅读或掌握，也不能代替 R 的真实回答。不得使用未来时间。

## Homework 与不可改写提交

只接受一行字面量 `Submission: pending` 或 `Submission: ready`，不接受大小写、缩进或重复标记。用户将原行替换成 ready，H 不替用户提交。已存在的 Lesson/OBJ 引用必须解析；重答的 `previous_attempt` 指向同一作业上一 attempt 文件。

H 在追加任何字节前运行以下只读命令：

```bash
node <Path>{roots.workflows}/learning/common/tools/validate-learning.mjs</Path> --homework-digest <homework-file>
```

然后直接追加 `## Review`，其前不得补空行或更改已有换行；模板已有末尾换行。Review 内写 `Submitted content sha256: <输出的 submission_sha256>` 和 `Reviewed at: <实际 ISO 时间>`，再按原评审配方追加内容。校验器重新计算 Review 标题前的原始字节指纹；即使仅改一个答案字符也会失败。指纹用于检测提交后的修改，不宣称能阻止同时篡改原文与指纹的恶意作者。

Review 的机器可读骨架如下；每个实际 Q 都必须按原编号出现一次，题目数量仍由用户决定：

```markdown
## Review
Submitted content sha256: <已提交原文字节的 sha256>
Reviewed at: <实际 ISO 时间>
Immediate result: passed
Immediate rationale: <按本次 OBJ 与实际回答解释判断依据、缺口和不阻塞目标的细节>

### Review Q1
verdict: correct
<证据覆盖、中文详细讲解、Lesson/source anchor、误区与下一步>
Explain (English): <英文解释>
```

`Immediate result` 由 H 按学习目标判断，取 `passed` 或 `needs_review`；每题的 `verdict` 取 `correct`、`partial`、`incorrect` 或 `uncertain`。已评审只证明记录完整，不自动意味着通过。所有回答都 incorrect 或仍含 uncertain 时不能记录 passed；存在部分覆盖时由 H 说明它是否足以支撑本轮 OBJ，不引入按题数计算的固定分数或全对门槛。

`mastery.immediate=passed` 必须引用实际且明确 passed 的 Homework Review，并且没有未解决的 `blocking_misconceptions` 或 `homework.status=needs_revision`。失败的 Review 保持有效历史证据；修正当前投影，不重写用户回答或旧 Review。仅开始新的 pending attempt 不抹去既有通过证据。

## 真实 R 记录

使用 R 的 Review 模板。Lesson/OBJ/source IDs 必须存在；`previous_evidence` 指向覆盖同一 Lesson/OBJ 的旧 Lesson、已评审 Homework 或旧 R，`previous_at` 与该记录的真实时间完全相同。`due_at` 明确正时间间隔，不新增统一天数门槛。

未发生复习时保留 `retention: due`、`occurred_at: null`。通过必须有达到 due_at 的真实 occurred_at，以及新题、原始回答、逐项评审。禁止未来时间、自己的引用或来自其他 OBJ 的无关证据。

`mastery.evidence` 只存当前 Change 内真实文件引用（可带标题锚点）。H 的 immediate 不需要 R；retention passed / retention_verified 必须引用实际有效的 passed R 记录。

## C 综合与永久视图

C 使用 source-manifest 模板，逐 claim 保存来源 Change、工件/标题锚点、source ID 和 OBJ 范围。`unknowns`、evidence_status 与 mastery 分开；supported 不等于 mastered。

mastered / retention_verified 必须引用真实 passed R，并覆盖 claim 所列来源 Change 的对应 OBJ。综合材料搬入后仍通过 ID 解析当前 locator，不改写旧 Markdown。只有第二次发布确认后才写 topic 的 `provenance.json`，指向综合 Change 的 `synthesis/source-manifest.json`；永久视图以这份清单为证据来源。

完成本次所属 Work 后运行标准 `validate-learning.mjs --state-root`；失败时只修本 Work 有权修改的当前候选工件，不自动改写已有学习者答案、旧 Review 或原始来源。关闭/冷归档不新增作业或掌握前置条件。
