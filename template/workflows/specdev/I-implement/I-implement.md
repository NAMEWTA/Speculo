---
id: specdev/implement
type: workflow-entry
workflow: specdev
name: 实现
description: 基于 spec 或 tickets 实现工作——以深层模块设计原则指导架构、以 TDD 红绿循环驱动编码、以双轴审查把关质量。
keywords: [实现, TDD, 代码审查, 模块设计, 重构]
---

# 实现

基于 spec 或 tickets 实现工作——融合设计检查、TDD、审查、提交的完整实现流程。每一步引用内部子文件，不依赖外部 skill。

在开始实现之前，读取当前变更的上下文与架构决策：

- **CONTEXT.md** —— 项目领域术语与概念：`<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`
- **ADR.md** —— 架构决策记录：`<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`

如果这些文件不存在，先运行 `<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>` 或询问用户以建立上下文。

## 流程

### 1. 设计检查

在编写任何代码之前，检查当前变更涉及的模块接口设计。使用 `<Path>{roots.workflows}/specdev/I-implement/codebase-design-glossary.md</Path>` 中的术语表评估：

- 要实现的代码属于哪些**模块**？
- 每个模块的**接口**是什么？（类型签名、不变量、顺序约束、错误模式）
- 接口的**深度**如何？调用者是否获得了足够的**杠杆效应**？
- **接缝**放在哪里？是否有至少两个适配器来证明接缝是真实的？
- 每个接缝处的依赖属于哪个类别？（进程内、本地可替换、远程但自有、真正的外部依赖——参见 `<Path>{roots.workflows}/specdev/I-implement/deepening.md</Path>`）

如果需要探索替代接口设计，启动 `<Path>{roots.workflows}/specdev/I-implement/design-it-twice.md</Path>` 流程。

**完成标准**：模块接口设计已检查——深度、接缝位置、适配器策略合理。每个接缝的依赖类别已分类。

### 2. TDD 循环

按照 `<Path>{roots.workflows}/specdev/I-implement/tdd-rules.md</Path>` 执行红→绿循环：

1. 确认每个接缝的测试策略（参见 `<Path>{roots.workflows}/specdev/I-implement/tdd-examples.md</Path>` 中的示例）
2. 在接缝处编写失败的测试——通过公共接口验证行为
3. 只写足以通过测试的代码
4. 每个循环一张垂直切片，响应上一个循环的反馈

循环重复直到所有 tickets 实现完成。如果审查后发现阻塞性问题（步骤 3），返回此步骤继续循环。

**完成标准**：红→绿循环完成——每个接缝一张垂直切片，测试通过公共接口验证行为。所有 tickets 实现完成。

### 3. 审查

按照 `<Path>{roots.workflows}/specdev/I-implement/code-review-process.md</Path>` 执行双轴审查：

- **标准轴** — 代码是否符合编码规范？是否出现 Fowler 代码异味？
- **规范轴** — 代码是否忠实地实现了 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` 中的要求？

如果审查发现阻塞性问题，返回步骤 2「TDD 循环」修复；否则进入提交。

**完成标准**：双轴审查完成——标准轴和规范轴均已通过，无阻塞性问题。

### 4. 提交

1. 运行类型检查：`npx tsc --noEmit`
2. 运行完整测试套件：`npx vitest run`
3. 将更改提交到当前分支：`git add -A && git commit -m "<描述性提交信息>"`
4. 更新 `<Path>{roots.state}/specdev/changes/{change}/</Path>` 下的状态文件

**完成标准**：代码已提交到当前分支，类型检查和测试通过，状态文件已更新。

---

## 子文件引用

以下子文件包含各步骤的详细规则、示例和参考材料，仅在对应步骤进入时加载：

| 文件 | 内容 | 触发条件 |
|------|------|---------|
| `<Path>{roots.workflows}/specdev/I-implement/codebase-design-glossary.md</Path>` | 深层模块设计的 8 个术语定义、原则、为可测试性设计 | 步骤 1「设计检查」进入时 |
| `<Path>{roots.workflows}/specdev/I-implement/deepening.md</Path>` | 依赖类别、接缝纪律、测试策略 | 设计检查中需要分析依赖时 |
| `<Path>{roots.workflows}/specdev/I-implement/design-it-twice.md</Path>` | 并行子 Agent 探索替代接口的三步流程 | 设计检查中需要探索替代方案时 |
| `<Path>{roots.workflows}/specdev/I-implement/tdd-rules.md</Path>` | 红→绿循环的完整规则、反模式、接缝测试策略 | 步骤 2「TDD 循环」进入时 |
| `<Path>{roots.workflows}/specdev/I-implement/tdd-examples.md</Path>` | 好的测试 vs 坏的测试、同义反复、Mock 指南、为可 Mock 性设计 | 编写具体测试时参考 |
| `<Path>{roots.workflows}/specdev/I-implement/code-review-process.md</Path>` | 双轴审查流程、12 个 Fowler 异味基线、子 Agent 提示词模板 | 步骤 3「审查」进入时 |

实现的产物（代码变更）直接写入仓库的源代码目录。变更追踪、spec 和 ADR 仍存放在 `<Path>{roots.state}/specdev/changes/{change}/</Path>` 下。
