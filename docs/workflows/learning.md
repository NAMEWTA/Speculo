# Learning：学习、问答、作业与知识整合

[手册首页](../README.md) · [领域目录](README.md) · [领域源入口](../../template/workflows/learning/SKILL.md)

Learning 把“讲过什么”和“你实际表现出什么”分开记录。完整课程、问答、作业、延迟复习是不同 Work，用户按需要选择，不会因为一节课结束就自动出作业、打分或归档。

## 选择学习方式

| 需求 | 入口 |
|---|---|
| 第一次建立学习偏好和记录 | [Init Setup](#init-setup) |
| 系统学习一个主题，需要课程地图 | [Assess and Plan](#assess-and-plan) |
| 想完整听懂一课 | [Lesson](#lesson) |
| 想先自己回答，再得到讲解 | [Question 的 tutor](#question) |
| 想让 AI 主动挖掘遗漏并深入解释 | [Question 的 explore](#question) |
| 学完后做正式作业与评审 | [Homework](#homework) |
| 隔一段时间验证是否仍会用 | [Review](#review) |
| 想系统学懂一个代码仓库 | [Goal](#goal) |
| 想把多个学习主题整理成有来源的知识 | [Consolidate](#consolidate) |
| 本轮结束，收起整棵学习记录 | [Archive](#archive) |

常见路线是 `Init → Assess → Lesson`，再按需选择 `Question / Homework / Review`。Question 也能直接以轻量主题开始，不必先编完整课程。

## 安装与材料位置

```bash
speculo init . --workflows learning --skill-targets agents --skills domain/learning
```

默认数据根为 `.agents/speculo/.speculo/learning/`。一个学习 change 通常包含 `course.md`、`background/`、`baseline.md`、`sources.md`、`lessons/`、`inquiry/`、`homework/`、`review/` 和索引，按实际需要形成。

学习材料移动或嵌入其他主题后，使用稳定 Change ID 和位置登记恢复，不凭旧路径猜位置。初始化遇到旧 v1 或未知 schema 会停止受影响写入，不能直接重置记录。

<a id="init-setup"></a>
## I · Init Setup：建立学习偏好

**业务 ID：** `learning/init-setup` · [源入口](../../template/workflows/learning/learning-i-init-setup/SKILL.md)

第一次使用或需要复核学习系统时，告诉 AI 你的语言、表达基础、希望的深度、图解偏好及学习安排。它建立或保留合法状态、位置登记、学习者档案与空索引，不编造课程或已掌握条目。

```text
使用 learning/init-setup。我的编程基础很少，希望中文通俗讲解，保留英文术语，
多用 ASCII 图和具体例子，既讲直觉也讲边界；请保留已有学习记录。
```

初始化完成只表示学习环境就绪。系统课程继续 Assess，直接提问用 Question。

<a id="assess-and-plan"></a>
## A · Assess and Plan：设计一门适合你的课程

**业务 ID：** `learning/assess-and-plan` · [源入口](../../template/workflows/learning/learning-a-assess-and-plan/SKILL.md)

用于学习目标明确、但需要决定课程范围和顺序的场景。准备目标、当前基础、时间和期望效果；缺少会改变课程设计的信息时，一次聚焦一个问题。

产物包括 `course.md` 中的可观察 OBJ（学习目标）、前置关系和 Lesson 地图，`background/foundation.md` 中的知识背景，保存原始基础回答的 `baseline.md`，以及可定位来源的 `sources.md`。课程地图可调整，不是强制固定教学法。

```text
使用 learning/assess-and-plan，为我规划“读懂 HTTP 缓存并能排查缓存失效”的课程。
我会基本 JavaScript，但不熟悉网络协议；先明确学习目标、前置知识和每课产物。
```

验收看每个 OBJ 是否有可观察表现，例如能解释一次条件请求，而非只有“理解缓存”。规划结束不自动生成讲义。

<a id="lesson"></a>
## L · Lesson：一次得到完整讲义

**业务 ID：** `learning/lesson` · [源入口](../../template/workflows/learning/learning-l-lesson/SKILL.md)

选择已有课程中的主题和 OBJ，要求期望深度。入口需要对应课程、背景、基线和来源；缺少时返回 Assess。

一课是约 30–40 分钟的完整活动预算，包含动机、直觉、精确定义、机制、图解或表格、正例、反例、变式迁移、误区和引用。通俗表达不会删掉边界和不确定性。讲义可以有非评分自检，但不混入正式作业、评分或 mastered。

预算的分段分钟数、合计、OBJ、真实来源和授课时间会由领域工具核对；记录自洽不等于工具已经证明教学效果。

```text
使用 learning/lesson，讲课程中的“ETag 与条件请求”。
以零基础表达完成一课，解释缓存命中与重新验证的差别，给出反例和迁移例子。
```

产物为 `lessons/L-<NNN>-<slug>.md` 与索引、日志。要练习再主动请求 Question 或 Homework。

<a id="question"></a>
## Q · Question：先答后讲，或主动深挖

**业务 ID：** `learning/question` · [源入口](../../template/workflows/learning/learning-q-question/SKILL.md)

这是两种不同的模式：

| 模式 | 谁先展开 | 适合什么情况 | 主要产物 |
|---|---|---|---|
| `tutor` | 你先回答，AI 后讲解 | 想暴露理解缺口、练推理 | `inquiry/IQ-*.md` |
| `explore` | AI 主动发现与解释 | 想挖出没想到的问题、深入机制 | `inquiry/explorations/EX-*.md`、问题地图 |

新任务默认 tutor；恢复时默认沿用当前工件模式。tutor 默认 5 题，明确要求正整数 n 就生成 n 题，不能拿 Goal miner 的十问上限限制你。没有现成 change 时可创建轻量 inquiry 主题，不假称完成了整门课程规划。

**tutor 的完整操作：**

```text
使用 learning/question，mode=tutor，围绕“取消请求与重试”先出 5 题。
让我先答，题目里不要提前泄露答案。
```

打开返回的 IQ 文件，在 A1、A2 等位置填写答案，把提交标记改为独立一行：

```text
Response: ready
```

然后告诉 AI：

```text
继续这个 IQ 文件的 tutor 分支，我已填写回答并标记 Response: ready。
请保留我的原文，在文件末尾追加逐题讲解和本批问题形成的短课。
```

未 ready 时不会追加 Teaching。讲解包括思路、中文解释、英文 Explain、误区、来源与下一步，最终变为 closed。重答另建批次，不改写旧答案。

**explore 的操作：**

```text
使用 learning/question，mode=explore，主动找出我在“取消请求与重试”上没想到的问题。
直接解释主要分支，给出证据、处理方式和验证思路，不模拟我的回答。
```

explore 不要求填写 A，也不使用 tutor 提交协议。已有待提交 IQ 需要探索时另建关联 EX，原 IQ 保留。问题地图的 resolved 只表示问题得到处置，不等于你已经掌握。

<a id="homework"></a>
## H · Homework：正式练习与逐题评审

**业务 ID：** `learning/homework` · [源入口](../../template/workflows/learning/learning-h-homework/SKILL.md)

指定已经学习的 Lesson/OBJ 和题数，默认 5 题。入口生成单一 Markdown 作业文件，题目后留空 A，初始标记 `Submission: pending`，不提前给答案。

```text
使用 learning/homework，针对刚学的 ETag 课程生成 5 道应用题。
请覆盖正常情况、边界和迁移场景，先留空答案。
```

填完同一文件后，将标记改为独立一行：

```text
Submission: ready
```

再请求评审该文件。AI 冻结原始 Q/A，只在末尾追加 `## Review`，逐题给 correct、partial、incorrect 或 uncertain，附中文解释和英文 Explain。

Review 保存原提交摘要、实际评审时间、`Immediate result: passed` 或 `needs_review`，并按 OBJ 说明依据。“已经评审”不自动等于“已经通过”；错误或未解决的记录仍保留为历史，有阻塞误区或需要修订时不能同时声明即时通过。工具不要求所有题全对，也不会因为新建 pending 作业而删除既有通过证据。

**注意：** Homework 用 `Submission`，Question tutor 用 `Response`，两者不要混用。重新作答创建新的 attempt 文件；一次答对是即时表现，不是长期掌握。

<a id="review"></a>
## R · Review：用真实时间间隔验证保持与迁移

**业务 ID：** `learning/review` · [源入口](../../template/workflows/learning/learning-r-review/SKILL.md)

在你主动要求且已经经过真实间隔后，用延迟回忆、机制/反例和新情境检查学习效果。指定 Lesson、Homework、change 或主题即可；没有真实间隔时只记录到期信息，不能伪造通过。

```text
使用 learning/review，复习上周的 HTTP 缓存课程。
请检验回忆、机制理解以及一个没有练过的迁移场景，保存真实回答和时间证据。
```

产物在 `review/`。通过可更新当前 change 的 retention 证据；永久主题知识是否标 mastered 仍由 Consolidate 的确认网关处理。失败保留历史并给补救范围，不删除过去表现，也不自动安排后台提醒。

<a id="goal"></a>
## G · Goal：为学懂代码仓库生成执行计划

**业务 ID：** `learning/goal` · [源入口](../../template/workflows/learning/learning-g-goal/SKILL.md)

适合“我要系统学懂这个项目的架构、主路径和核心模块”。准备真实仓库路径、包含/排除的模块、表达水平和深度。

本 Work 是计划编译器，本轮只交完整计划：`goal/goal-plan.md`、`chain.md`、`coverage-matrix.md`、`progress.md`，以及必要的课程地图。它不在同一规划会话里直接写课程、提问或挖掘。

```text
使用 learning/goal，为学习当前仓库生成 Goal-Plan。
范围是公共入口、核心状态流和错误处理，排除生成物与测试夹具；表达面向新手，保留技术深度。
```

读完计划后，在新的执行会话明确要求：

```text
按这份实际路径的 Goal-Plan 执行，先核对最小读取清单和当前进度。
遵守原计划的教学、挖掘、停止和验收合同。
```

宿主有 `/goal` 时可以使用计划给出的粘贴块；没有该命令，以上明确请求也可作为外部执行入口。计划文件里的“允许”不能自行变成授权。

执行按库存划分每单元最多 15 课，先完成本单元课程，再进行逐课 miner 深挖；每课最多十问的 miner 约束不属于学习者 tutor 题数限制。没有 team 时可按同一任务包串行执行，不能伪造子代理调用。

<a id="consolidate"></a>
## C · Consolidate：把多个学习主题整理成有来源的综合

**业务 ID：** `learning/consolidate` · [源入口](../../template/workflows/learning/learning-c-consolidate/SKILL.md)

当几个学习 change 指向同一主题，希望看见共同结论、冲突和缺口时使用。提供 domain/topic 和稳定 source Change IDs。

它先列 dry-run：目标父 change、移动清单、来源哈希、证据与 context 计划。获准后把原 change 整棵放进父目录的 `children/`，保留原始 Markdown 字节和各自 owner，再生成 `synthesis/` 中的来源清单、综述、claim 矩阵、概念图与版本。

迁移工具返回计划摘要，执行时核对同一摘要；在移动前保存事务清单，更新全部后代的定位信息。中断可按清单 resume 或 rollback；重复恢复会核对正确终态，外来锁、文件漂移或未知暂存内容会保留并停止受影响操作。具体调用见 [Workflow 合同、证据与恢复](../workflow-integrity.md)。

```text
使用 learning/consolidate，把我指定的 HTTP 缓存和 CDN 学习记录整合为“缓存系统”主题。
先展示来源、父子关系、移动和知识发布计划，保留所有原始答案与证据。
```

发布到永久 `context/` 还要真实确认；综合不能把“读过”升级为“掌握”。已归档来源先明确恢复，不能直接移动冷归档；后续课程仍写自己的子目录。

<a id="archive"></a>
## A · Archive：结束并收起学习记录

**业务 ID：** `learning/archive` · [源入口](../../template/workflows/learning/learning-a-archive/SKILL.md)

当本轮学习已经结束，即使还有没做完的作业或未掌握内容，也可以明确关闭后归档。提供根 Change，先确认没有活动 Work 或活动子树。

```text
使用 learning/archive，为这个已停止学习的根 Change 列出归档范围。
保留全部课程、原始答案、复习和综合记录，未掌握状态也原样保留。
```

确认后整棵移到 `archive/YYYY-MM/<root>`，月份取树中最新源更新时间，而非随意使用当前日期。移动后验证哈希和索引，归档原件只读。归档不是 mastered，也不负责知识综合。

## 一个新手学习循环

1. Init 记录表达和深度偏好。
2. Assess 定义“能排查一次缓存问题”这个可观察目标。
3. Lesson 讲一课，先读懂完整机制。
4. Question tutor 暴露误区，按 `Response: ready` 提交后讲解。
5. Homework 做应用题，按 `Submission: ready` 提交后评审。
6. 真实间隔后主动 Review；需要时 Consolidate，再按你的结束决定 Archive。

每一步都可停止。看过讲义、即时答对、延迟保持和永久知识发布是四个不同结论。
