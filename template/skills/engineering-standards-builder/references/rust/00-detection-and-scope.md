# Rust：检测、版本与作用域

## 信号

- `Cargo.toml`、`Cargo.lock`、workspace members；
- `rust-toolchain.toml`、`rust-version`、edition；
- `src/lib.rs`、`src/main.rs`、`src/bin/`、`tests/`、`benches/`、`examples/`；
- features、build script、proc-macro、FFI、`unsafe`；
- CI 中 fmt、Clippy、test、doc、audit、target matrix。

每个 Cargo package 是 crate scope；virtual workspace root 不应被误当成 library/application crate。

## 版本

记录：

- edition；
- MSRV（`rust-version`、toolchain、CI/文档）；
- stable/beta/nightly 与 required components/targets；
- Cargo feature resolver；
- supported targets 和 no_std/alloc/std；
- unsafe/FFI/async runtime。

不得把 Builder 的最新 Rust 语法写入低 MSRV 项目。

## 访谈触发

- MSRV 与 CI/toolchain 冲突；
- public crate 和 internal crate 边界；
- unsafe policy；
- Clippy warning level 与存量基线；
- feature combinations/MSRV testing；
- async runtime、FFI 或 no_std 支持范围。

## 官方依据

- [Cargo manifest](https://doc.rust-lang.org/cargo/reference/manifest.html)
- [Cargo workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html)
