# 架构设计

## 整体架构

```
        ┌──────────────┐         ┌──────────────┐
        │  Web App     │         │  Mobile App  │
        └──────┬───────┘         └──────┬───────┘
               │                        │
               └──────┐         ┌───────┘
                      ▼         ▼
                 ┌────────────────────┐
                 │  Auth Gateway      │ ← JWT 校验 / refresh / 登出广播
                 └─────────┬──────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌─────────┐  ┌────────┐  ┌──────────────┐
         │ Issuer  │  │ Redis  │  │ Audit Logger │
         │ (JWT)   │  │(session│  │  (kafka)     │
         └─────────┘  │  set)  │  └──────────────┘
                      └────────┘
```

新增模块：`Auth Gateway`（替换原 cookie middleware）、`Issuer`（独立 JWT 签发服务）、`Audit Logger`（接 Kafka topic `auth.events`）。
修改模块：原 `session-store` 模块下沉为 Redis 客户端封装。
外部依赖：Redis 7+（已有 cluster）、Kafka（已有 broker）。

## 关键决策

### ADR-1 · 选用 JWT + refresh token 的双 token 鉴权方案
- **背景**：源自 `prd.md#核心需求 US-1/US-2`，需要跨端登录态共享与 ≤30s 同步登出。
- **选定方案**：access token (JWT, 15min TTL) + refresh token (opaque, 30d TTL, 存 Redis 可吊销)。
- **备选方案**：
  - 纯 session ID + Redis（当前方案的演进版本）— 拒绝理由：跨域 cookie 限制导致移动 App 无法直接复用浏览器 session；改动会更大。
  - 长期 JWT（24h TTL）无 refresh — 拒绝理由：吊销延迟最长 24h，违反 AC-2 的 30s 同步登出。
- **影响**：所有需要鉴权的端点必须改为读 `Authorization: Bearer`；移动 App SDK 需新增 token 刷新逻辑；现有 cookie 方案保留 30 天作为兼容层。

### ADR-2 · Session 存储采用 Redis 而非内存
- **背景**：refresh token 需要可吊销 + 跨实例共享。
- **选定方案**：Redis Hash，key = `user:<uid>:sessions`，field = `<device_id>`，value = `{refresh_token_hash, expires_at, last_used_at}`。
- **备选方案**：
  - 关系型数据库 — 拒绝理由：高频读写场景下延迟与 IOPS 不优于 Redis。
  - 内存 + 跨实例广播 — 拒绝理由：单点故障会丢全部 session，恢复成本高。
- **影响**：依赖现有 Redis cluster；新增对 Redis 可用性的 SLO 要求（≥99.95%）。

## 数据流

登录：`Web/App → Auth Gateway → Issuer (签发 access + refresh) → Audit Logger (异步) → 写 Redis (存 refresh) → 返回 token 对`

刷新：`Web/App → Auth Gateway → 验证 refresh → Issuer 签发新 access → 旋转 refresh → 写 Redis → Audit Logger → 返回新 token 对`

登出：`Web/App → Auth Gateway → 删除 Redis 中对应 device 的 refresh → Audit Logger → 广播失效事件（Pub/Sub）→ 其他设备下次请求时检测失效`

数据库改动：新增 Redis Hash schema（非关系型，无需迁移）；新增 Kafka topic `auth.events`（含 schema 文档，向前兼容方式扩展）。

## PRD 映射

| PRD 章节/AC | 本设计对应位置 | 备注 |
|------------|---------------|------|
| US-1 / AC-1 | refresh token 30d TTL + 自动续期流程 | Web 关闭浏览器后 access 过期，下次访问用 refresh 续期 |
| US-2 / AC-2 | 登出广播 + Redis 立即删除 + 其他设备下次校验失败 | 30s 来自 access 15min 内剩余的最差情况（实际 ≤15min；改进项见下方） |
| US-3 / AC-3 | Auth Gateway 提供 `DELETE /v1/sessions/by-user` 端点 | 强制清空 Redis 该用户全部 sessions |
| US-4 / AC-4 | Audit Logger 接 Kafka topic `auth.events` | 含 user_id / device_id / issued_at / expires_at 四字段 |
