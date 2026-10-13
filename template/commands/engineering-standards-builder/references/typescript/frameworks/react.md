# React 规范适配器

仅对 Project Inventory 明确识别为 React 的 scope 生成。React 与 Vue 共存时必须分别限定模块或路径。

## 版本与应用模型

先识别 React 大版本、客户端/SSR/SSG、framework router、Server/Client Component 边界、编译器和状态工具。不要把特定 Next/Remix/React Router 约定泛化为所有 React 项目。

## 组件与纯净性

- 新代码优先函数组件；存量 class component 以风险和迁移计划处理。
- render 与 Hook 保持纯净：相同输入得到相同 JSX，不在 render 中发起副作用或修改外部状态。
- props 为明确只读合同；组件不修改传入对象。
- 展示、领域状态、I/O 编排和平台 adapter 在复杂度出现时分离，而不是按任意行数拆分。
- component、Hook、context 和 provider 的命名遵循 scope 内一致实践。

## Hook

- Hook 只在 React 函数组件或自定义 Hook 顶层调用，不放在条件、循环、普通回调或事件分支。
- 自定义 Hook 使用 `use` 前缀，公开输入、返回值、订阅、清理和并发语义。
- 不用 Hook 隐藏不可追踪的全局写入。
- 遵循项目当前启用的 React Hooks ESLint 规则；例外必须局部且有证明。

## 状态与派生数据

- 状态保持最小，能由 props/state 计算的值在 render 中计算或在测量后 memoize。
- 状态放在拥有它的最小共同祖先；跨树共享才考虑 context 或项目既有 store。
- reducer 用于多事件、多字段状态机，而不是简单值的仪式化包装。
- context value 稳定性在有实际重渲染问题时优化；不要无条件包裹所有值。

## Effect

- Effect 用于同步外部系统：网络、订阅、DOM/平台 API、计时器、非 React widget。
- 不用 Effect 计算派生数据、处理可直接在事件中完成的逻辑或同步两个可合并状态。
- 依赖数组反映实际读取；不通过禁用 lint 隐藏陈旧闭包。
- cleanup 必须撤销订阅、监听、timer、请求或外部资源；开发严格模式下 setup/cleanup 可重复执行仍正确。
- 异步结果处理取消、过期响应和 unmount 后写入。

## 性能

- 先使用稳定边界、局部状态和纯组件；只在 profiler/指标证明后采用 memoization。
- `memo`、`useMemo`、`useCallback` 是性能工具，不是语义保证。
- 大列表采用分页/虚拟化；bundle 和懒加载遵循当前框架能力。

## 可访问性与安全

- 优先语义 HTML；交互元素具备键盘、焦点和可访问名称。
- `dangerouslySetInnerHTML` 只接收经过可信边界处理的内容。
- 客户端隐藏不能替代服务端授权。

## 测试

- 使用项目既有工具，测试用户可观察行为、DOM 和可访问交互。
- 不以组件实例、私有 Hook 实现或脆弱 snapshot 为主要断言。
- Effect、订阅和并发行为覆盖 cleanup、失败和竞争路径。
- SSR/hydration、router 和 browser API 行为按实际运行环境测试。

## 访谈触发

- class → function 的迁移 scope；
- Client/Server Component 和数据获取边界；
- context 与既有 store 的职责；
- Effect 债务采用立即修复或 Ratchet；
- React compiler/memo 策略仅在项目实际采用时。

## 官方依据

- [React: Components and Hooks must be pure](https://react.dev/reference/rules/components-and-hooks-must-be-pure)
- [React: Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [React: Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
