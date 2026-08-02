# 函数、异步、错误与资源生命周期

## 函数职责

函数应只处理一个可命名职责和一个抽象层级。软性目标：

- 普通函数尽量不超过约 40 行。
- 编排函数尽量不超过约 60 行。
- 嵌套通常不超过三层。
- 参数超过三个时考虑参数对象。

这些数字用于触发审查，不是机械拆分标准。

## 提前返回

使用 Guard Clause 减少嵌套：

```ts
function processSession(session: Session | undefined): Result {
  if (!session) {
    return emptyResult
  }

  if (!session.isActive || !session.userId) {
    return emptyResult
  }

  return createResult(session)
}
```

## 参数对象

长参数列表或布尔参数应改为具名选项：

```ts
type CreateSessionOptions = {
  userId: string
  timeoutMs: number
  persistence: 'memory' | 'disk'
  logger: Logger
}
```

避免 `createSession(id, true, false)`。

## 纯逻辑和副作用分离

建议分离：

- 解析。
- 验证。
- 领域决策。
- 数据持久化。
- 流程编排。

纯逻辑不读取隐藏全局状态、不修改输入、不直接访问网络、磁盘、时钟或随机源。将这些依赖作为参数或端口注入。

## Promise 必须有归宿

所有 Promise 必须被 `await`、`return`、显式收集，或用 `void` 明确表示有意脱离当前流程，并自行处理错误：

```ts
void refreshCache().catch((error: unknown) => {
  logger.error('Failed to refresh cache', { error })
})
```

## 并发

只有相互独立的任务才使用 `Promise.all`。有顺序、共享副作用、速率限制或资源约束时，使用顺序执行、队列或并发限制器。

不要无界并发处理大型输入集合。

## 取消与超时

网络、子进程、文件监听、Worker 和长任务应考虑：

- `AbortSignal`。
- 明确超时。
- 清理路径。
- 可识别的取消错误。
- 超时后底层资源是否真正停止。

## 重试

重试策略必须定义：

- 最大次数。
- 退避和抖动。
- 可重试错误范围。
- 幂等性。
- 最终失败的记录与反馈。

不能对所有错误无限重试。

## 错误处理

不得吞掉异常。允许忽略时必须说明这是最佳努力操作，并保留必要诊断信息。

错误应包含上下文并保留 `cause`：

```ts
throw new Error(`Failed to load workspace config: ${configPath}`, {
  cause: error
})
```

需要调用方分支处理的错误使用：

- 具名错误类。
- 带 `code` 的结构化错误。
- `Result<T, E>`。
- 可辨识联合。

不要通过匹配错误消息字符串控制流程。

## `catch` 值

将 `catch` 值视为 `unknown`，先通过 `instanceof`、错误守卫或标准化函数收窄。

## 资源清理

以下资源必须有明确生命周期：

- 事件监听器。
- Timer 和 Interval。
- 文件句柄。
- Socket、数据库连接。
- Worker 和子进程。
- `AbortController`。
- React Effect 订阅。

推荐返回清理函数或实现统一 `dispose()`：

```ts
type Disposable = {
  dispose(): void
}
```

创建资源的模块通常也应负责定义或暴露其清理方式。
