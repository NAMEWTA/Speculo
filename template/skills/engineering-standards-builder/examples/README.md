# 自测试 Fixtures

这些目录由 `scripts/self-test.mjs` 自动发现：每个含 `expected.json` 的目录都是一个扫描输入与断言合同。它们不是复制到用户项目的示例代码。

覆盖范围：

- `typescript/vue-vite/`：Vue 3、TypeScript、Vite、Pinia、Vitest；
- `typescript/react-vite/`：React、TypeScript、Vite、Vitest；
- `java/spring-boot-maven/`：Java、Maven、Spring Boot、JUnit、Testcontainers；
- `go/service/`：Go module、`cmd`、`internal`、测试与 lint 配置；
- `rust/workspace/`：Cargo virtual workspace、library 与 CLI crate；
- `polyglot/monorepo/`：Vue、Spring Boot、Go 的模块隔离；
- `fallback/kotlin-gradle/`：未内置语言只进入通用 fallback，不误套 Java 适配器。

新增适配器必须增加 fixture、`expected.json` 和 self-test 断言。
