# Codex Configuration Contract

在设计或修改 `config.toml`、`auth.json`、模型供应商、权限、Agent、MCP、Hook 或历史配置时完整应用本契约。配置键会随 Codex 版本变化；以已安装 CLI 和当前 [Configuration Reference](https://learn.chatgpt.com/docs/config-file/config-reference) 为最终事实源。

## 1. 配置归属与事实优先级

1. 用户级配置位于 `$CODEX_HOME/config.toml`；profile 文件位于同一目录并通过 `--profile` 选择。
2. 受信任项目可以使用 `.codex/config.toml` 覆盖项目设置，但 provider、auth、host metadata、通知、profile 选择和 telemetry 等机器级键会被忽略，必须留在用户级配置。
3. 先读取现有配置、`codex doctor --json`、`codex features list` 和 `codex debug models --bundled`，再核对当前官方参考。API 模型网页上的最大上下文不是本机 Codex 目录的替代品。
4. 只更改与目标直接相关的键。MCP、Hook、profile、插件、历史兼容项和未知集成默认原样保留，直到有证据证明无效且用户确认删除。

## 2. 模型与推理

- 从已安装模型目录选择 model，并确认所选 reasoning effort 受支持。常规工作可以从 `medium` 或现有值开始；`high`、`xhigh` 和更高等级只在质量收益能够覆盖延迟与成本时采用。
- `plan_mode_reasoning_effort` 独立于普通 `model_reasoning_effort`；未设置时使用 Codex 内置 Plan preset。
- 仅在自定义模型目录确实需要时设置 `model_context_window`。不得为了绕过 compaction 或代理限制而夸大它。
- `model_auto_compact_token_limit` 是触发阈值，不是服务端请求体限制。降低它会更早、更频繁地压缩，并可能改变成本和上下文质量。
- `model_auto_compact_token_limit_scope` 默认是 `total`；只有理解 carried prefix 行为后才选择 `body_after_prefix`。

## 3. 第三方 Responses 供应商

Codex 当前自定义供应商只支持 `responses` wire API。供应商必须兼容 Codex 实际使用的 Responses 请求、SSE 输出、工具项和 compaction 路径；仅兼容 Chat Completions 不够。

使用存储在 `auth.json` 的 OpenAI-style API key 时，可以采用：

```toml
model = "gpt-5.6-sol"
model_provider = "third-party"
model_reasoning_effort = "high"
plan_mode_reasoning_effort = "xhigh"
cli_auth_credentials_store = "file"

[model_providers.third-party]
name = "Third Party Responses"
base_url = "https://relay.example/api-root"
wire_api = "responses"
requires_openai_auth = true
```

`base_url` 必须是供应商声明的 API root。先确认 Codex 最终请求路径，不能机械添加或删除 `/v1`。生产连接优先 HTTPS；HTTP 会在主机到中转之间明文传输凭据和内容。

供应商使用独立环境变量时改用：

```toml
[model_providers.third-party]
name = "Third Party Responses"
base_url = "https://relay.example/api-root"
wire_api = "responses"
env_key = "THIRD_PARTY_API_KEY"
```

动态 token 可以使用 `[model_providers.<id>.auth]` 下的 command、args、cwd、timeout 和 refresh interval。`auth`、`env_key`、`experimental_bearer_token` 与 `requires_openai_auth` 是互斥认证路线；每个供应商只保留一条。

仅在证据要求时调整 `request_max_retries`、`stream_max_retries` 或 `stream_idle_timeout_ms`。重试不能修复稳定的 401、403、404 或 413。

## 4. 认证存储

- `cli_auth_credentials_store = "file"` 正式选择 `$CODEX_HOME/auth.json`；`keyring` 选择系统钥匙串；`auto` 由 Codex 决定。三者是偏好，不是安全等级排序。
- 文件模式下，验证 `auth.json` 是普通文件、权限为 `0600` 且 `codex doctor --json` 报告认证可用。不要读取、打印、diff 或记录其中的 key。
- 保留已安装 Codex 创建并验证过的 JSON schema。需要重新登录时优先通过 stdin 使用 `codex login --with-api-key`；手工修改只有在当前 schema 已被可靠确认时进行。
- 自定义 provider 的 command-backed token 和 `env_key` 不应同时把同一 secret 写入 `auth.json` 或 `config.toml`。

## 5. 权限、沙箱与网络

一个保守、可交互的本机基线是：

```toml
approval_policy = "on-request"
approvals_reviewer = "auto_review"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = false
```

这只是安全起点，不是固定默认。`approval_policy = "never"` 和 `sandbox_mode = "danger-full-access"` 适合用户明确接受风险的受控环境；不要通过 profile 名称暗示它们更安全。

`default_permissions` 与 `sandbox_mode` / `[sandbox_workspace_write]` 是两套选择，不能混合。网络访问只按实际工具需求开放；第三方模型请求由 Codex host 发出，不等同于给沙箱内命令开放任意网络。

## 6. Agent、MCP、Hook 与历史

Agent 配置先确认当前 CLI 支持的键：

```toml
[agents]
enabled = true
max_concurrent_threads_per_session = 4
default_subagent_model = "gpt-5.6-terra"
default_subagent_reasoning_effort = "medium"
```

并发数由 CPU、内存、供应商速率限制和成本共同决定。不要假定四个线程适合所有机器或接口。

- 对每个 MCP 逐项验证 command/path、启动、tool discovery 和审批策略；不因某个 MCP 失败而清理其他 MCP。
- Hook 按事件和集成所有者保留。两个 Hook 调用不同集成时不是重复；只有调用链、输入和副作用等价时才合并。
- `history.persistence` 和 `history.max_bytes` 由隐私、恢复需求和磁盘预算决定。修改前验证旧会话与数据库兼容。
- 审计期间 `config.toml` 指纹变化或目标文件存在已证明的可写句柄时，先关闭写入来源并重新审计；进程名本身不是 writer 证据。修改任务无法取得精确 writer 观测时保持 blocked，且不得覆盖竞争写入。

## 7. 确认包与写入契约

确认包必须列出当前值、目标值、理由、脱敏 diff、保留项、备份路径、验证和回滚。对每个 secret 只写 `<redacted>` 或“存在/不存在”。

确认后在目标目录创建权限正确的临时文件，完成 TOML/JSON 和 Codex 加载验证后原子 rename。写入前再次比较哈希、大小和 mtime；任一变化都使原确认失效。验证失败时恢复备份并重复验证，不留下部分应用状态。
