# Go：错误、Context 与并发

## Error

- error 是普通返回值；调用者检查并处理，不用 panic 表达可预期失败。
- 使用 `%w` 包装保留 cause；`errors.Is/As` 检查语义，不依赖字符串匹配。
- sentinel、typed error 和 opaque error 依据调用者真正需要的分支选择。
- 增加操作/对象上下文但避免每层重复同一信息。
- 只记录一次；库通常返回，应用边界决定日志/协议/退出码。
- panic 仅用于无法继续的不变量或程序员错误；服务边界 recovery 不得假装状态仍安全。

## Context

- `context.Context` 作为第一个参数传入请求范围函数；不存入 struct，不传 nil。
- 不用 context 传普通可选参数；value 只承载请求范围、跨 API 边界的数据。
- 派生 context 的 cancel function 必须调用；deadline/cancellation 传播到 I/O 和 goroutine。
- 不在后台工作中盲目继承已取消 request context；显式定义任务 owner 和生命周期。

## Goroutine 与 Channel

- 每个 goroutine 的启动点能说明何时退出、谁等待、如何取消、错误去向。
- 不启动 fire-and-forget goroutine，除非由进程级 supervisor 管理并可观测。
- channel ownership 和 close 责任清楚；通常由发送方/拥有方关闭，不靠 receiver 猜测。
- buffered channel 容量是 backpressure 设计，不是掩盖死锁的补丁。
- `select` 处理取消、关闭和默认分支；避免 busy loop。
- shared map/state 使用 mutex、channel ownership 或 immutable snapshot；规则基于简洁和测量。

## 资源与 Shutdown

- HTTP body、file、rows、ticker、listener、server、worker pool 都关闭；处理 close error 的业务意义。
- server shutdown 定义停止接收、等待 in-flight、deadline 和强制终止。
- `sync.Once`、WaitGroup、errgroup 等只在语义匹配时使用；Add/Wait 生命周期可证明。

## 官方依据

- [Go `context` package](https://pkg.go.dev/context)
- [Go Code Review Comments: Goroutine Lifetimes](https://go.dev/wiki/CodeReviewComments#goroutine-lifetimes)
- [Go errors](https://go.dev/blog/go1.13-errors)
