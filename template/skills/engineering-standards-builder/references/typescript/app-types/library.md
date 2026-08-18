# TypeScript / JavaScript 发布库与 SDK

- public surface 只通过 package exports 和文档入口；内部路径不承诺兼容。
- 明确支持的 runtime、module format、TypeScript/Node/browser 版本和平台。
- 类型声明与运行时导出一一对应；使用消费方 fixture 测试解析和 tree-shaking/side effects。
- package `sideEffects` 声明必须真实；顶层初始化不访问宿主全局或启动后台任务。
- 依赖分类（dependencies/peer/dev/optional）反映运行时和消费者所有权。
- 错误类型、取消、重试和 telemetry 默认为可控制；SDK 不静默记录敏感数据。
- 破坏性 API、类型收窄、序列化与默认行为变化纳入版本和迁移说明。
- ESM/CJS/条件 exports 仅发布实际验证的组合，避免同一包产生多份状态。
- README 示例进入编译/运行测试，避免文档漂移。
