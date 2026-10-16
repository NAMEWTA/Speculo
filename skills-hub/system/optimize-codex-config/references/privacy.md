# local-private 隐私策略

目标是关闭非必要外部行为，不破坏本地保护。来源与核验日期见 [sources](sources.md)。所有键仅在安装版本和作用域证据齐备后写入；关闭遥测不改变账号训练选择、服务端保留条款或正常模型调用。

## Codex

`check_for_update_on_startup=false`；`features.remote_plugin=false`；`analytics.enabled=false`；`feedback.enabled=false`。OpenTelemetry 的 `exporter`、`trace_exporter`、`metrics_exporter` 全部为 `"none"`，`log_user_prompt=false`。不能漏掉单独的 metrics exporter，也不能把不存在的键假设为已关闭。

已有 exporter 是表时先用 AST 迁移为合法值，不追加冲突键。未知 provider、MCP、hooks、profiles 不清理；保留不等于确认其没有外部行为。

## Claude

写入 settings 的 `env`，不修改进程环境、shell profile 或系统变量：

| 环境变量 | 目标 |
|---|---|
| CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC | `1` |
| DISABLE_TELEMETRY / DISABLE_ERROR_REPORTING | `1` |
| DISABLE_FEEDBACK_COMMAND / CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY | `1` |
| CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL | `1` |
| DISABLE_AUTOUPDATER | `1` |
| FORCE_AUTOUPDATE_PLUGINS | `0` |
| CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY | `0` |
| CLAUDE_CODE_ENABLE_TELEMETRY | `0` |
| CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL | `0` |

继承环境与更高配置层可能冲突，因此同时检查具名环境变量但只报告存在性及是否符合策略，不打印值。`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` 与 `DISABLE_TELEMETRY` 按非空判断：`"0"`、`"false"` 仍表示禁用。不能把所有变量套用同一布尔解析。

`skipWebFetchPreflight=true` 跳过向 Anthropic 发送目标 hostname 的外部预检；代价是不再查询其域名 blocklist。保留工具审批、沙箱、TLS 校验和本地边界。总开关也可能使 Remote Control、跨会话消息等依赖远端功能旗标的功能不可用，应在确认包中说明。

## 不自动启用的行为

不做服务健康请求、外部额度轮询、反向代理探测、凭据抓取、自动插件安装、在线成本价格刷新或远程仪表盘上报。状态栏只使用宿主 stdin／原生界面，不触发额外模型调用。

不通过 `disableAllHooks=true` 简化隐私策略：它还会禁用 Claude 自定义状态栏，也可能移除本地安全／格式化流程。已有值为 true 时报告冲突，不自动打开。ConfigChange hooks、MCP、apiKeyHelper、policyHelper、插件及自定义回调都不能在只读体检中执行。未知集成保留并标记未验证；应用隐私键后不得宣称整个客户端已经“绝对零出网”。

使用不含 NODE_OPTIONS 预加载的可信 Node 环境。脚本不能撤销在它启动之前由恶意启动器执行的代码；继承 NODE_OPTIONS 时计划阻断，不能偷偷修改全局环境消除提示。

## 测试和保证范围

默认 doctor/plan 的运行时 API 拦截测试禁止网络、DNS、子进程、写文件和凭据／会话内容读取；被捕获的禁止调用仍使测试失败。它证明测试输入下未触发这些 API，不是宿主操作系统防火墙、供应商承诺或任何未知插件的安全认证。维护期获取固定依赖、公开文档研究和 CI 拉取源码与技能日常运行的零网络边界分别记录。
