# Rust：测试、工具链与质量门禁

## Formatter 与 Clippy

- `cargo fmt --check` / rustfmt 配置为机械格式合同；
- Clippy lint group 和 level 匹配 MSRV、crate 类型和存量基线；不无差别启用 nursery/restriction 全集。
- lint allow 限定最小 scope，写明 reason；workspace lints 与成员覆盖可追溯。
- 编译 warnings 是否 deny 由项目确认并采用 Ratchet，避免依赖升级突然阻塞全部模块。

## 测试

- unit tests 与私有实现同 module；integration tests 从 public API 视角；doc tests 保持示例有效。
- property/fuzz 用于 parser、codec、unsafe 和状态机；失败 corpus 固化。
- 并发/async 测试控制时间、runtime 和调度假设；覆盖取消、panic、shutdown。
- FFI、数据库、文件和网络资源使用临时/隔离环境并清理。
- feature、target、MSRV 和 no_std 组合按支持矩阵测试。

## 其他门禁

根据仓库事实选择：

```text
cargo check --workspace --all-targets
cargo test ...
cargo fmt --check
cargo clippy ... -- -D warnings
cargo doc --no-deps
cargo audit / deny / vet
cargo miri / sanitizer / loom
```

每个命令的 features、target、toolchain 与 working directory 必须明确；planned 工具不得报告为当前门禁。

## Benchmark 与性能

- benchmark 只用于有测量目标的热点；固定输入、环境和比较方法；
- 优化 unsafe/alloc/clone 前保留基线和回归阈值；
- microbenchmark 不替代端到端 latency/throughput 指标。

## 官方依据

- [rustfmt](https://github.com/rust-lang/rustfmt)
- [Clippy documentation](https://doc.rust-lang.org/clippy/)
- [Cargo tests](https://doc.rust-lang.org/cargo/commands/cargo-test.html)
