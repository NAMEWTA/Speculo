# 命名示例

## 从模糊名称改为具体名称

| 模糊 | 推荐 |
|---|---|
| `utils.ts` | `shell-command-quote.ts` |
| `helpers.ts` | `workspace-path-normalize.ts` |
| `manager.ts` | `terminal-process-registry.ts` |
| `handler.ts` | `payment-webhook-handler.ts` |
| `service.ts` | `user-session-service.ts` |
| `data.ts` | `workspace-summary.ts` |
| `types.ts` | `payment-contract.ts` |
| `constants.ts` | `terminal-limits.ts` |

## 函数

| 含义弱 | 推荐 |
|---|---|
| `handle()` | `handleWorkspaceClosed()` |
| `process()` | `parseTerminalOutput()` |
| `check()` | `validateWorkspacePath()` |
| `getData()` | `loadUserProfile()` |
| `doRetry()` | `retryPaymentCapture()` |

## 布尔值

| 含义弱 | 推荐 |
|---|---|
| `flag` | `shouldPersist` |
| `enabled` | `isTelemetryEnabled` |
| `valid` | `isWorkspacePathValid` |
| `notReady` | `isInitializing` 或 `isReady` |

## 单位

| 含义弱 | 推荐 |
|---|---|
| `timeout` | `timeoutMs` |
| `size` | `payloadSizeBytes` |
| `delay` | `retryDelayMs` |
| `limit` | `pageSizeLimit` |
