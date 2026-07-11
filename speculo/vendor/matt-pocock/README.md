### 工程

我日常编码工作中使用的 skill。

**用户调用**

- [**ask-matt**](./engineering/ask-matt/SKILL.md) — 询问哪个 skill 或工作流适合你的情况。本仓库中用户调用 skill 的路由器。
- [**grill-with-docs**](./engineering/grill-with-docs/SKILL.md) — 在问答式访谈会话中同时构建项目的领域模型，打磨术语并内联更新 `CONTEXT.md` 和 ADR。
- [**triage**](./engineering/triage/SKILL.md) — 通过分类角色状态机处理 issues。
- [**improve-codebase-architecture**](./engineering/improve-codebase-architecture/SKILL.md) — 扫描代码库寻找深化机会，以可视化 HTML 报告呈现，然后深入讨论你选择的任何一个。
- [**setup-matt-pocock-skills**](./engineering/setup-matt-pocock-skills/SKILL.md) — 为工程 skill 配置此仓库（issue tracker、分类标签、领域文档布局）。在使用其他工程 skill 之前每个仓库运行一次。
- [**to-spec**](./engineering/to-spec/SKILL.md) — 将当前对话转化为 spec 并发布到 issue tracker。无需访谈——只是综合你已经讨论过的内容。
- [**to-tickets**](./engineering/to-tickets/SKILL.md) — 将任何计划、spec 或对话分解为一组 tracer-bullet 票据，每个声明其阻塞边界——作为本地文件中的文本写入，或作为真实 tracker 上的原生阻塞链接。
- [**implement**](./engineering/implement/SKILL.md) — 构建 spec 或票据集描述的工作，在预先约定的 seam 处驱动 `/tdd`，并在提交前以 `/code-review` 收尾。
- [**wayfinder**](./engineering/wayfinder/SKILL.md) — 规划一大块工作，超过一个 agent 会话所能容纳的量，作为 issue tracker 上的共享调查票据地图——一次解决一个，直到通往目的地的路径清晰。

**模型调用**

- [**prototype**](./engineering/prototype/SKILL.md) — 构建一次性原型来回答设计问题——用于状态/逻辑问题的可运行终端应用，或多种可从同一路由切换的截然不同的 UI 变体。
- [**diagnosing-bugs**](./engineering/diagnosing-bugs/SKILL.md) — 用于困难 bug 和性能回归的规范化诊断循环：重现 → 最小化 → 假设 → 插桩 → 修复 → 回归测试。
- [**research**](./engineering/research/SKILL.md) — 针对高可信度的主要来源调查问题，并将发现捕获为仓库中的带引用 Markdown 文件，作为后台 agent 运行。
- [**tdd**](./engineering/tdd/SKILL.md) — 使用红-绿-重构循环的测试驱动开发。一次一个垂直切片地构建功能或修复 bug。
- [**domain-modeling**](./engineering/domain-modeling/SKILL.md) — 主动构建和打磨项目的领域模型——对照词汇表挑战术语、用边界场景压力测试、内联更新 `CONTEXT.md` 和 ADR。
- [**codebase-design**](./engineering/codebase-design/SKILL.md) — 设计深层模块的共享准则和词汇：大量行为放在小接口背后，置于清晰的 seam 处，通过该接口可测试。
- [**code-review**](./engineering/code-review/SKILL.md) — 从固定点开始的 diff 双轴审查：**标准**（是否遵循仓库的编码标准，加上 Fowler 气味基线？）和 **Spec**（是否忠实实现了原始 issue/PRD？），作为并行子 agent 运行，互不污染。

### 生产力

通用工作流工具，不限于编码。

**用户调用**

- [**grill-me**](./productivity/grill-me/SKILL.md) — 接受对计划或设计 relentless 的访谈，直到决策树的每个分支都被解决。
- [**handoff**](./productivity/handoff/SKILL.md) — 将当前对话压缩为交接文档，以便另一个 agent 可以继续工作。
- [**teach**](./productivity/teach/SKILL.md) — 在多个会话中向用户教授新 skill 或概念，使用当前目录作为有状态的教学工作区。
- [**writing-great-skills**](./productivity/writing-great-skills/SKILL.md) — 编写和编辑 skill 的参考：使 skill 可预测的词汇和原则。

**模型调用**

- [**grilling**](./productivity/grilling/SKILL.md) — relentlessly 访谈用户关于计划或设计，直到决策树的每个分支都被解决。`grill-me` 和 `grill-with-docs` 背后的可复用循环。

