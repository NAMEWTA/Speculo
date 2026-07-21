# INDEX.md 模板与规范

编写 workflow 的 INDEX.md 时必须遵守以下结构。所有内容为纯自然 markdown，无 XML 块。

## 格式约束

### 持久化约定：只声明真实存在的目录

**固定骨架**（`speculo init` 创建，始终存在）：

| 项 | 路径 | 说明 |
|----|------|------|
| 状态索引 | `status.json` | workflow 全局状态 |
| 活跃变更 | `changes/` | 所有 change 产物存放目录 |
| 变更归档 | `archive/` | 已完成并归档的 change |

**可选 lazy 目录**（changes 确认后按需创建，始终反映当前现状）：

| 名称 | 路径 | 说明 |
|------|------|------|
| 永久 ADR | `adr/` | changes 中确认后的 ADR 提升至此，随现状演进持续增删改 |
| 永久词汇表 | `context/` | changes 中确认后的 CONTEXT 提升至此，随现状演进持续增删改 |

**禁止在持久化约定中列出以下内容**：
- 不存在的目录或文件——不要凭空声明未创建的路径
- 由具体 work 运行时按需创建的临时产物——那是 work 内部行为
- 只在某些 work 中才会出现的目录

### 状态字段：必须写清楚 status.json 的每个字段

`status.json` 中每个字段必须列出：字段名、类型、用途、可能值。示例：

```
- schema_version（数字）— 状态 schema 版本号，当前为 1
- workflow（字符串）— workflow 标识，固定为 "xxx"
- active（数组）— 当前活跃 change 的目录名列表，每个元素为 "YYYY-MM-DD-<topic>" 格式的字符串
```

不允许仅写"维护以下字段"然后只列字段名不说明类型和用途。

## 完整模板

```markdown
---
id: <workflow-name>
type: workflow
workflow: <workflow-name>
name: <中文名称>
description: <一句话描述>
keywords: [<关键词>]
---

# <Workflow 标题>

本文件是 `<workflow-name>` 的唯一入口——包含运行时根、持久化约定、启动协议、状态字段、路径分配、副作用边界以及 work 条目索引。

## 运行时根

- **workflow 根**（`{roots.workflows}`）解析为 `<Path>{roots.workflows}/<workflow-name>/</Path>`，指向 work 入口和子文件所在目录
- **state 根**（`{roots.state}`）解析为 `<Path>{roots.state}/<workflow-name>/</Path>`，指向持久化状态和变更产物所在目录

## 持久化约定

在 state 根下维护以下结构：

**固定骨架**（`speculo init` 创建，始终存在）：

| 名称 | 路径 | 说明 |
|------|------|------|
| 状态索引 | `<Path>{roots.state}/<workflow-name>/status.json</Path>` | workflow 全局状态 |
| 活跃变更 | `<Path>{roots.state}/<workflow-name>/changes/</Path>` | 进行中的 change 产物存放目录 |
| 变更归档 | `<Path>{roots.state}/<workflow-name>/archive/</Path>` | 已完成并归档的历史 change |

**确认后按需创建**（changes 中的产物经确认后提升至此，始终反映当前现状）：

| 名称 | 路径 | 说明 |
|------|------|------|
| 永久 ADR | `<Path>{roots.state}/<workflow-name>/adr/</Path>` | changes 中确认后的 ADR 提升至此，随现状演进持续增删改 |
| 永久词汇表 | `<Path>{roots.state}/<workflow-name>/context/</Path>` | changes 中确认后的 CONTEXT 提升至此，随现状演进持续增删改

## 启动协议

1. 解析 workspace 配置和 workflow/state roots。已解析时复用。
2. 读取 `<Path>{roots.state}/<workflow-name>/status.json</Path>` 确定当前 change：
   - 用户指定 → 直接使用
   - 唯一活跃 change → 直接使用
   - 无活跃 → 创建 `changes/<YYYY-MM-DD>-<kebab-topic>/`，注册到 `active` 数组
   - 多个候选 → 先消歧

## 状态字段

`<Path>{roots.state}/<workflow-name>/status.json</Path>` 包含以下字段：

- **`schema_version`**（数字）— 状态 schema 版本号，当前为 1
- **`workflow`**（字符串）— workflow 标识，固定为 `"<workflow-name>"`
- **`active`**（字符串数组）— 当前活跃 change 的目录名列表，每个元素为 `"YYYY-MM-DD-<topic>"` 格式。空数组表示无活跃 change
- **`current_work`**（字符串或 null）— 当前正在执行的 work id，如 `"specdev/grill-with-docs"`。无正在执行的 work 时为 null
- **`work_history`**（对象数组）— work 调用记录，每条包含：
  - `work_id` — work 标识
  - `started_at` — 开始时间（ISO 8601）
  - `completed_at` — 完成时间（ISO 8601），未完成时为 null
  - `result` — 完成结果，如 `"completed"`、`"aborted"`
  - `artifacts` — 产物的项目相对路径列表

`active` 数组支持多 change 并行（如 W-wayfinder 同时追踪多个 ticket），但大多数场景下仅有一个活跃 change。

## 路径分配

1. 产物写入当前 change 目录（`<Path>{roots.state}/<workflow-name>/changes/{change}/</Path>`）
2. 领域文档（ADR.md、LOG.md、CONTEXT.md）由设计类 work 维护
3. Spec、tickets、map 等产物由对应 work 写入当前 change 目录
4. 项目代码、测试写入项目相对路径，验证指针记录到 change
5. 所有引用使用 `<Path>{roots.workflows}/<workflow-name>/...</Path>` 或 `<Path>{roots.state}/<workflow-name>/...</Path>` 格式

## 副作用边界

确认前不得执行：提交代码、合并/删除 worktree、发布/部署。结果记录到 `<Path>{roots.state}/<workflow-name>/changes/{change}/LOG.md</Path>`。敏感值不得写入。

## Work 条目

<!-- AUTO-INDEX-START -->

- **<X-workname>** — <中文名>：<一句话描述>

<!-- AUTO-INDEX-END -->
```
