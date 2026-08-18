# Browser 运行时

仅用于明确运行在浏览器、Web Worker 或 Service Worker 的 TypeScript/JavaScript scope。

- DOM 查询和操作局限在 UI/platform adapter；框架模块遵循框架生命周期。
- 网络请求定义取消、超时、重试、认证刷新、离线和过期响应语义。
- storage、cookie、URL、postMessage 和第三方脚本属于不可信边界。
- 不在 bundle 中暴露 secret；构建时变量凡进入客户端均视为公开。
- 事件监听、observer、object URL、worker 和 timer 有清理路径。
- 用户输入、富文本和 URL 按上下文验证/转义；CSP、Trusted Types 等只在项目采用时生成。
- 性能以用户指标和 bundle/runtime 测量为依据；大列表虚拟化、图片和 code splitting 按证据采用。
- 可访问性、键盘和焦点纳入组件与 E2E 门禁。
- Worker 与 window 使用独立 tsconfig/lib，消息通过类型化且运行时验证的协议。

官方依据：[MDN Web APIs](https://developer.mozilla.org/docs/Web/API)、[OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)。
