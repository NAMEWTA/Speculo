# Rust：错误、所有权与并发

## Error

- library 返回结构化 error，application 边界决定展示、日志和退出码。
- `Result` 的 error type 表达调用者需要的分类；动态 error/context 只在应用编排或插件边界使用。
- `?` 传播同时保留足够上下文；不要每层重复相同消息。
- `unwrap`/`expect` 仅用于已证明不变量、测试或不可恢复初始化；`expect` 说明为何不可能失败。
- panic 不跨 FFI/线程/任务边界泄漏，除非 contract 明确处理。

## 所有权与资源

- RAII owner 明确；Drop 不执行可能 panic 的复杂业务逻辑。
- 锁 guard、文件、连接、transaction、临时目录和子进程的持有范围最小。
- async 代码不跨 `.await` 持有非必要锁/borrow；阻塞 I/O 不运行在 async executor worker 上。
- cancellation safety 明确：future 被 drop 时是否会留下部分写入、锁或协议状态。

## 并发与 Async

- thread/task 有 owner、join/abort/shutdown 和 error propagation。
- `Send`/`Sync` bound 是 API contract，不用 unsafe 强制实现掩盖状态。
- channel 容量与 backpressure 明确；无界 channel 需要负载证明和保护。
- shared state 选择 message passing、mutex/rwlock/atomics 的最简单正确模型；原子 ordering 有注释和测试/模型依据。
- async runtime、timer、I/O trait 和测试工具遵循项目既有 runtime，不混合运行时。
- 超时和取消在调用边界定义；spawned task 不继承无法满足的借用/请求生命周期。

## FFI

- ABI、layout、ownership、allocator、nullability、threading 和 unwind contract 明确；
- 输入在 safe boundary 验证；
- resource free function 与 error mapping 有集成测试。

## 官方依据

- [The Rust Programming Language: error handling](https://doc.rust-lang.org/book/ch09-00-error-handling.html)
- [Async Book](https://rust-lang.github.io/async-book/)
- [Rustonomicon FFI](https://doc.rust-lang.org/nomicon/ffi.html)
