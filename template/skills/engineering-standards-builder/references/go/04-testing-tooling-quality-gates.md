# Go：测试、工具链与质量门禁

## 格式与静态检查

- `gofmt` 是基础格式合同；imports 使用项目当前工具。
- `go vet`、staticcheck、golangci-lint 等按仓库配置运行，不无差别启用所有规则。
- lint exclude 最小化且有原因和删除条件。
- `govulncheck` 或依赖安全工具仅在项目已采用/确认时成为门禁。

## 测试

- `*_test.go` 与被测 package 同目录；选择 same-package 或 external-package 测试表达白盒/消费者视角。
- table-driven test 用于输入矩阵，不为了模板化牺牲可读失败信息。
- helper 使用 `t.Helper()`，资源使用 `t.Cleanup()`；并行测试不共享无保护状态。
- integration test 的 build tags、环境、容器和超时明确。
- HTTP、文件、数据库和并发测试覆盖取消、错误和清理。
- example test 用于可执行文档和 public API。

## Race、Fuzz 与 Benchmark

- 并发代码和高风险模块使用 `go test -race`，按资源成本配置 PR/夜间范围。
- parser、协议和边界转换使用 fuzz；失败 corpus 保留为回归输入。
- benchmark 只在有性能合同或优化决策时添加，记录环境和比较方法。
- 不用 coverage 数字替代行为和竞争测试。

## 门禁

记录真实 module/workspace 工作目录和命令，例如：

```text
gofmt check
go vet ./...
go test ./...
go test -race ./...   # 若项目门禁存在
go test -fuzz=...     # 按专门任务
staticcheck/golangci-lint
go build ./...
```

不得假定每个仓库都支持 `./...` 或相同 tags。

## 官方依据

- [Go testing package](https://pkg.go.dev/testing)
- [Go fuzzing](https://go.dev/doc/security/fuzz/)
- [Go race detector](https://go.dev/doc/articles/race_detector)
