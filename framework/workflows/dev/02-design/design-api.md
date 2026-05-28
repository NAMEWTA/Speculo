# Design API — API 设计规范

本阶段输出**端点级 API 设计**：端点清单、参数 schema、错误码、跨端点共享结构。AI 在执行 `phase=api` 时读本文件作为填写指引。

## 一、上下文与产物

- **输入**：同 change 下的 `prd.md`、`design-arch.md`；项目根 `../../../.speculo/.config/CONVENTIONS.md`（命名/错误码约定，如存在）
- **产物**：`design-api.md`（基于 `../_templates/design-api-template.md`）
- **覆盖面**：本 change 引入或修改的**全部对外 API**（HTTP/RPC/CLI/Pub-Sub 任一形态）

## 二、章节填写引导

### 端点清单
表格列全部端点：

| 端点 ID | Method | Path / Topic | 参数概要 | 成功返回 | 错误码 | 关联 AC |
|---------|--------|--------------|----------|----------|--------|---------|

- **端点 ID**：用 `EP-N` 编号，便于后续 review/test 引用
- **参数概要**：path/query/body 参数名 + 类型 + 必填标记；详细 schema 进 `<api>` XML 块或共享 Schema 段
- **错误码**：4xx / 5xx 主要类别 + 业务错误码；与项目错误码体系一致
- **关联 AC**：反向引用 `prd.md` 的 AC 编号，确认每个 AC 都有路径承载

### `<api>` 端点详情（推荐 XML 强调结构）
对每个端点详写：

```markdown
<api id="EP-1">
  <method>POST</method>
  <path>/v1/orders</path>
  <auth>required: bearer</auth>
  <request>
    <header>Content-Type: application/json</header>
    <body schema="OrderCreate" />
  </request>
  <response status="201">
    <body schema="Order" />
  </response>
  <errors>
    <error code="400">参数校验失败（含字段级 message）</error>
    <error code="409">业务冲突（如订单已存在）</error>
    <error code="500">服务端错误</error>
  </errors>
</api>
```

### 共享 Schema
跨端点复用的数据结构：

```markdown
<schema name="Order">
  - id: string (uuid)
  - user_id: string (uuid)
  - items: array of OrderItem
  - status: enum(pending, paid, shipped, cancelled)
  - created_at: string (iso8601)
</schema>
```

- 复用项必须放此段，避免端点级重复定义
- 若本 change 无共享 Schema，显式写"无"（不留空）

## 三、错误码与约定一致性

- 状态码语义与 `CONVENTIONS.md`（若存在）一致
- 业务错误码（如 `ERR_ORDER_DUPLICATE`）：命名风格与现有体系对齐
- 不在端点层"私自造"错误码体系；与现有冲突要在 design-arch.md ADR 中声明并解决

## 四、与 PRD AC 的映射检查

为每条 AC：
- 找出**至少一个端点**作为可观察结果的入口
- 若 AC 不需要 API（纯前端/本地行为）：在端点清单"关联 AC"列填 `N/A: <理由>`

未映射的 AC = 设计漏洞，必须回 design-arch 或 prd 调整。

## 五、完成准则（机器可验证）

- `grep -c '\[TODO:' design-api.md` = 0
- 文件含 `## 端点清单` 与 `## 共享 Schema` 两个标题
- 端点清单表格行数 ≥1（或显式写"本次无新增/修改 API"理由）
- "共享 Schema" 段非空或显式写"无"
- `<api>` 标签出现次数 ≥ 端点数量（每个端点至少一个 XML 详情块）
- 每条 PRD AC 在"关联 AC"列出现（含 `N/A` 标注的算映射完成）
- `api_endpoints_count` 字段写入 `.status.json`，值等于端点清单条数
