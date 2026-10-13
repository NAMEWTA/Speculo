# 自测试 Fixtures

这些目录由 `scripts/self-test.mjs` 自动发现：每个含 `expected.json` 的目录都是一个扫描输入与断言合同。它们不是复制到用户项目的示例代码。

自测试还会临时构造“根路由 + 领域 Skill + 所有权清单”，验证项目源码/FM 引用、未登记 Skill 保留、非法所有权路径、缺失领域路由、错误框架和兼容入口失败路径。

覆盖范围：

- `typescript/vue-vite/`：Vue 3、TypeScript、Vite、Pinia、Vitest；
- `typescript/react-vite/`：React、TypeScript、Vite、Vitest；
- `java/spring-boot-maven/`：Java、Maven、Spring Boot、JUnit、Testcontainers；
- `go/service/`：Go module、`cmd`、`internal`、测试与 lint 配置；
- `rust/workspace/`：Cargo virtual workspace、library 与 CLI crate；
- `polyglot/monorepo/`：Vue、Spring Boot、Go 的模块隔离；
- `fallback/kotlin-gradle/`：未内置语言只进入通用 fallback，不误套 Java 适配器。

新增适配器必须增加 fixture、`expected.json` 和 self-test 断言。

## fallback 与生成缓存

`fallback/kotlin-gradle/` 是固定的扫描输入：`build.gradle.kts` 和 Kotlin 源码提供识别信号，`expected.json` 要求识别 Kotlin/Gradle/JVM 且不启用 Java 适配器。三者随技能分发并保持版本跟踪；Builder 不会把它们生成为项目业务代码，自测试也不运行 Gradle。

Gradle 命令或 IDE 导入可能在这里创建 `.gradle/`，其中是可再生的构建状态、缓存和锁文件。该目录由 Git、npm 分发、CLI 静态技能复制及 Builder 清单/自校验排除；忽略不阻止 Gradle 再次创建它，无需为运行 Builder 删除夹具或执行 Gradle。
