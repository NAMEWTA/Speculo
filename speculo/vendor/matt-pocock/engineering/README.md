# 工程

我日常编码工作中使用的 skill。

## 用户调用

只能由用户输入来访问（`disable-model-invocation: true`）。

- **[ask-matt](./ask-matt/SKILL.md)** — 询问哪个 skill 或工作流适合您的情况。本仓库中用户调用 skill 的路由器。
- **[grill-with-docs](./grill-with-docs/SKILL.md)** — 在问答会话中同时构建项目的领域模型，打磨术语并内联更新 `CONTEXT.md` 和 ADR。
- **[triage](./triage/SKILL.md)** — 通过分类角色状态机处理 issues。
- **[improve-codebase-architecture](./improve-codebase-architecture/SKILL.md)** — 扫描代码库寻找深化机会，以可视化 HTML 报告呈现，然后深入讨论您选择的任何一个。
- **[setup-matt-pocock-skills](./setup-matt-pocock-skills/SKILL.md)** — 为工程 skill 配置此仓库（issue tracker、分类标签、领域文档布局）。每个仓库运行一次。
- **[to-spec](./to-spec/SKILL.md)** — 将当前对话转化为 spec 并发布到 issue tracker。
- **[to-tickets](./to-tickets/SKILL.md)** — 将任何计划、spec 或对话分解为一组 tracer-bullet 票据，每个声明其阻塞边界——本地文件中的文本，或真实 tracker 上的原生阻塞链接。
- **[wayfinder](./wayfinder/SKILL.md)** — 规划一大块工作——超过一个 agent 会话所能容纳的量——作为 issue tracker 上的共享调查票据地图，一次解决一个，直到通往目的地的路径清晰。

## 模型调用

模型或用户均可访问（丰富的触发措辞使模型能够使用它们）。

- **[prototype](./prototype/SKILL.md)** — 构建一次性原型来回答设计问题：用于状态/逻辑的可运行终端应用，或多种可切换的 UI 变体。
- **[diagnosing-bugs](./diagnosing-bugs/SKILL.md)** — 用于困难 bug 和性能回归的规范化诊断循环：重现 → 最小化 → 假设 → 插桩 → 修复 → 回归测试。
- **[research](./research/SKILL.md)** — 针对高可信度的主要来源调查问题，并将发现捕获为仓库中的带引用的 Markdown 文件，作为后台 agent 运行。
- **[tdd](./tdd/SKILL.md)** — 使用红-绿-重构循环的测试驱动开发。一次一个垂直切片地构建功能或修复 bug。
- **[domain-modeling](./domain-modeling/SKILL.md)** — 主动构建和打磨项目的领域模型——挑战术语、用场景压力测试、内联更新 `CONTEXT.md` 和 ADR。
- **[codebase-design](./codebase-design/SKILL.md)** — 设计深层模块的共享准则和词汇：小接口、清晰缝线、通过接口可测试。
- **[code-review](./code-review/SKILL.md)** — 从固定点开始的 diff 双轴审查：**标准**（是否遵循仓库的编码标准，加上 Fowler 气味基线？）和 **Spec**（是否忠实地实现了原始 issue/PRD？），作为并行子 agent 运行。
