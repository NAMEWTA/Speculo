# Node.js 运行时

- Node 版本来自 `engines`、版本文件、CI 或容器；可用 API 与 module 行为必须匹配该版本。
- 配置在入口读取、验证、冻结并注入；库代码不随处访问 `process.env`。
- 文件、socket、stream、child process、worker 和 timer 有错误、取消、关闭和进程退出策略。
- stream 使用 backpressure，pipeline/finished 等结构化机制按项目版本选择。
- process-level `uncaughtException` / `unhandledRejection` 只用于记录和受控终止，不假装安全恢复未知状态。
- signal handling、graceful shutdown 和 exit code 属于应用入口合同。
- 路径以明确根解析，拒绝遍历和 symlink 越界；跨平台处理分隔符、shell 和可执行文件。
- 服务不得执行未验证 shell 字符串；优先参数化 spawn API。
- package ESM/CJS、exports 和运行时加载行为通过实际 Node 测试。

官方依据：[Node.js API documentation](https://nodejs.org/api/)、[Node.js package modules](https://nodejs.org/api/packages.html)。
