---
id: person/steelman-deliberation
type: workflow-entry
workflow: person
name: 双向钢人论证
description: 将尚未厘清的复杂问题经真实问题重述、正反双向钢人化与关键变量识别，在一次关键追问后推进为明确判断和可执行行动
keywords: [双向钢人, steelman, 决策, 反谄媚, 关键变量, 明确判断]
---

# 双向钢人论证

本 work 的主导词是**钢人化**。它不负责替用户把既有立场说得更顺耳，也不以“正反都说一点”制造表面平衡；它负责在结论形成前，把用户真正要解决的问题、支持当前倾向的最强可信论证、反对当前倾向的最强可信论证和决定结论的变量同时推进到可检验状态，再只关闭一个最高价值的不确定性，最后承担判断责任。

核心动作保持为：

1. 用最完整、最有力的方式，重述用户真正想解决的问题；
2. 使用钢人论证法，分别给出支持当前想法与反对它的最强论证；
3. 找出双方真正的分歧，以及最可能改变结论的关键变量；
4. 只问用户一个最关键的问题；等用户回答后，再给出明确判断、理由和下一步行动。

## 输入、权威与边界

### 必需输入

- 一个需要选择、判断、取舍、排序或制定策略的具体问题。

缺失可识别问题，或输入只是无需权衡的事实查询时，返回 `blocked-input`，说明缺少什么，不制造虚假争论。

### 可选输入

- 用户当前倾向、候选方案与反对意见；
- 时间窗口、预算、资源、风险和不可逆约束；
- 已知事实、项目材料、证据或外部来源；
- 用户已经明确的目标、价值排序和成功标准；
- 调用方显式提供的 `{change}`。

不存在的可选输入静默跳过；已经明确的信息不得重复询问。

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

## 流程

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

仅在没有有效 dossier 时读取 `<Path>{roots.workflows}/person/S-steelman-deliberation/deliberate.md</Path>`，按其顺序完成真实问题重述、证据分层、双向钢人、分歧与关键变量识别，并形成唯一关键问题。

若问题依赖会变化的公开事实、专业事实、冲突材料、代码/测试/配置，或属于医疗、法律、财务、安全等高风险领域，再读取 `<Path>{roots.workflows}/person/S-steelman-deliberation/evidence-gate.md</Path>`；可发现的事实先探索，不拿来问用户。

使用 `<Path>{roots.workflows}/person/S-steelman-deliberation/_templates/steelman-dossier-template.md</Path>` 在 change 目录下的唯一临时子目录中写入候选 dossier 与候选 `.status.json`，重读后运行：

```bash
node <Path>{roots.workflows}/person/S-steelman-deliberation/tools/validate-steelman-change.mjs</Path> \
  --phase awaiting-answer \
  --change-dir <Path>{roots.state}/person/changes/{change}</Path> \
  --dossier-file <Path>{roots.state}/person/changes/{change}/.steelman-stage/steelman-dossier.md</Path> \
  --status-file <Path>{roots.state}/person/changes/{change}/.steelman-stage/.status.json</Path>
```

临时目录名在并发时追加唯一后缀。校验通过后，先原子替换正式 dossier，再原子替换 change `.status.json`；workflow active 只在步骤 4 确认需要等待用户时更新。校验失败时删除临时目录并保持正式工件和旧状态不变。

**完成标准**：dossier 是回答前的冻结快照；正反最强可信论证、真正分歧、关键变量和唯一问题均存在；没有最终判断或行动建议；校验退出码为 0。

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

关键问题得到有效回答后，将回答原文写入 change `.status.json`，设置 `phase: judging`，再读取 `<Path>{roots.workflows}/person/S-steelman-deliberation/judge.md</Path>`。必须基于冻结 dossier 和用户回答裁决，不重做一份迎合回答的新钢人分析。

使用 `<Path>{roots.workflows}/person/S-steelman-deliberation/_templates/decision-template.md</Path>` 在唯一临时目录中写入候选 decision 与候选完成态 `.status.json`，随后运行：

```bash
node <Path>{roots.workflows}/person/S-steelman-deliberation/tools/validate-steelman-change.mjs</Path> \
  --phase completed \
  --change-dir <Path>{roots.state}/person/changes/{change}</Path> \
  --decision-file <Path>{roots.state}/person/changes/{change}/.steelman-stage/decision.md</Path> \
  --status-file <Path>{roots.state}/person/changes/{change}/.steelman-stage/.status.json</Path>
```

校验通过后才原子替换正式 decision 和 change 状态，并只从 workflow `status.json.active` 删除匹配当前 `change` 且属于本 work 的条目。校验失败时删除临时目录、返回 `validation-failed`，保留可恢复的 `judging` 状态。

**完成标准**：decision 给出明确判断、决定性理由、对最强反方的回应、具体行动、反转条件及置信度；状态与工件一致；校验退出码为 0。

## 状态合同

### Workflow 状态

`<Path>{roots.state}/person/status.json</Path>` 保持 `schema_version: 1`，本 work 只管理 `active` 数组中的如下条目：

```json
{
  "change": "2026-08-18-steelman-company-anniversary",
  "work_id": "person/steelman-deliberation",
  "phase": "awaiting-answer",
  "updated_at": "2026-08-18T00:00:00.000Z"
}
```

读取—合并—写入时保留未知顶层字段、未知 entry 字段和其他 work 的全部条目。写临时文件、重读 JSON、再原子替换。

### Change 状态

`<Path>{roots.state}/person/changes/{change}/.status.json</Path>` 至少包含：

```json
{
  "schema_version": 1,
  "artifact": "person-work-status",
  "workflow": "person",
  "change": "2026-08-18-steelman-company-anniversary",
  "work_id": "person/steelman-deliberation",
  "status": "active",
  "phase": "awaiting-answer",
  "key_question": "[唯一关键问题]",
  "key_question_asked": true,
  "question_disposition": "asked",
  "answer_received": false,
  "user_answer": null,
  "created_at": "2026-08-18T00:00:00.000Z",
  "updated_at": "2026-08-18T00:00:00.000Z",
  "completed_at": null,
  "blockers": []
}
```

允许转换：

```text
intake → deliberating → awaiting-answer → judging → completed
任一活动阶段 → blocked
awaiting-answer → reframe-required
```

`question_disposition` 只能是 `asked | already-answered`；前者要求 `key_question_asked: true`，后者要求 `key_question_asked: false`。工件先验证，change 状态后更新，workflow active 最后更新。状态只是工件的索引，不替代工件本身。

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

## 全局完成标准

- 用户真正要解决的问题与表层问法已区分；
- 当前倾向和最强反方都经过可信、可识别的钢人化；
- 没有编造证据、虚假平衡或因用户立场降低证据标准；
- 只关闭了一个最高价值的不确定性，且没有重复追问已知信息；
- 回答前 dossier 保持冻结，回答后 decision 可追溯到关键变量和用户回答；
- 最终答案不是任何人都能套用的通用建议，而是明确判断与可验证行动；
- owned 工件、change 状态与 workflow active 一致，验证证据已返回。
