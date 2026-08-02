# 文件、目录与标识符命名

## 文件名必须具体

这是固定默认原则。文件名应表达“领域 + 职责”，使搜索结果和代码评审无需打开文件即可理解用途。

推荐：

- `user-session-store.ts`
- `payment-retry-policy.ts`
- `terminal-output-parser.ts`
- `github-auth-client.ts`
- `workspace-path-validator.ts`

默认禁止把不相关能力堆进：

- `utils.ts`
- `helpers.ts`
- `common.ts`
- `misc.ts`
- `general.ts`
- `manager.ts`
- `processor.ts`
- `handler.ts`
- 全局 `types.ts`
- 全局 `constants.ts`

父目录已经提供完整语义时，局部 `types.ts` 可以作为兼容例外；仍优先考虑可搜索的具体名称。

## 默认命名

项目生成时必须结合仓库事实确认，常用基线为：

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

生成器或框架管理的文件可保留其约定，必须在项目规范中标出适用范围。

## 职责后缀

- `-service`：完整应用能力，不得成为万能类。
- `-repository`：领域对象的持久化抽象。
- `-client`：外部 HTTP、RPC 或 SDK 客户端。
- `-adapter`：接口或模型适配。
- `-gateway`：外部系统或资源边界。
- `-store`：状态保存和更新。
- `-selector`：状态派生。
- `-policy`：可替换业务决策。
- `-validator`：验证输入。
- `-parser` / `-serializer`：格式转换。
- `-mapper`：明确模型之间映射。
- `-factory`：复杂对象或依赖图构造。
- `-registry`：实现注册和查找。
- `-scheduler`：任务调度。
- `-coordinator`：多个流程协调。
- `-contract`：跨模块、跨进程或公开 API 契约。

后缀不能替代领域信息。单独的 `service.ts` 仍然模糊。

## 标识符

- 变量、函数、方法：`camelCase`。
- 类型、类、组件：`PascalCase`。
- 真正常量：`SCREAMING_SNAKE_CASE`。
- 私有字段：`#field` 或 `private`，不加无意义 `_`。
- Hook：`useXxx`。
- 事件属性：`onXxx`。
- 内部事件处理：`handleXxx`。
- 泛型：简单时 `T`，复杂时 `TResult`、`TContext`。

## 布尔与单位

布尔值优先：`isConnected`、`hasAccess`、`canRetry`、`shouldPersist`。

数值名称包含单位或语义：

```ts
const timeoutMs = 30_000
const payloadSizeBytes = 1_024
const retryCount = 3
```

避免 `flag`、`data`、`info`、`obj`、`temp` 等无信息名称。
