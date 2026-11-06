---
name: specdev
description: 从需求评估、原型、规格和实施，到代码审查、发版部署、环境维护与知识提纯的软件交付；也可直接处理其中一项工作。
---

# 软件开发与上线

从用户当前要完成的结果开始，复用已有需求、代码、设计和授权。这里的 Work 是可独立调用的方法；按当前问题选择，不要求顺序走完、逐层交接或逐项生成文档。

通常先理解需求并评估；体验不清楚时先做原型，再把确认的行为整理成 spec。内容或协作规模需要时才切片，随后实现、检查、交付与部署。小修复可直接实现，纯后端工作可跳过 UI。

用户主要参与需求取舍和体验方向。只集中询问会改变目标、体验或重要风险且不能自行查明的问题；工程事实先查项目，已有明确决定直接沿用。

## 按任务选择 Work

| 当前任务 | 入口 |
|---|---|
| 了解工程、开发环境与验证入口 | [工程初始化](specdev-i-init-setup/SKILL.md) |
| 收集反馈、浏览待办、评估 issue 或 PR | [需求分诊](specdev-t-triage/SKILL.md) |
| 大需求边界尚不清楚，先调查可行路线 | [需求探索](specdev-w-wayfinder/SKILL.md) |
| 对已界定需求澄清产品和架构取舍 | [决策访谈](specdev-g-grill-with-docs/SKILL.md) |
| 学习代码、外部项目或技术机制 | [学习与图解](specdev-l-learn/SKILL.md) |
| 验证 UI、交互、规则或状态模型 | [原型设计](specdev-p-prototype/SKILL.md) |
| 将来源与设计整理成可实施的行为规格 | [编写 Spec](specdev-s-spec/SKILL.md) |
| 划分可独立验收的实施切片 | [拆分 Tickets](specdev-t-tickets/SKILL.md) |
| 规划、继续或调整一次较大交付 | [目标计划](specdev-p-goal-plan/SKILL.md) |
| 修改代码、文档或配置并完成验证 | [实施](specdev-i-implement/SKILL.md) |
| 复现、定位缺陷或调查一次性事件 | [故障诊断](specdev-d-diagnose-bugs/SKILL.md) |
| 审查指定文件、commit、区间或 PR | [代码审查](specdev-c-code-review/SKILL.md) |
| 评估结构维护成本、重构方案或性能 | [架构审查](specdev-r-review-architecture/SKILL.md) |
| 推送、PR、CI、Issue 回写或版本发布 | [开发交付](specdev-d-delivery/SKILL.md) |
| 准备发起部署所需的本机工具与环境记录 | [部署环境初始化](specdev-i-environment-setup/SKILL.md) |
| 接入一台指定服务器并确认部署位置 | [服务器接入](specdev-s-server-connect/SKILL.md) |
| 维护主机系统、容器运行时与共享入口 | [主机维护](specdev-h-host-manage/SKILL.md) |
| 将项目或共享服务部署、升级、迁移或回退 | [项目部署](specdev-d-project-deploy/SKILL.md) |
| 查看环境、服务器、项目与部署关系 | [资产盘点](specdev-v-inventory-view/SKILL.md) |
| 从开发过程提取具体改进 | [开发复盘](specdev-r-retro/SKILL.md) |
| 维护长期知识或结束交付并归档 | [提纯与归档](specdev-a-archive-and-consolidate/SKILL.md) |

只打开当前任务需要的入口及它指向的适用参考。用户已要求完整实施时，连续完成已授权工作；不因切换 Work 再问同一批准，也不把这些入口变成固定角色或调度器。

## 一份可接续记录

先使用用户指定的 issue、PR 或项目文档。需要跨会话推进版本交付时，默认在项目根下 `.agents/speculo/.speculo/releases/<name>/README.md` 记录来源、范围、关键决定、当前设计、实际结果与下一步。小改动现有 issue 或提交说明足够就不另建记录。

规格与任务清单可以写在这份记录内；内容太大才拆出 spec 或票据，原记录只链接它们。每项事实保持一个主要维护位置，没有强制模板、字段、状态文件或独立交接报告。保存、恢复或提纯时参考 [持久化](../../references/memory.md)。

## 设计、完成与上线

设计在项目长期位置维护，代码、HTML、组件示例、样式和图像均可作为依据。交付记录引用本次采用的固定版本；候选、已确认设计和当前实现要能分辨。

涉及 UI 的实施和审查，比较同一页面、状态与必要视口。已确认的导航、区域组合和信息层级不能自行当作演示而丢弃；未获接受的结构偏差保持为未完成项。

技术检查、用户验收、PR 合并、版本发布和目标环境上线分别按实际证据判断。任务明确要求的最终用户验收，只能由同一交付范围的真实反馈或明确延期决定满足；原型批准和发版许可不自动代替它。

部署复用已核实的目标、项目现有发布方式和当前有效授权。完成后核对实际版本、服务健康与关键业务路径，按风险验证数据迁移和恢复；当前需求只到 PR 时，就交付可审阅 PR。

中断后先核对现有记录、Git 与实际系统状态，再从未完成处继续。结束时报告成果入口、关键取舍、真实检查和剩余限制，并把仍有复用价值的决定、背景、故障经验或设计提纯到长期位置。
