# Go：检测、版本与作用域

## 信号

- `go.mod`、`go.work`、`go.sum`；
- `.go` 源码和 package 声明；
- `cmd/`、`internal/`、可执行 `package main`；
- CI 中 `go test`、`go vet`、race、fuzz、lint、build；
- `golangci-lint`、staticcheck、govulncheck 等配置；
- code generation 指令与生成标记。

`go.work` 是 Workspace 事实，不等于发布时依赖合同；每个 `go.mod` 是独立 module scope。

## 版本

记录 `go`/`toolchain` directive、CI Go 版本和最低支持范围。不得根据 Builder 环境升级 directive 或自动执行 `go mod tidy`。

## Module scope

- 每个 `go.mod` 建立 module；
- `go.work` 建立 Workspace 关系；
- package 由目录和 package clause 交叉验证；
- command 由 `package main` 和入口确认；
- generated/vendor/testdata 排除或单独标记。

## 访谈触发

- 多 module 是否共同治理；
- 哪些 package 属于外部 public API；
- `internal` 迁移和消费者兼容；
- `cmd`/应用布局冲突；
- context、goroutine、error wrapping 与 lint 基线。

## 官方依据

- [Go module layout](https://go.dev/doc/modules/layout)
- [Go workspaces](https://go.dev/ref/mod#workspaces)
