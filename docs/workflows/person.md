# Person：复杂问题分析与行动决策

[手册首页](../README.md) · [领域目录](README.md) · [领域源入口](../../template/workflows/person/SKILL.md)

Person 适合需要权衡、诊断或战略规划的问题。它帮助你形成判断与行动方案，产物保存在当前 person change；咨询结果不会自动变成代码修改、资金操作、发布或部署授权。

```bash
speculo init . --workflows person --skill-targets agents --skills domain/person
```

## 先选哪一种方法

| 你的需要 | Work | 工作方式 |
|---|---|---|
| 两个方案之间难以取舍，希望认真对待双方理由 | [Steelman Deliberation](#steelman-deliberation) | 双向最强论证 → 一个关键问题 → 判断与行动 |
| 希望按特定方法论系统分析问题、制定战略和组织行动 | [Mao Zedong Cognitive OS](#mao-zedong-cognitive-os) | 问诊 → 诊断 → 战略 → 行动 → 综合交付 |

提供真实问题、已知事实、目标、时间、资源和不可逆约束。只需要查一个简单事实时，无需使用决策框架制造争论。

<a id="steelman-deliberation"></a>
## S · Steelman Deliberation：双向钢人论证

**业务 ID：** `person/steelman-deliberation` · [源入口](../../template/workflows/person/person-s-steelman-deliberation/SKILL.md)

“钢人化”是把一种观点按它最有力、最可信的形式表达，再检验它；不是随便找一个弱反对意见，也不要求两边结论各占一半。

**什么时候用：** 是否重写系统、选择职业方向、确定项目优先级等有真实取舍的问题。**准备什么：** 具体问题、候选、自己的倾向及理由、限制和可用证据。

```text
使用 person/steelman-deliberation，帮我判断这个内部工具应该继续小步修补，还是整体重写。
我倾向重写，但团队只有两人、三个月要交付。请先核查已给材料，分别形成双方最强论证。
```

执行分两次关键产物：

1. **回答前 dossier**：重述真正的问题，区分事实/推断/假设，写出双方论证、分歧和最高价值的关键变量，保存 `steelman-dossier.md`。
2. **关键问题**：最多向你提出一个问题。尚未回答时停在 awaiting-user-answer，不提前给倾向或行动。如果原请求已清楚回答了它，则记录已有答案，不重复问。
3. **回答后 decision**：依据冻结分析和真实回答形成 `decision.md`，包含明确判断、决定性理由、最强反方回应、具体行动、反转条件与置信度。

**如何继续：** 提供同一 change 和对那个问题的真实回答即可。若回答改变了原问题、候选或成功标准，需要重新界定问题，旧 dossier 保留，不能迎合新答案偷偷重写旧分析。

**完成怎么看：** result 是 completed，decision 能追溯到证据与关键变量。也可能合理地建议拒绝、附条件执行或先补证据；“明确判断”不等于必须选一个激进行动。

<a id="mao-zedong-cognitive-os"></a>
## M · Mao Zedong Cognitive OS：按特定方法论展开咨询

**业务 ID：** `person/mao-zedong-cognitive-os` · [源入口](../../template/workflows/person/person-m-mao-zedong-cognitive-os/SKILL.md)

**什么时候用：** 你明确希望使用这套方法，围绕问题诊断、战略制定与行动组织得到完整咨询。它使用特定叙述声音和有出处的原文；判断仍需要真实情境与条件，不靠引用替代证据。

```text
使用 person/mao-zedong-cognitive-os，分析一个小团队长期任务分散、核心目标推进缓慢的问题。
请从实际约束与关系开始问诊，再形成可检验的战略和行动计划。
```

五个阶段有明确前置关系：

| 阶段 | 你参与什么 | 产物 |
|---|---|---|
| 激活与问诊 | 回答实际问题和约束；至少有两项问诊追问与回应 | `problem-statement.md` |
| 诊断分析 | 核对事实与主要矛盾 | `analysis.md` |
| 战略制定 | 核对方向、位置、时机和资源安排 | `strategy.md` |
| 组织行动 | 明确责任人、期限、完成条件和失败处置 | `action-plan.md` |
| 综合交付 | 检查完整论证、内在张力与行动反馈 | `consultation-output.md` |

前一阶段证据不足就保留在该阶段，不用一份漂亮的最终报告掩盖缺口。引用需要真实篇目来源，没有依据则停止该引用。咨询完成表示方案与证据齐备，不表示方案已经在现实中执行或验证。

## 暂停与恢复

两个 Work 都有自己的产物与状态。恢复时给出实际 change 或文件位置，让 AI 回读当前阶段；不要把 Steelman 的 waiting-answer 记录当成另一套咨询的输入状态。Person 当前没有通用归档 Work，不能用跨领域归档命令随意移动数据。

若只想在网页 AI 中进行双向论证，可使用 [Person Canonical](../canonical.md)。
