# 文件、目录与标识符命名

## 默认命名

| 对象 | 默认规则 | 示例 |
|---|---|---|
| 目录 | `kebab-case` | `user-auth/` |
| 普通 TypeScript 文件 | `kebab-case.ts` | `session-expiration-policy.ts` |
| React 业务组件 | `PascalCase.tsx` | `SessionExpiredDialog.tsx` |
| Hook | `use-*.ts` / `use-*.tsx` | `use-session-timeout.ts` |
| 单元测试 | 源文件名 + `.test` | `login-service.test.ts` |
| 集成测试 | `.integration.test` | `payment-flow.integration.test.ts` |
| E2E | `.e2e.spec` | `checkout.e2e.spec.ts` |
| 声明文件 | 环境或能力名 | `electron-api.d.ts` |
| 工程脚本 | 动宾结构 | `generate-icons.ts` |

若仓库已统一使用 `kebab-case.tsx` 组件文件，应保持一致。不要在同一领域混用两种组件文件命名。

## 文件名表达领域和职责

推荐结构：

```text
<domain>-<responsibility>.ts
```

例如：

- `user-session-store.ts`
- `payment-retry-policy.ts`
- `terminal-output-parser.ts`
- `github-auth-client.ts`
- `workspace-path-validator.ts`

## 职责后缀

- `-service`：完成一个应用能力；不得成为万能类。
- `-repository`：领域对象的持久化抽象。
- `-client`：调用外部 HTTP、RPC 或 SDK。
- `-adapter`：在两个接口或模型间适配。
- `-gateway`：外部系统或资源边界。
- `-store`：状态存储与更新。
- `-selector`：从状态中派生数据。
- `-policy`：可替换的业务决策。
- `-validator`：校验并返回结果或错误。
- `-parser`：把外部格式转换为结构化数据。
- `-serializer`：把结构化数据转换为外部格式。
- `-mapper`：在两个明确模型之间映射。
- `-factory`：构造复杂对象或依赖图。
- `-registry`：注册和查找一组实现。
- `-scheduler`：计划或调度任务。
- `-coordinator`：协调多个独立流程。
- `-contract`：跨模块、跨进程或公开 API 契约。

后缀不能替代领域信息。单独的 `service.ts`、`handler.ts`、`manager.ts` 仍然模糊。

## 默认禁止的模糊名称

- `utils.ts`
- `helpers.ts`
- `common.ts`
- `misc.ts`
- `general.ts`
- `data.ts`
- `manager.ts`
- `processor.ts`
- `handler.ts`
- 全局 `types.ts`
- 全局 `constants.ts`

若父目录已提供完整语义，局部 `types.ts` 或 `constants.ts` 可以存在，但更推荐 `payment-types.ts`、`terminal-constants.ts` 等可搜索名称。

## 标识符

| 对象 | 规则 |
|---|---|
| 变量、函数、方法 | `camelCase` |
| 类型、类、组件 | `PascalCase` |
| 常量 | 真正全局稳定值用 `SCREAMING_SNAKE_CASE` |
| 私有字段 | 使用 `#field` 或普通 `private`，不加 `_` 前缀 |
| Hook | `useXxx` |
| 事件属性 | `onXxx` |
| 内部事件处理函数 | `handleXxx` |
| 泛型 | 简单时 `T`，复杂时 `TResult`、`TContext` |

## 布尔命名

优先使用：

- `isConnected`
- `hasPendingChanges`
- `canRetry`
- `shouldPersist`
- `didTimeout`
- `willReconnect`

避免 `flag`、`enabled`、`notDisabled`、`isNotInvalid` 等含义弱或双重否定名称。

## 单位进入名称

数值变量必须尽量包含单位或语义：

```ts
const timeoutMs = 30_000
const payloadSizeBytes = 1_024
const retryCount = 3
const pageOffset = 20
```

## 避免无信息变量

除极短循环或数学表达式外，避免 `obj`、`data`、`info`、`value`、`result`、`temp`。使用角色名称：

- `parsedPayload`
- `validationResult`
- `pendingSession`
- `persistedWorkspace`
