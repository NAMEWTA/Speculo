# TypeScript / JavaScript：函数、异步、错误与资源

## 函数合同

- 参数表达必需输入；可选项较多或布尔组合复杂时使用具名 options。
- 纯计算与 I/O、状态变更、日志和框架生命周期分离。
- callback、Promise、stream、iterator 和 event emitter 的失败与取消语义清楚。
- public function 的返回类型在有助于稳定 API 时显式声明；局部实现优先可靠推断。

## Promise 与取消

- 不遗留 floating Promise；明确 `await`、return、批量等待或有监督的后台任务。
- 并发批处理定义最大并发度、失败策略、顺序需求和部分成功语义。
- 支持取消的 I/O 优先传播 `AbortSignal`；超时由调用边界定义并保留原始 cause。
- 忽略过期响应、组件卸载后的写入和竞争覆盖；请求所有者负责清理。
- `Promise.all`、`allSettled`、race 等按失败合同选择，不为简短牺牲语义。

## Error

- 抛出/返回 `Error` 或项目定义错误类型，而不是裸字符串。
- catch 变量视为 `unknown`；只在能恢复、映射或增加边界上下文时捕获。
- 使用 `cause` 或项目现有机制保留原始错误。
- 日志、用户消息、HTTP/CLI 错误码分离；不重复在每一层记录同一错误。
- Node callback、event emitter `error`、stream 和 process rejection 都有明确处理边界。

## 资源

- timer、event listener、subscription、stream、socket、worker、child process、temporary file 和 object URL 都有所有者与清理路径。
- 使用平台提供的结构化清理能力；`using`/`Disposable` 只有项目编译目标和依赖完整支持时才采用。
- 测试验证取消、超时、重复关闭、初始化部分失败和进程退出。

## JavaScript interop

- 回调式 API 封装为 Promise 时只 settle 一次并正确转发 error。
- `this`、prototype、Proxy、动态属性和第三方未类型化对象限制在 adapter。
- 不通过无边界 monkey patch 修改全局或第三方对象。

## 官方依据

- [MDN AbortController](https://developer.mozilla.org/docs/Web/API/AbortController)
- [Node.js error handling](https://nodejs.org/api/errors.html)
- [TypeScript release notes and resource management](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html)
