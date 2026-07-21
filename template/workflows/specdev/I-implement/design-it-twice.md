# 设计两次

当用户想要为选定的深化候选探索替代接口时，使用此并行子 Agent 模式。基于"Design It Twice"（Ousterhout）— 你的第一个想法不太可能是最好的。

使用 `<Path>{roots.workflows}/specdev/I-implement/codebase-design-glossary.md</Path>` 中的词汇 — **module**（模块）、**interface**（接口）、**seam**（接缝）、**adapter**（适配器）、**leverage**（杠杆）。

## 流程

### 1. 界定问题空间

在启动子 Agent 之前，为选定候选编写一份面向用户的问题空间说明：

- 任何新接口需要满足的约束条件
- 它将依赖的依赖项，以及它们属于哪个类别（参见 `<Path>{roots.workflows}/specdev/I-implement/deepening.md</Path>`）
- 一个粗略的示例代码草图来使约束具体化 — 不是提案，只是让约束变得具体的一种方式

将此展示给用户，然后立即进入第 2 步。用户在子 Agent 并行工作时阅读和思考。

### 2. 启动子 Agent

使用 Agent 工具并行启动 3+ 个子 Agent。每个子 Agent 必须为深化后的模块生成一个**截然不同的**接口。

为每个子 Agent 提供一份独立的技术简报（文件路径、耦合细节、来自 `<Path>{roots.workflows}/specdev/I-implement/deepening.md</Path>` 的依赖类别、接缝背后的内容）。简报独立于第 1 步中面向用户的问题空间说明。给每个 Agent 一个不同的设计约束：

- Agent 1："最小化接口 — 目标 1–3 个入口点。最大化每个入口点的杠杆。"
- Agent 2："最大化灵活性 — 支持多种用例和扩展。"
- Agent 3："为最常见的调用方优化 — 让默认情况变得简单。"
- Agent 4（如适用）："围绕接缝设计端口与适配器，以处理跨接缝依赖。"

在简报中同时包含 `<Path>{roots.workflows}/specdev/I-implement/codebase-design-glossary.md</Path>` 词汇和 CONTEXT.md 词汇，以便每个子 Agent 能使用架构语言和项目的领域语言一致地命名事物。

每个子 Agent 输出：

1. 接口（类型、方法、参数 — 以及不变量、排序、错误模式）
2. 使用示例，展示调用方如何使用它
3. 实现在接缝背后隐藏了什么
4. 依赖策略和适配器（参见 `<Path>{roots.workflows}/specdev/I-implement/deepening.md</Path>`）
5. 权衡 — 哪里杠杆高，哪里杠杆薄

### 3. 展示和比较

按顺序展示各个设计，让用户能够消化每一个，然后用文字进行比较。通过 **depth**（深度，接口处的杠杆）、**locality**（局部性，变更集中的位置）和 **seam placement**（接缝位置）来对比。

比较之后，给出你自己的建议：你认为哪个设计最强以及原因。如果不同设计中的元素可以很好地组合，提出一个混合方案。要有主见 — 用户想要的是一个有力的判断，而不是一个菜单。
