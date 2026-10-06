---
id: person/steelman-deliberation
type: workflow-entry
workflow: person
name: 双向钢人论证
description: 将尚未厘清的复杂问题经真实问题重述、正反双向钢人化与关键变量识别，在一次关键追问后推进为明确判断和可执行行动
keywords: [双向钢人, steelman, 决策, 反谄媚, 关键变量, 明确判断]
---

# 双向钢人论证

重述用户真正的问题，分别形成支持与反对当前倾向的最强可信论证，找出分歧和关键变量，只关闭一个最高价值的不确定性，再给出明确判断与可验证行动。不以虚假平衡、迎合立场或通用建议替代判断。

激活时读取 `<Path>{roots.workflows}/person/INDEX.md</Path>` 与 `<Path>{roots.workflows}/person/common/rules/activation-and-memory.md</Path>`；Person 不使用不存在的 README。

## 输入与权威

必需一个需要选择、判断、排序或策略的具体问题；缺失或只是无需权衡的事实查询时返回 `blocked-input`，不制造争论。按已知情况采用用户倾向、候选/反对意见、时间/预算/资源、不可逆约束、事实来源、价值目标和调用方 change；缺失的可选内容静默跳过，已明确信息不重复问。

### 权威顺序

1. 用户明确陈述的目标、价值偏好和不可外部发现的约束；
2. 已验证的代码、测试、配置、schema、材料和当前外部事实；
3. `<Path>{roots.state}/person/changes/{change}/steelman-dossier.md</Path>` 中冻结的回答前分析；
4. 合理推断；
5. 未验证假设。

低优先级内容不得覆盖高优先级内容。用户的确信程度不是事实证据；模型表达得有说服力也不是事实证据。

### 职责边界

本 work 拥有：

- `<Path>{roots.state}/person/changes/{change}/steelman-dossier.md</Path>`；
- `<Path>{roots.state}/person/changes/{change}/decision.md</Path>`；
- `<Path>{roots.state}/person/changes/{change}/.status.json</Path>` 中 `work_id: person/steelman-deliberation` 的生命周期；
- `<Path>{roots.state}/person/status.json</Path>` 的 `active` 数组中属于本 work 的条目。

它不修改其他 person work 的产物或 active 条目，不把运行时状态写回 `{roots.workflows}/person/_state/`，也不提交、推送、发布、部署或执行不可逆操作。

## 按持久化阶段执行

新建、恢复或状态写入前读取 `<Path>{roots.workflows}/person/S-steelman-deliberation/references/state-and-publication.md</Path>`，遵守 v1 字段、候选校验、原子替换顺序和未知字段保留；不得覆盖其他 Work。

### 1. 解析 roots，选择或恢复 change

先读取 `<Path>{roots.state}/workspace.json</Path>` 解析公共 roots，再读取 `<Path>{roots.state}/person/status.json</Path>`。选择 change 的顺序固定为：

1. 调用方提供 `{change}`：验证名称不含路径穿越，使用该 change；
2. 未提供时，筛选 `active` 中 `work_id === "person/steelman-deliberation"` 的条目；
3. 只有一个候选：恢复它；
4. 多个候选：返回 `blocked-change-selection`，列出 change 名称，不自行猜测；
5. 没有候选：创建 `YYYY-MM-DD-steelman-<topic-slug>`；同名已存在时追加最小未占用的 `-01`、`-02`。

新建 change 时创建 `<Path>{roots.state}/person/changes/{change}/</Path>` 和 change `.status.json`。恢复时先读 `.status.json`、已有 dossier 和 decision，禁止重新询问或重写已经确认的内容。

**完成标准**：恰有一个合法 change 被选定；新建与恢复可区分；没有覆盖其他 change 或其他 work 的状态。

### 2. 判断当前阶段

根据 change `.status.json` 和权威工件恢复：

- 无 dossier：进入 `deliberating`；
- dossier 存在、`phase === "awaiting-answer"`：恢复 dossier，仅处理同一个关键问题；
- `phase === "judging"`：从冻结 dossier 和已记录用户回答继续裁决；
- decision 存在且验证通过：返回 `completed`，不重复生成；
- 状态与工件矛盾：返回 `validation-failed`，列出冲突路径，不推进状态。

**完成标准**：当前阶段由持久化证据决定，而不是根据对话印象猜测。

### 3. 回答前的双向钢人化

仅在无有效 dossier 时读取 `<Path>{roots.workflows}/person/S-steelman-deliberation/deliberate.md</Path>`，完整重述问题、分层证据、正反钢人、分歧与关键变量，形成唯一关键问题。变化事实、专业事实、冲突材料、代码或高风险领域还须读 `<Path>{roots.workflows}/person/S-steelman-deliberation/evidence-gate.md</Path>`；可发现的事实先探索，不拿来问用户。

按状态与发布合同的“回答前”分支创建、校验并发布 dossier；其中没有最终判断或行动建议，退出码必须为 0。该 dossier 随后冻结。

### 4. 只关闭一个最高价值的不确定性

若 dossier 中的关键问题尚未被回答：

1. 将 change phase 更新为 `awaiting-answer`；
2. 在 workflow `status.json.active` 中 upsert 本 work 的条目，保留未知字段和其他 work 条目；
3. 展示 dossier 的必要内容；
4. 原样提出 dossier 中的唯一关键问题；
5. 返回 `awaiting-user-answer`。

此阶段禁止给出方案排序、倾向性结论、最终建议或下一步行动。

若用户原始输入已经清楚回答了该问题，将问题和对应回答原文记录到 `.status.json`，设置 `key_question_asked: false` 与 `question_disposition: already-answered`，不重复追问，也不新增 workflow active 等待项，直接进入步骤 5。

恢复后若用户没有实质回答，原样重复同一个问题；不得提出第二个问题。若用户回答改变了原始问题、候选集合、决策目标或成功标准，返回 `reframe-required`，保留旧 dossier，并建议创建新 change；不得把新问题偷偷塞回冻结分析。

**完成标准**：最多向用户提出一个问题；该问题关闭一个可能改变结论的用户特异变量；回答与问题可从持久化状态恢复。

### 5. 明确裁决并形成行动

得到有效回答后原样保存，设置 `phase: judging`，再读取 `<Path>{roots.workflows}/person/S-steelman-deliberation/judge.md</Path>`。以冻结 dossier 和真实回答裁决，不重做迎合回答的新分析。

按状态与发布合同的“回答后”分支校验候选 decision 后才发布并关闭本 Work 的 active 条目；失败保留可恢复的 judging，不报完成。decision 必须包含明确判断、决定性理由、最强反方回应、具体行动、反转条件与置信度，且能追溯到关键变量和回答。

## 返回合同

每次返回都给出：

- `result`：`awaiting-user-answer | completed | blocked-input | blocked-change-selection | blocked-evidence | reframe-required | validation-failed`；
- `change`；
- 权威工件完整 `<Path>…</Path>` 路径；
- 已运行验证命令、退出码和关键结果；
- 尚未解决的高影响问题；
- `decision_type`（完成时）：`recommend | reject | conditional | defer-for-evidence`；
- 下一路由：等待回答时返回 `<Path>{roots.workflows}/person/S-steelman-deliberation/S-steelman-deliberation.md</Path>` 并携带同一 change；问题已重构时创建新 change；否则明确完成。

只有 `completed` 才能声明已经形成最终判断。`awaiting-user-answer` 的下一路由始终是带着同一 change 回到本入口。
