---
id: learning/assess-and-plan
type: workflow-entry
workflow: learning
name: 评估背景并设计课程
description: 以目标和证据为起点建立课程、背景、基线、来源和可变 Lesson 地图。
keywords: [评估, baseline, course-design, objectives, background]
---

# 评估背景并设计课程

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`。

## 流程

1. 确认 I 已完成，收集学习目标、期望效果、受众、范围、时间、表达基线和深度。缺少会改变课程设计的选择时，一次只问一个问题。
2. 创建或恢复 `YYYY-MM-DD-<kebab-topic>[-NN]` Change，生成 `.status.json`，设置 `current_work=learning/assess-and-plan`。
3. 写 `course.md`：可观察 OBJ、先决条件、课程地图、每节 Lesson 的 30–40 分钟预算、可选路径、Homework 映射和成功证据。章节顺序是参考方案，不是强制教学模型。
4. 写 `background/foundation.md`：主题宏观背景、概念关系、术语、历史/上下文和学习前置知识；另写 `baseline.md` 保存学习者原始基线，不将“听说过”当作能力。
5. 写 `sources.md`：搜索范围、权威来源、source id、URL/定位、访问日期、支持的 claim、未决冲突和不确定性。项目事实、外部证据、类比和未知分开。
6. 创建 `INDEX.md`、`lessons/INDEX.md`、`homework/INDEX.md` 和 `learning-log.md`，运行 validator；完成后清空 `current_work`，不自动激活 L/H。

## 完成标准

- 每个 OBJ 有可观察证据、前置关系、Lesson 估时和来源计划；
- background 与 baseline 分离，所有原始回答保持不改写；
- 后续新问题写入 `notes/`，实质范围变化创建新 Lesson 或新 Change，并保留 revision。

## 子文件

- Change seed：`<Path>{roots.workflows}/learning/A-assess-and-plan/change-status-template.json</Path>`
- Course 模板：`<Path>{roots.workflows}/learning/A-assess-and-plan/course-template.md</Path>`
- Background 模板：`<Path>{roots.workflows}/learning/A-assess-and-plan/background-template.md</Path>`
