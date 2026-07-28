---
id: specdev/review-architecture
type: workflow-entry
workflow: specdev
name: 架构审查
description: 扫描代码仓寻找深层化机会——发现浅模块、接缝泄漏和局部性缺陷，以可视化 HTML 报告呈现候选方案，逐一访谈深化。
keywords: [架构审查, 深化, 模块设计, 接缝, 重构, 可视化]
---

# 架构审查

主动扫描代码仓发现架构摩擦，将其转化为可操作的深化方案——融合有机探索、可视化报告和访谈打磨。每一步引用内部子文件，不依赖外部 skill。

在开始之前，读取当前变更的上下文与架构决策：

- **CONTEXT.md** —— 项目领域术语与概念：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- **ADR.md** —— 架构决策记录：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`
- **永久 ADR** —— 已确认并提升的架构决策：`<Path>{roots.state}/specdev/adr/</Path>`
- **永久 CONTEXT** —— 已确认并提升的领域词汇表：`<Path>{roots.state}/specdev/context/</Path>`

如果当前 change 尚不存在或其下无 CONTEXT.md、ADR.md，静默继续——架构审查常是新变更的起点，change 的创建在步骤 4 用户选定候选后进行。

## 流程

### 1. 建立基准

读取 `<Path>{roots.workflows}/specdev/I-implement/codebase-design-glossary.md</Path>` 建立架构评估词汇——module、interface、depth、seam、adapter、leverage、locality 八个术语及其原则。读取 `<Path>{roots.workflows}/specdev/I-implement/deepening.md</Path>` 建立依赖分类（进程内/本地可替换/远程但自有/真正外部依赖）和接缝纪律基准。

**完成标准**：架构术语、删除测试、接缝纪律和依赖分类已加载；CONTEXT.md 领域术语和 ADR.md 已有决策已理解。

### 2. 探索摩擦

委托给 `<Path>{roots.workflows}/specdev/R-review-architecture/exploration-guide.md</Path>`。使用 Explore 子 Agent 有机遍历代码仓——不遵循僵化启发式，注意你在何处遇到摩擦：哪些模块是浅层的？哪些接缝存在泄漏？哪里缺乏局部性？哪些部分未经测试或难以测试？对每个可疑点应用删除测试。

探索中若发现候选方案与已有 ADR 矛盾，仅当摩擦足够真实、值得重新审视 ADR 时才标注——在报告中以警告框清晰标记。

**完成标准**：代码仓已遍历，每个摩擦点已记录涉及文件、摩擦类型和删除测试结果。

### 3. 生成可视化报告

委托给 `<Path>{roots.workflows}/specdev/R-review-architecture/html-report-template.md</Path>`。将探索发现渲染为自包含 HTML 文件，写入 OS 临时目录（`$TMPDIR` 或 `/tmp`），自动在浏览器中打开。每候选一张卡片：涉及文件、问题、方案、收益、before/after 图表、推荐强度（Strong / Worth exploring / Speculative）。报告结尾附最佳推荐。

此时不提出接口。报告打开后询问用户："你想探索其中哪一个？"

**完成标准**：HTML 报告已写入临时目录并已在浏览器中打开；用户已看到候选方案并做出选择。

### 4. 访谈深化循环

用户选择候选后，先绑定变更：按 `<Path>{roots.workflows}/specdev/INDEX.md</Path>` 启动协议复用当前活跃 change 或创建新 change（topic 取自候选名）；新建时参照 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>` 步骤 1 初始化 `.status.json` 与三文件。

随后委托 `<Path>{roots.workflows}/specdev/G-grill-with-docs/grilling-protocol.md</Path>` 执行一次一问访谈——沿设计树推进：约束、依赖、深化模块的形状、接缝背后的内容、存留的测试。

访谈中按 grilling-protocol 与 domain-modeling-rules 维护三文件（LOG → CONTEXT → ADR）。

如需探索替代接口，启动 `<Path>{roots.workflows}/specdev/I-implement/design-it-twice.md</Path>`。

用户以负载性理由拒绝候选时，提供 ADR 记录："要我将其记录为 ADR 吗？这样未来的架构审查不会重新建议它。"访谈共识达成后，移交 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` 执行实现。

**完成标准**：change 已绑定（复用或新建）；访谈共识已达成；LOG.md/CONTEXT.md/ADR.md 已同步；用户已确认进入实现或记录 ADR 排除候选。

---

## 子文件引用

| 文件 | 内容 | 触发条件 |
|------|------|---------|
| `<Path>{roots.workflows}/specdev/R-review-architecture/exploration-guide.md</Path>` | 摩擦信号清单、删除测试应用规则、接缝评估标准、ADR 冲突检测规则 | 步骤 2「探索摩擦」进入时加载 |
| `<Path>{roots.workflows}/specdev/R-review-architecture/html-report-template.md</Path>` | HTML 脚手架、6 种图表模式、样式指南、报告语言占位符 | 步骤 3「生成可视化报告」进入时加载 |

## 依赖关系

- 依赖 `<Path>{roots.workflows}/specdev/I-implement/codebase-design-glossary.md</Path>` 提供架构术语——步骤 1 加载
- 依赖 `<Path>{roots.workflows}/specdev/I-implement/deepening.md</Path>` 提供依赖分类和接缝纪律——步骤 1 加载
- 依赖 `<Path>{roots.workflows}/specdev/G-grill-with-docs/grilling-protocol.md</Path>` 执行访谈——步骤 4 委托
- 依赖 `<Path>{roots.workflows}/specdev/G-grill-with-docs/domain-modeling-rules.md</Path>` 维护三文件——步骤 4 委托
- 依赖 `<Path>{roots.workflows}/specdev/I-implement/design-it-twice.md</Path>` 探索替代接口——步骤 4 按需启动
- 依赖 `<Path>{roots.workflows}/specdev/I-implement/I-implement.md</Path>` 执行实现——步骤 4 共识后移交
