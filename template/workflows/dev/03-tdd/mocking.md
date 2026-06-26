# Mock 边界与可 Mock 性

> **依赖类别**（进程内 / 本地可替换 / 端口与适配器 / 真正外部）与「在接缝处注入端口、生产用真实适配器、测试用内存或 mock 适配器」的判定，是设计词汇的一部分，见单一事实源 `../../../vendor/codebase-design/DEEPENING.md`。本文只覆盖**写测试时**的 mock 取舍与 SDK 风格接口。

## 只在系统边界处 mock

- 外部 API（支付、邮件等）
- 数据库（有时——优先考虑测试数据库 / 本地可替换实现）
- 时间 / 随机性
- 文件系统（有时）

不要 mock：

- 你自己的类 / 模块
- 内部协作者
- 任何你能控制的东西

> 依赖注入（接受依赖而非内部创建）是让边界可 mock 的前提；该原则见 `../../../vendor/codebase-design/SKILL.md`「为可测试性设计」，本文不复制。

## 优先 SDK 风格接口，而非通用 fetcher

为每个外部操作创建专用函数，而不是一个带条件逻辑的通用函数：

```typescript
// 好：每个函数都可以独立 mock
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: data }),
};

// 坏：mock 时需要在内部写条件逻辑
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

SDK 方式意味着：

- 每个 mock 返回一种特定的数据结构
- 测试准备中不需要条件逻辑
- 更容易看出测试覆盖了哪些端点
- 每个端点都有类型安全
