---
id: doc/api-doc
category: doc
name: API 文档工作流
description: API 文档编写
keywords: [api, doc, 接口文档]
---

# API 文档工作流执行指引

本工作流把实现或设计中的接口事实转化为可发布的 API 文档，覆盖端点行为与共享数据结构。它不替代 dev/02-design 的设计决策，只把已确认的接口对外表达清楚。

AI 进入本工作流时的前置动作：

1. 读 `../../../.speculo/doc-status.json` 锁定目标 doc change。
2. 读取关联 dev change 的 `design-api.md`、测试产物、实现 diff（若存在）。
3. 读取项目现有 API 文档风格；不存在时使用本工作流模板。

## 阶段

### 1. Endpoint — 端点描述
- 规范：`api-doc-endpoint.md`
- 模板：`../_templates/api-doc-template.md`
- 产物：`api-doc.md`
- 完成准则：
  - 每个端点含 method、path、认证、参数、响应、错误码、示例
  - 每个端点能追溯到设计或实现来源

### 2. Schema — 数据结构
- 规范：`api-doc-schema.md`
- 模板：`../_templates/api-schema-template.md`
- 产物：`api-schema.md`
- 完成准则：
  - 共享 schema 字段含类型、必填、约束、示例值
  - 端点引用的 schema 都能在 `api-schema.md` 找到定义

## 依赖

- 软依赖（建议先做）：`../../dev/02-design/`（若存在 API 设计产物 `design-api.md`，应作为参考输入）
- 硬依赖：无

## 状态扩展字段

本工作流需在同 change 的 `.status.json` 追加：

- `api_docs_target` (string) — API 文档目标路径
- `documented_endpoints_count` (number) — 已文档化端点数
- `documented_schemas_count` (number) — 已文档化共享 schema 数
- `api_doc_breaking_changes` (boolean) — 是否包含破坏性 API 变更

## 完成与状态更新

- 进入 Endpoint 时：`current_phase` 置 `endpoint`；`phase_history` 追加。
- Endpoint 完成：把对应条目置 `completed`；写入 `documented_endpoints_count`。
- 进入 Schema 时：`current_phase` 置 `schema`；`phase_history` 追加。
- Schema 完成：把对应条目置 `completed`；写入 `documented_schemas_count` 与 `api_doc_breaking_changes`。
- 若无后续 doc phase，把 `change_status` 置 `completed`，等待 `../../../commands/archive.md` 归档。
