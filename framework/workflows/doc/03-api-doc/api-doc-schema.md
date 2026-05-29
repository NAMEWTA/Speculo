# API Doc Schema — 数据结构文档规范

本阶段输出 API 共享数据结构文档。AI 在执行 `phase=schema` 时读本文件作为填写指引。

## 一、上下文与产物

- **输入**：`api-doc.md`、`design-api.md`、代码中的 schema/type/model 定义。
- **产物**：`api-schema.md`（基于 `../_templates/api-schema-template.md`）。
- **边界**：文档化公开接口 schema，不把内部数据库表结构原样暴露给用户。

## 二、Schema 必填字段

每个 schema 必须包含：

- 名称与用途
- 字段名
- 类型
- 是否必填
- 约束（枚举、范围、格式、长度）
- 示例值
- 兼容性说明（新增/废弃/破坏性变更）

## 三、完成准则（机器可验证）

- `grep -c '\[TODO:' api-schema.md` = 0
- `documented_schemas_count` 等于 schema 块数量
- `api-doc.md` 中引用的所有 schema 都在 `api-schema.md` 定义
- 若存在字段删除、类型变化或必填性收紧，`api_doc_breaking_changes=true`
