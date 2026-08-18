# Java：测试、工具链与质量门禁

## 测试布局

- 使用构建系统真实 source sets；典型 Maven/Gradle Java 项目将 production 与 test 源分离。
- 单元测试不启动完整容器；framework slice、集成、契约和 E2E 按风险选择。
- 数据库、消息和外部协议高风险路径优先真实兼容实现或 Testcontainers，而不是过度 mock。
- 测试拥有并清理文件、端口、容器、executor 和数据库数据；并行执行不共享无保护状态。
- parameterized/property tests 用于边界组合；缺陷修复有回归用例。

## 工具链

从构建事实选择：

- formatter：Spotless、google-java-format、项目 formatter；
- style/static：Checkstyle、PMD、SpotBugs、Error Prone、NullAway 等；
- test：JUnit Platform、Mockito、AssertJ、Testcontainers 等；
- coverage：JaCoCo 或项目工具；
- architecture：ArchUnit/JPMS/build graph；
- dependency/security：项目已有插件。

不要同时引入功能重叠工具；style profile 必须与 formatter 一致。

## 门禁

- Maven 记录 Wrapper 命令和 lifecycle/profile；
- Gradle 记录 Wrapper task；
- PR 与发布门禁区分；
- integration test 需要的服务、容器和环境明确；
- flaky quarantine 有 owner 和到期；
- 新规则对存量采用模块/错误数量 Ratchet。

## 官方依据

- [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/)
- [Testcontainers for Java](https://java.testcontainers.org/)
