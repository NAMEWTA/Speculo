# Workflow 领域指南

[手册首页](../README.md) · [基本概念](../concepts.md) · [Command 工具箱](../commands/README.md)

workflow 是围绕一类工作组织的方法集合，Work 是其中一个步骤。你可以从当前需要的 Work 进入，不必按字母顺序依次执行；真正的前置条件由该 Work 的输入决定。

## 五个领域

| 领域 | Work 数 | 最常见的起点 | 教程 |
|---|---:|---|---|
| SpecDev | 15 | 明确需求用 Spec；有故障用 Diagnose；需求边界不清用 Wayfinder | [开发、审查与交付](specdev.md) |
| Learning | 9 | 系统学习用 Assess；直接问答用 Question | [课程、问答与复习](learning.md) |
| OPS | 5 | Initialize 准备控制端，Server Connect 接入目标 | [服务器与项目运维](ops.md) |
| Person | 2 | 选择权衡用 Steelman；系统战略咨询用 Cognitive OS | [问题分析与决策](person.md) |
| Media | 7 | Brief 建母稿，Deconstruct 拆实际案例 | [内容、视觉与视频](media.md) |

## 同一个词，在不同领域可能不同

| 你要的结果 | 对应入口 |
|---|---|
| 实施一份已确认开发规格 | `specdev/implement` |
| 按多个开发任务持续推进 | `specdev/goal-plan` 的 run/resume |
| 为学习一个代码仓库生成可执行课程计划 | `learning/goal`，本轮先交计划再停止 |
| 学习需求参考、本项目代码、已有 change 或外部项目与文章 | `specdev/learn` |
| 学一门知识并练习 | `learning/lesson`、`learning/question`、`learning/homework` |
| 审查代码正确性与规格符合性 | `specdev/code-review` |
| 验证几天后还能否回忆和迁移知识 | `learning/review` |
| 复盘开发协作问题 | `specdev/retro` |
| 反馈 Speculo 产品使用问题 | `command/retro` |
| 复盘内容表现并设计下一轮实验 | `media/retro` |

## 跨领域如何衔接

各领域保留各自的产物与权限。把真实文件交给下一个入口，并说明新目标，不靠“上一步做过”推断权限。

- SpecDev 完成代码 → OPS 部署：提供实际版本、构件、配置、验证和恢复资料，再明确目标服务器与部署范围。
- SpecDev 形成代码 → Learning 学习：给仓库和模块范围；Learning 自己维护课程与问答。
- Learning 或 Person 得出结论 → Media 制作：以获准材料作为输入，重新核验需对外表达的事实。
- 任何领域需要交接 → [handoff](../commands/handoff.md)；需要概览 → [status](../commands/status.md)。

不是所有领域都有归档 Work。通用归档 Command 当前只路由 SpecDev 和 Learning；OPS、Person、Media 返回不支持，不自行挪动它们的数据。
