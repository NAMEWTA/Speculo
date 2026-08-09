# Codex Provider Troubleshooting

当 Codex 出现 HTTP 状态码、SSE、超时或 compaction 故障时完整应用本手册。官方事实分别来自 [Configuration Reference](https://learn.chatgpt.com/docs/config-file/config-reference)、[Authentication](https://learn.chatgpt.com/docs/auth) 和 [Compaction](https://developers.openai.com/api/docs/guides/compaction)。

## 1. 证据梯度

按以下顺序收集并停止在能够唯一归因的位置：

1. 已安装 Codex 版本、active provider、认证模式和配置加载结果；
2. 错误状态、响应 content type、代理签名和最终 path 的脱敏形态；
3. 错误前最近一次 `last_token_usage` 与 `model_context_window`；
4. 同一接口的最小 Responses 请求、SSE 行为和重试一致性；
5. 只有具备服务器权限时才查看反向代理与上游日志。

报告原始事实和推断的边界。不得用接口 URL、API key、提示词或工具输出充当证据附件。

## 2. 状态路由

| 症状 | 主要归属 | 首要检查 | 无效做法 |
|---|---|---|---|
| 401 | 认证 | provider 选择、认证路线、header 格式、key 是否属于该服务 | 增加 HTTP 重试 |
| 403 | 授权或策略 | 模型权限、账户策略、代理 ACL、来源限制 | 重写 prompt |
| 404 | endpoint / wire API | `base_url`、最终 `/responses` path、是否错误叠加 `/v1`、Responses 兼容性 | 更换 reasoning effort |
| 413 | 供应商或网关，待证据归因 | 响应类型、HTML/Server header、请求体边界、代理 location 继承 | 提高模型上下文或反复重试 |
| 429 | 服务限流 | RPM/TPM、并发 Agent、retry-after、账户额度 | 无限并发重试 |
| SSE 中断 | 流式传输 | content type、代理 buffering、idle timeout、上游心跳 | 把稳定 4xx 当瞬时网络错误 |
| 超时 | 客户端、代理或模型 | 发生阶段、首 token 时间、idle/total timeout、服务日志 | 同时扩大所有 timeout |

## 3. 413 与 remote compact

Standalone compaction 会发送完整上下文窗口；长会话因此可能产生远大于普通请求的 JSON body。`/responses/compact` 返回的窗口是后续请求的权威上下文，不应自行裁剪。

自动审计只有在 413 响应带有 Nginx、Envoy、HAProxy、Cloudflare、Varnish 等明确代理签名时，才把主要归属标为 `external_proxy_body_limit`。供应商 JSON 413 或没有代理签名的响应保持 `request_body_limit_unattributed`，不得直接交接给代理管理员。

满足以下证据时，才把代理限制标记为已确认并完成服务器交接：

- Codex 报告 remote compact 或 `/responses` 请求返回 413；
- 响应是 Nginx 等代理生成的 HTML，而不是模型服务 JSON；
- 较小请求能进入上游，超过稳定字节边界后始终 413。

Nginx 的 `client_max_body_size` 默认是 `1m`。只有实测边界或 `nginx -T` 能证明配置时，才把“1 MiB”写成确定结论；否则写成最可能原因。

本机临时缓解按优先级为：

1. 生成脱敏 handoff 后开启新会话；
2. 依据失败时 token 规模试验性降低 `model_auto_compact_token_limit`，并说明压缩频率、成本和上下文质量代价；
3. 仅当当前 `codex features list` 确认该 feature 存在时，临时关闭 `remote_compaction_v2` 作为诊断，并验证本地压缩是否可用。

不得把 `model_context_window` 改成 API 模型网页的最大值来解决 413；更晚触发压缩通常会制造更大的 body。

服务器交接建议包含：在实际命中的 `server` 或 `/responses` location 设置足够的 `client_max_body_size`（当前约 272k Codex 上下文可从 `32m` 起步）、用 `nginx -T` 确认继承、`nginx -t` 校验并平滑 reload。SSE 仍异常时再单独检查 buffering 与 timeout。Skill 只交接，不执行这些服务器动作。

## 4. Compaction 判定

- 以 `codex debug models --bundled` 的 active model 窗口为本机事实，不从 API 产品页反推 Codex 客户端阈值。
- `total_token_usage` 是会话累计量；诊断某次失败应使用此前最近一次 `last_token_usage`。
- `model_auto_compact_token_limit` 未设置时使用模型默认；`total` 与 `body_after_prefix` 的计数语义不同，变更时必须记录原值。
- 远程压缩失败但普通请求成功，优先比较 body 大小、compact 能力和代理路径，不重新认证全部配置。

## 5. SSE 与超时

先确认响应是 `text/event-stream` 且事件格式与 Responses API 兼容。把“连接前超时”“首 token 超时”“流式 idle 超时”分开记录；只调整命中的那一层。

`stream_idle_timeout_ms` 和 `stream_max_retries` 属于 provider 设置。代理层需要管理员核对 streaming buffering、read timeout 和连接关闭行为；本机重试仅适用于已证明的瞬时中断。

## 6. 交付格式

每个故障报告固定包含：

```text
classification: <local_config|authentication|provider_contract|external_proxy|upstream_service>
evidence: <status, content type/proxy signature, token metadata, reproducible boundary>
local_action: <none or confirmed mitigation>
tradeoff: <quality/cost/frequency/security impact>
external_handoff: <owner, exact check, success condition>
verification: <command, exit code, redacted result>
```

只有证据支持的层级可以标记为已解决；其余保持 blocker 或 unknown。
