---
id: specdev
type: workflow
workflow: specdev
name: SpecDev Workflow
description: 软件研发全流程——从初始化设置、设计访谈（带 ADR/LOG/CONTEXT）、spec 编写、ticket 拆分、寻路到 TDD 实现与双轴审查
keywords: [specdev, 软件研发, 设计, spec, tickets, 寻路, TDD, 实现, 审查]
---

# SpecDev Workflow

本文件是 `specdev` 的唯一入口——包含运行时根、持久化约定、启动协议、状态字段、路径分配、副作用边界以及 work 条目索引。

## 运行时根

- **workflow 根**（`{roots.workflows}`）解析为 `<Path>{roots.workflows}/specdev/</Path>`，指向 work 入口和子文件所在目录
- **state 根**（`{roots.state}`）解析为 `<Path>{roots.state}/specdev/</Path>`，指向持久化状态和变更产物所在目录

## 持久化约定

在 state 根下维护以下结构：

| 名称 | 路径 | 说明 |
|------|------|------|
| 状态索引 | `<Path>{roots.state}/specdev/status.json</Path>` | workflow 全局状态 |
| 活跃变更 | `<Path>{roots.state}/specdev/changes/</Path>` | 进行中的 change 产物（ADR、LOG、CONTEXT、spec、tickets、map 等） |
| 永久 ADR | `<Path>{roots.state}/specdev/adr/</Path>` | changes 中经确认后的 ADR 提升至此，始终反映当前架构决策现状 |
| 永久词汇表 | `<Path>{roots.state}/specdev/context/</Path>` | changes 中经确认后的 CONTEXT 提升至此，始终反映当前领域术语现状 |
| 变更归档 | `<Path>{roots.state}/specdev/archive/</Path>` | 已完成并归档的历史 change，按 YYYY-MM/<change>/ 组织 |

`status.json`、`changes/`、`archive/` 为固定骨架，由 `speculo init` 创建。`adr/` 和 `context/` 为确认后创建——当 changes 中的 ADR、CONTEXT 经确认符合当前现状后，提升到这两个目录，始终保持与项目当前状态一致。

## 启动协议

1. **解析运行时** — 解析 workspace 配置和 workflow/state roots。已解析时复用。
2. **选择 change** — 读取 `<Path>{roots.state}/specdev/status.json</Path>`：
   - 用户指定 → 直接使用
   - 唯一活跃 change → 直接使用
   - 无活跃 → 创建 `changes/<YYYY-MM-DD>-<kebab-topic>/`，注册到 `active` 数组
   - 多个候选 → 先消歧

## 状态字段

`<Path>{roots.state}/specdev/status.json</Path>` 包含以下字段：

- **`schema_version`**（数字）— 状态 schema 版本号，当前为 1
- **`workflow`**（字符串）— workflow 标识，固定为 `"specdev"`
- **`active`**（字符串数组）— 当前活跃 change 的目录名列表，每个元素为 `"YYYY-MM-DD-<topic>"` 格式。空数组表示无活跃 change
- **`current_work`**（字符串或 null）— 当前正在执行的 work id，如 `"specdev/grill-with-docs"`。无正在执行的 work 时为 null
- **`work_history`**（对象数组）— work 调用记录，每条包含：
  - `work_id` — work 标识
  - `started_at` — 开始时间（ISO 8601）
  - `completed_at` — 完成时间（ISO 8601），未完成时为 null
  - `result` — 完成结果，如 `"completed"`、`"aborted"`
  - `artifacts` — 产物的项目相对路径列表

## 路径分配

1. 产物写入当前 change 目录（`<Path>{roots.state}/specdev/changes/{change}/</Path>`）
2. 领域文档（ADR.md、LOG.md、CONTEXT.md）由 `G-grill-with-docs` 维护
3. Spec、tickets、map 等产物由对应 work 写入当前 change 目录
4. 项目代码、测试写入项目相对路径，验证指针记录到 change
5. 所有引用使用 `<Path>{roots.workflows}/specdev/...</Path>` 或 `<Path>{roots.state}/specdev/...</Path>` 格式，不引用外部

## 副作用边界

确认前不得执行：提交代码、合并/删除 worktree、发布/部署。结果记录到 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`。敏感值不得写入。

## Work 条目

<!-- AUTO-INDEX-START -->

- **D-diagnose-bugs** — 诊断：针对疑难 bug 建立诊断循环——构建紧凑反馈回路、复现最小化、可证伪假设排名、插桩定位根因，确认后移交 I-implement 修复。
- **G-grill-with-docs** — 设计访谈（带文档）：无情访谈打磨设计，同时持续产出 ADR.md、LOG.md 和 CONTEXT.md 三个领域文档。在设计讨论中捕获术语定义、记录架构决策、保存完整设计轨迹。
- **I-implement** — 实现：基于 spec 或 tickets 实现工作——以深层模块设计原则指导架构、以 TDD 红绿循环驱动编码、以双轴审查把关质量。
- **I-init-setup** — 初始化设置：为 specdev workflow 配置变更追踪、领域文档布局、状态标签和语言偏好。首次使用其他 specdev works 前运行一次。
- **S-spec** — 编写 Spec：将当前对话综合为一份完整的 spec 文档，包含问题陈述、解决方案、用户故事、实现决策和测试决策，持久化到变更目录。
- **T-tickets** — 拆分 Tickets：将 spec 或计划拆分为一组曳光弹式垂直切片 tickets，每个声明阻塞边，持久化到变更目录。支持宽重构的扩展-收缩排序。
- **W-wayfinder** — 寻路：为超出单次会话容量的大块工作绘制共享地图，逐个解决调查 tickets 直到通往目标的路径清晰可见。支持研究和决策型 ticket 类型。

<!-- AUTO-INDEX-END -->
