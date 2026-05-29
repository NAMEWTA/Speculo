# API Doc Endpoint — 端点文档规范

本阶段输出端点级 API 文档。AI 在执行 `phase=endpoint` 时读本文件作为填写指引。

## 一、上下文与产物

- **输入**：关联 dev change 的 `design-api.md`、实现 diff、测试用例、已有 API 文档。
- **产物**：`api-doc.md`（基于 `../_templates/api-doc-template.md`）。
- **边界**：如果设计与实现不一致，先标注冲突并要求回到 dev workflow 处理，不擅自选择一方。

## 二、端点必填字段

每个端点必须包含：

- Method + Path
- 认证要求
- Path / Query / Header / Body 参数
- 成功响应状态码与 body schema
- 错误码、触发条件、响应体
- 最小请求示例与成功响应示例
- 关联设计或测试来源

## 三、完成准则（机器可验证）

- `grep -c '\[TODO:' api-doc.md` = 0
- `documented_endpoints_count` 等于端点块数量
- 每个端点块包含 method、path、auth、request、response、errors
- 端点引用的 schema 名称在 `api-schema.md` 或 `design-api.md` 中存在
