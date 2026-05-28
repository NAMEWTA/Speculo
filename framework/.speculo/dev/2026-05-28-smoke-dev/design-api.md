# API 设计

## 端点清单

| 端点 ID | Method | Path | 参数概要 | 成功返回 | 错误码 | 关联 AC |
|---------|--------|------|---------|---------|--------|---------|
| EP-1 | POST | /v1/auth/login | body: { email, password } | 200 + { access_token, refresh_token, expires_in } | 400/401/429 | AC-1 |
| EP-2 | POST | /v1/auth/refresh | body: { refresh_token } | 200 + { access_token, refresh_token, expires_in } | 400/401/410 | AC-1 |
| EP-3 | POST | /v1/auth/logout | header: Authorization; body: { device_id? } | 204 | 401 | AC-2 |
| EP-4 | DELETE | /v1/sessions/by-user | body: { user_id }（admin only） | 200 + { revoked_count } | 401/403 | AC-3 |

## `<api>` 端点详情

<api id="EP-1">
  <method>POST</method>
  <path>/v1/auth/login</path>
  <auth>required: none</auth>
  <request>
    <header>Content-Type: application/json</header>
    <body schema="LoginRequest" />
  </request>
  <response status="200">
    <body schema="TokenPair" />
  </response>
  <errors>
    <error code="400">参数校验失败（email 格式 / password 长度）</error>
    <error code="401">认证失败（用户不存在 / 密码错误，不区分以防枚举）</error>
    <error code="429">登录尝试频率限制</error>
  </errors>
</api>

<api id="EP-2">
  <method>POST</method>
  <path>/v1/auth/refresh</path>
  <auth>required: refresh_token in body</auth>
  <request>
    <header>Content-Type: application/json</header>
    <body schema="RefreshRequest" />
  </request>
  <response status="200">
    <body schema="TokenPair" />
  </response>
  <errors>
    <error code="400">refresh_token 缺失或格式错误</error>
    <error code="401">refresh_token 无效或已吊销</error>
    <error code="410">refresh_token 已过期</error>
  </errors>
</api>

<api id="EP-3">
  <method>POST</method>
  <path>/v1/auth/logout</path>
  <auth>required: bearer</auth>
  <request>
    <header>Authorization: Bearer &lt;access_token&gt;</header>
    <body schema="LogoutRequest" />
  </request>
  <response status="204">无 body</response>
  <errors>
    <error code="401">access_token 无效</error>
  </errors>
</api>

<api id="EP-4">
  <method>DELETE</method>
  <path>/v1/sessions/by-user</path>
  <auth>required: bearer + role=admin</auth>
  <request>
    <header>Authorization: Bearer &lt;admin_access_token&gt;</header>
    <body schema="RevokeAllRequest" />
  </request>
  <response status="200">
    <body schema="RevokeAllResponse" />
  </response>
  <errors>
    <error code="401">未认证</error>
    <error code="403">非 admin 角色</error>
  </errors>
</api>

## 共享 Schema

<schema name="TokenPair">
  - access_token: string (JWT)
  - refresh_token: string (opaque, 64 chars)
  - expires_in: number (access_token TTL 秒数，900)
  - token_type: string (固定 "Bearer")
</schema>

<schema name="LoginRequest">
  - email: string (required, 邮箱格式)
  - password: string (required, 长度 8-128)
</schema>

<schema name="RefreshRequest">
  - refresh_token: string (required, 64 chars)
</schema>

<schema name="LogoutRequest">
  - device_id: string (optional, 不传则登出当前设备)
</schema>

<schema name="RevokeAllRequest">
  - user_id: string (required, uuid)
</schema>

<schema name="RevokeAllResponse">
  - revoked_count: number (被吊销的 session 数)
</schema>
