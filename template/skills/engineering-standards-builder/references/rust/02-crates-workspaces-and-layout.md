# Rust：Crate、Workspace 与目录

## Workspace

- crate 围绕独立 API、编译/发布边界和所有权拆分，不用大量微 crate 代替模块设计。
- workspace package metadata、dependencies、lints 和 profiles 由实际 Cargo 能力集中管理；不覆盖成员必要差异。
- dependency graph 单向；proc-macro、build dependency 和 dev dependency 也纳入供应链与循环检查。
- virtual manifest 与 root package 区分；release/versioning 策略明确。

## Crate 与 Module

- library 逻辑优先放 `lib.rs`，binary 入口保持薄；多个命令使用 `src/bin` 或显式配置。
- module tree 表达领域和可见性；`pub(crate)`/private 优先，`pub` 只用于 contract。
- `mod.rs` 与同名文件风格遵循项目 edition/现有实践，不进行无价值全量改名。
- integration tests 位于 `tests/` 并以外部消费者视角编译；共享 test support 不意外成为独立测试 crate。
- examples/benches/build.rs 只有实际用途并由门禁覆盖。

## Features

- feature 是 additive capability；避免同一 feature 改变 public 类型语义或互斥组合而无检查。
- default features、optional dependencies 和 feature unification 对消费者影响明确。
- CI 测试最低、默认、全部和关键组合；组合爆炸时列出风险驱动矩阵。
- platform cfg 与 feature 分离；无效组合尽早 compile_error 或清晰失败。

## 依赖与构建

- `Cargo.lock` 是否提交按 application/library 和仓库策略；
- build script 输出、rerun 条件、环境和 generated artifacts 可重现；
- FFI/native dependency 的 target、link 和 license 明确；
- workspace dependency 更新审查 public API、MSRV、feature 和安全影响。

## 官方依据

- [Cargo package layout](https://doc.rust-lang.org/cargo/guide/project-layout.html)
- [Cargo workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html)
- [Cargo features](https://doc.rust-lang.org/cargo/reference/features.html)
