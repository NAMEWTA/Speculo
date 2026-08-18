# Go：语言与惯用法

## 清晰与零值

- 优先简单控制流、早返回和有用零值；不为模拟其他语言层次引入抽象。
- package 名短、小写、表达能力；调用点 `package.Symbol` 可读，不重复 stutter。
- exported identifier、package 和重要约束使用 Go doc 完整句。
- 小接口由消费者定义；不要为每个 concrete type 预先创建接口。
- 接口返回 concrete type 在可行时更易演进；只有调用者需要替换行为时暴露接口。

## 数据与 API

- struct 字段和构造器表达不变量；零值不可用时提供构造并文档化。
- slice/map/channel 的 nil 与 empty 语义在 public API、JSON 和数据库边界明确。
- 复制含 mutex 或资源 owner 的值会破坏语义；选择 pointer/value receiver 时考虑 identity、大小和一致性。
- 不把 `interface{}`/`any` 当默认数据模型；在外部边界验证并转换。
- 泛型用于真实跨类型算法/容器，不取代清晰 domain types 或小接口。

## 控制流

- `defer` 用于成对清理并关注循环中的生命周期；
- type assertion/check、comma-ok 和 exhaustive-ish switch 处理未知值；
- `init` 最小化，避免隐式 I/O、goroutine 和注册顺序；
- package global mutable state 仅在有明确同步、生命周期和测试重置时。

## 生成代码

- `go generate` 不是自动构建步骤；记录 generator、输入和运行方式。
- 生成文件包含标准标记、与手写代码分离并由 freshness 检查验证（若提交）。

## 官方依据

- [Effective Go](https://go.dev/doc/effective_go)
- [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments)
