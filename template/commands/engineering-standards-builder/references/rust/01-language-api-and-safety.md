# Rust：语言、API 与安全

## API 设计

- public API 最小化，名称、trait、generic bound、ownership 和 lifetime 表达使用方式。
- 接受借用或通用 trait 只有在改善调用者且不制造复杂错误时；返回拥有值/iterator/borrow 按生命周期合同选择。
- newtype 表达领域单位、验证状态和 orphan-rule 边界。
- `#[non_exhaustive]`、sealed trait、feature-gated API 和 semver 影响按发布策略使用。
- public type 不泄漏不希望承诺的内部依赖类型。
- `Default`、builder 和 conversion trait 只在语义自然且失败行为清楚时实现。

## 所有权与数据

- clone 是所有权决定，不是借用错误的默认修复；热点 clone 通过 profiler/benchmark 验证。
- interior mutability (`Cell`/`RefCell`/mutex 等) 限定在所有权边界，并文档化 panic/blocking 语义。
- `Cow`, smart pointer 和 arena 只在生命周期/性能需求证明时采用。
- 不把 `String`/`Vec<u8>` 用作所有外部协议的无约束模型；边界解析为精确类型。

## Unsafe

- 默认禁止或最小化；项目允许时每个 unsafe block/module 有 SAFETY 注释，说明调用前提与保持的不变量。
- safe wrapper 必须阻止调用者构造 UB；FFI、raw pointer、aliasing、layout 和线程安全有专门测试/工具。
- 不用 `unsafe` 规避借用设计或微优化，除非基准和审查证明。
- 是否采用 `unsafe_op_in_unsafe_fn`、deny lint 等匹配 edition/MSRV 和项目策略。

## 文档

- public item 使用 rustdoc，包含错误、panic、safety、线程安全和示例；
- 示例作为 doc test（适用时）保持可编译；
- hidden/ignored doc test 有具体平台或依赖理由。

## 官方依据

- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Rustonomicon](https://doc.rust-lang.org/nomicon/)
