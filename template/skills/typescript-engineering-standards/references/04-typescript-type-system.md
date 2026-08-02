# TypeScript 类型系统规范

## 严格模式

新项目必须启用 `strict`。建议逐步启用：

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

具体选项需与编译器版本、模块系统和构建工具兼容。

## 禁止传播 `any`

外部或未知值使用 `unknown`，在边界收窄：

```ts
function parsePayload(input: unknown): ParsedPayload {
  return payloadSchema.parse(input)
}
```

`any` 只允许存在于极小的兼容层，例如第三方类型错误或遗留迁移，并必须：

- 限定最小作用域。
- 写明原因与退出条件。
- 经过运行时验证后再向内部传递。
- 不进入公共 API。

## 外部输入必须验证

以下数据默认不可信：

- HTTP、RPC、WebSocket、IPC 消息。
- CLI 参数和环境变量。
- JSON、数据库反序列化、本地存储。
- 第三方 SDK 返回值。
- 浏览器消息和插件输入。

类型断言不是验证：

```ts
// 错误
const config = JSON.parse(raw) as AppConfig

// 正确
const config = appConfigSchema.parse(JSON.parse(raw))
```

## 可辨识联合

使用单一判别字段表达互斥状态：

```ts
type ConnectionState =
  | { kind: 'idle' }
  | { kind: 'connecting'; startedAtMs: number }
  | { kind: 'connected'; connectionId: string }
  | { kind: 'failed'; error: Error }
```

避免多个可能互相矛盾的布尔字段。对状态分支执行穷尽检查；需要 `default` 时使用 `never` 断言。

## `type` 与 `interface`

默认策略可选择其一并保持一致。推荐默认使用 `type`，以下场景使用 `interface`：

- 需要声明合并。
- 公共库希望消费者扩展契约。
- 面向对象体系明确使用 `implements`。
- 框架生态已有强约定。

不要在同一领域无理由混用。

## 显式类型和推断

必须显式标注：

- 导出函数返回类型。
- 跨模块公共 API。
- 插件、回调和扩展点。
- 递归函数。
- 权限、金额、状态转换等高风险函数。

局部明显变量和短小私有函数可依赖推断。

## 类型断言

优先顺序：

1. 控制流收窄。
2. 类型守卫。
3. 运行时 Schema 验证。
4. `satisfies`。
5. 最后才使用 `as`。

禁止无理由双重断言：

```ts
value as unknown as UserSession
```

`@ts-ignore` 默认禁止。必须压制已知编译错误时，优先使用带原因的 `@ts-expect-error`，使错误消失后检查能够失败。

## 空值语义

明确区分：

- `property?: T`：属性可能不存在。
- `property: T | null`：属性存在，但值可以为空。
- `T | undefined`：查找可能没有结果。
- `Result<T, E>` 或异常：操作可能失败。

除非外部协议明确区分，不要写 `property?: T | null | undefined`。

## `.d.ts`

`.d.ts` 仅用于：

- 运行时已有但 TypeScript 不可见的全局声明。
- 无类型第三方模块声明。
- 框架或库声明扩展。
- 发布库生成的公共声明。

普通业务类型放在 `.ts` 中，通过正常模块导入。

## 枚举

默认优先字符串联合或 `as const` 对象。`enum` 主要用于外部协议、位标记、既有 API 或团队明确统一的运行时枚举需求。

## 不可变性

- 输入参数尽量使用只读结构。
- 对外返回 `ReadonlyArray<T>` 或只读对象。
- 不修改调用方传入对象。
- 需要排序或变更时先复制。
- 常量对象使用 `as const` 或 `satisfies`。
