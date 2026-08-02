# 类型建模示例

## 状态机

不推荐：

```ts
type RequestState = {
  isLoading: boolean
  hasError: boolean
  data?: Data
  error?: Error
}
```

推荐：

```ts
type RequestState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; data: Data }
  | { kind: 'failure'; error: Error }
```

## 外部边界

```ts
export function parseWorkspaceMessage(input: unknown): WorkspaceMessage {
  return workspaceMessageSchema.parse(input)
}
```

内部代码只接收已经验证的 `WorkspaceMessage`。

## `satisfies`

```ts
const routes = {
  home: '/',
  settings: '/settings'
} satisfies Record<string, `/${string}`>
```

保留具体字面量，同时验证整体契约。

## 结果类型

```ts
type Result<TValue, TError> =
  | { ok: true; value: TValue }
  | { ok: false; error: TError }
```

适合调用方需要显式分支、失败属于正常业务结果的场景。不可恢复的程序错误仍可抛异常。

## 单位类型

高风险领域可使用品牌类型避免单位混用：

```ts
type Milliseconds = number & { readonly __brand: 'Milliseconds' }
type Bytes = number & { readonly __brand: 'Bytes' }
```

仅在实际能降低错误且不会制造大量转换噪声时采用。
