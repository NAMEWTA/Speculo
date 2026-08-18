# Go：Module、Package 与目录

## Module

- module path 是 public import contract；变更需要消费者和版本迁移。
- 应用、可发布库和独立生命周期可以拆 module，不因目录数量随意多 module。
- `replace` 记录本地开发/迁移目的；发布前验证不会依赖不可用本地路径。
- major version module path、tags 和 package compatibility 按 Go module 规则。

## Package

- package 围绕单一能力和共同变化组织；避免 `util`、`common`、`models` 垃圾场。
- 导入方向无循环；需要共享时先判断能力归属，再提取稳定合同。
- `internal` 用于编译器可执行的私有边界；只有确认外部消费者后迁移现有 public package。
- `cmd/<name>` 保存薄入口，业务逻辑进入可测试 package。
- `pkg/` 不是官方强制目录；只在仓库明确用它表达可复用 public package 时保留。
- `testdata`、`embed` 资源和平台文件命名遵循 Go tool 语义。

## 多平台与 Build Tags

- 文件后缀和 build tags 的目标平台、feature 和测试矩阵明确。
- 平台实现共享接口但不隐藏不可测试差异；至少在支持平台 CI 编译。
- cgo 使用范围、交叉编译和资源所有权单独记录。

## 依赖

- 标准库优先但不以“零依赖”为目的；新模块评估 API、维护、安全和 transitive graph。
- `go mod tidy` 只在有意修改依赖时执行并审查 diff。
- public package 不暴露不必要第三方类型，避免锁定消费者。

## 官方依据

- [Organizing a Go module](https://go.dev/doc/modules/layout)
- [Go Modules Reference](https://go.dev/ref/mod)
