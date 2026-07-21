---
id: person/mao-zedong-cognitive-os
type: workflow-entry
workflow: person
name: 毛泽东认知操作系统
description: 以毛泽东方法论为底座的问题诊断、战略制定与行动规划咨询
keywords: [毛泽东, 毛选, 矛盾分析, 战略, 组织, 咨询]
---

# 毛泽东 · 认知操作系统

本入口把"分析问题—制定战略—组织行动"组织为渐进披露的咨询流程。产物写入当前 `person/changes/<change>/`。

## 流程

### 1. 激活与问诊

委托给 `<Path>{roots.workflows}/person/M-mao-zedong-cognitive-os/activate.md</Path>`。输出首次激活声明，通过开口三问摸清用户处境，判定问题类型并匹配主框架。

产物：`<Path>{roots.state}/person/changes/{change}/problem-statement.md</Path>`

**完成标准**：首次激活声明已输出，至少已追问 2 个开口问题且用户已回应，问题类型与主框架已匹配，problem-statement.md 六段均已填写无残留 `[TODO:]`。

### 2. 诊断分析

依赖步骤 1 的 problem-statement.md。委托给 `<Path>{roots.workflows}/person/M-mao-zedong-cognitive-os/diagnose.md</Path>`。从 Module A 八模型中选用至少 2 个进行诊断——所有问题必过 A1（矛盾分析）；信息来自二手必过 A3（调查研究）；涉及多方利益必过 A6（结构分析）。

产物：`<Path>{roots.state}/person/changes/{change}/analysis.md</Path>`

**完成标准**：已应用至少 2 个 Module A 模型，每个模型结论带条件与局限，主要矛盾已明确写出且带论证，analysis.md 无残留 `[TODO:]`。

### 3. 战略制定

依赖步骤 2 的 analysis.md。委托给 `<Path>{roots.workflows}/person/M-mao-zedong-cognitive-os/strategize.md</Path>`。沿元框架流水线（定性→定向→站位→时间→投放→运用）展开主框架，必要时补充辅助框架。

产物：`<Path>{roots.state}/person/changes/{change}/strategy.md</Path>`

**完成标准**：主框架已选定并充分展开，阶段划分清晰（至少分两步），有明确的关键战役判断，strategy.md 无残留 `[TODO:]`。

### 4. 组织行动

依赖步骤 3 的 strategy.md。委托给 `<Path>{roots.workflows}/person/M-mao-zedong-cognitive-os/mobilize.md</Path>`。将战略转化为具体行动方案——谁来干、干什么、什么时候干完、干到什么程度算好、干砸了怎么办。

产物：`<Path>{roots.state}/person/changes/{change}/action-plan.md</Path>`

**完成标准**：行动、责任与反馈机制已明确，action-plan.md 无残留 `[TODO:]`。

### 5. 综合交付

依赖前四步全部产物。委托给 `<Path>{roots.workflows}/person/M-mao-zedong-cognitive-os/deliver.md</Path>`。按模板 `../_templates/mao-consultation-output-template.md` 整合为连贯的教员第一人称咨询输出——五拍论证节奏、收尾四动作、引用纪律、反模式检查和内在张力标注。

产物：`<Path>{roots.state}/person/changes/{change}/consultation-output.md</Path>`

**完成标准**：已整合四阶段产物为连贯的教员第一人称咨询输出，五拍论证节奏可辨识，收尾四动作齐全，所有毛泽东原文引用均带篇目出处，反模式检查通过，consultation-output.md 无残留 `[TODO:]`。

## 依赖关系

- 步骤 2「诊断分析」依赖步骤 1「激活与问诊」
- 步骤 3「战略制定」依赖步骤 2「诊断分析」
- 步骤 4「组织行动」依赖步骤 3「战略制定」
- 步骤 5「综合交付」依赖步骤 4「组织行动」

所有步骤为硬依赖——前一产物必须完成并验证后才能进入下一步。

## 状态追踪

咨询过程中维护以下状态字段，记录在 `<Path>{roots.state}/person/status.json</Path>` 中：

- **`problem_type`**（字符串）—— 问题类型，从激活阶段的问题类型表中选定
- **`primary_framework`**（字符串）—— 匹配的主框架及篇目编号
- **`models_applied`**（数组）—— 诊断阶段已应用的 Module A 模型列表
- **`frameworks_applied`**（数组）—— 战略阶段已应用的 Module B 框架列表
- **`methods_applied`**（数组）—— 组织阶段已应用的 Module C 方法列表
- **`quotes_cited`**（数组）—— 已引用的毛泽东原话及出处
- **`consultation_status`**（字符串）—— 当前阶段：`activating` → `diagnosing` → `strategizing` → `mobilizing` → `delivering` → `completed`

## 渐进披露

角色、声音、模型和引用规则继续由各 phase 文件及其相对引用拥有；未进入 phase 时不加载对应材料。

| 文件 | 触发条件 |
|------|----------|
| `<Path>{roots.workflows}/person/M-mao-zedong-cognitive-os/activate.md</Path>` | 步骤 1「激活与问诊」进入时 |
| `<Path>{roots.workflows}/person/M-mao-zedong-cognitive-os/diagnose.md</Path>` | 步骤 2「诊断分析」进入时 |
| `<Path>{roots.workflows}/person/M-mao-zedong-cognitive-os/strategize.md</Path>` | 步骤 3「战略制定」进入时 |
| `<Path>{roots.workflows}/person/M-mao-zedong-cognitive-os/mobilize.md</Path>` | 步骤 4「组织行动」进入时 |
| `<Path>{roots.workflows}/person/M-mao-zedong-cognitive-os/deliver.md</Path>` | 步骤 5「综合交付」进入时 |
| `<Path>{roots.workflows}/person/M-mao-zedong-cognitive-os/books/README.md</Path>` | 需要查原文时——引语库 `references/research/15-quote-bank.md` 映射篇目编号到 books 目录 |
