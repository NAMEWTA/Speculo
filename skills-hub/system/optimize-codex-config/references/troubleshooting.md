# AI CLI Configuration and Provider Troubleshooting

Codex 出现 HTTP 状态码、SSE、超时或 compaction 故障时，按症状读取相关部分。官方事实分别来自 [Configuration Reference](https://learn.chatgpt.com/docs/config-file/config-reference)、[Authentication](https://learn.chatgpt.com/docs/auth) 和 [Compaction](https://developers.openai.com/api/docs/guides/compaction)。

## 1. 证据梯度

按现有证据选择能缩小问题范围的检查，不要求每次完整收集：

1. 已安装 CLI 版本、实际配置来源、active provider、用户已提供的认证模式和配置加载证据；
2. 错误状态、响应 content type、代理签名和最终 path 的脱敏形态；
3. 错误前最近一次 `last_token_usage` 与 `model_context_window`；
4. 仅整理用户已有的同一接口 Responses/SSE 证据；不主动发起外部检测；
5. 服务端日志由具备权限的管理员提供脱敏结果，本技能只交接，不发起远端探测。

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

以下证据组合有助于确认代理限制；缺少关键证据时保留为假设：

- Codex 报告 remote compact 或 `/responses` 请求返回 413；
- 响应是 Nginx 等代理生成的 HTML，而不是模型服务 JSON；
- 较小请求能进入上游，超过稳定字节边界后始终 413。

Nginx 的 `client_max_body_size` 默认是 `1m`。只有实测边界或 `nginx -T` 能证明配置时，才把“1 MiB”写成确定结论；否则写成最可能原因。

本机临时缓解按优先级为：

1. 生成脱敏 handoff 后开启新会话；
2. 依据失败时 token 规模试验性降低 `model_auto_compact_token_limit`，并说明压缩频率、成本和上下文质量代价；
3. 仅当当前 `codex features list` 确认该 feature 存在时，临时关闭 `remote_compaction_v2` 作为诊断，并验证本地压缩是否可用。

不得把 `model_context_window` 改成 API 模型网页的最大值来解决 413；更晚触发压缩通常会制造更大的 body。

服务器侧应核对实际命中的 `server` 或 `/responses` location、有效 `client_max_body_size` 与失败请求的字节规模。容量依据实际负载及服务限制选择，不从 token 数直接换算固定 body 上限。管理员可用 `nginx -T` 核对继承、`nginx -t` 验证，再按其部署方式应用；SSE 仍异常时分别查 buffering 与 timeout。本技能的离线配置工具不执行服务器动作。

## 4. Compaction 判定

- 以已核验安装版本的本地模型目录为事实；`codex debug models --bundled` 仅在确认该命令存在、无外部副作用且在现有授权范围内时使用。不从 API 产品页反推客户端阈值。
- `total_token_usage` 是会话累计量；诊断某次失败应使用此前最近一次 `last_token_usage`。
- `model_auto_compact_token_limit` 未设置时使用模型默认；`total` 与 `body_after_prefix` 的计数语义不同，变更时必须记录原值。
- 远程压缩失败但普通请求成功，优先比较 body 大小、compact 能力和代理路径，不重新认证全部配置。

## 5. SSE 与超时

先确认响应是 `text/event-stream` 且事件格式与 Responses API 兼容。把“连接前超时”“首 token 超时”“流式 idle 超时”分开记录；只调整命中的那一层。

`stream_idle_timeout_ms` 和 `stream_max_retries` 属于 provider 设置。代理层需要管理员核对 streaming buffering、read timeout 和连接关闭行为；本机重试仅适用于已证明的瞬时中断。

## 6. 交付格式

简明说明观察到的错误、证据支持的归因、已做改变与代价，以及实际验证结果。需要外部管理员处理时给出目标层、具体检查和可判断的成功条件；无需另外生成固定交接表。只有证据支持的部分可以标记为已解决，其余明确说明仍未知或未验证。


## 7. Claude 与跨客户端故障

| 症状 | 本机检查 | 停止条件／边界 |
|---|---|---|
| 设置存在但无效 | settings.json/local、实际项目/worktree 根、继承 env、managed/CLI override | 不覆盖高优先级托管层，不执行 policyHelper |
| 状态栏不显示 | JSON 语法、绝对 Node/脚本路径、disableAllHooks、已有 callback | 不自动打开被用户禁用的 hooks |
| 额度显示 -- | 首次响应、字段支持、两个窗口独立缺失 | 不抓凭据，不假定账号类型，不发送额度请求 |
| invalid/stale | 输入类型、百分比范围、resets_at 秒、宿主是否提供新状态 | 不用费用或本地 token 猜余额 |
| 关闭遥测后功能消失 | 功能旗标依赖、Remote Control 等隐私代价 | 不悄悄重开遥测换功能 |
| 配置改完又恢复 | CC Switch/其他管理器所有权、配置文件竞争编辑 | 不接管数据库，先停止实际写入者再重新计划 |
| 损坏 TOML/JSON | 完整语法错误、重复键、父级类型冲突 | 不以空模板覆盖；保留原始文件和独立修复方案 |
| CLI 加载命令在旧版不存在 | 已安装 help/本地文档 | unsupported 与故障分开，不编造命令支持 |

统一退出结果见 [CLI 手册](cli.md)。网络、401/403/429 等外部证据不足保持 unknown；不因为本地静态验证通过就声称远端故障已修复。
