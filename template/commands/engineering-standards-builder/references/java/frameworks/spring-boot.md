# Spring Boot 规范适配器

只对明确使用 Spring Boot 的 Java scope 生成。先识别 Boot 大版本、Servlet/Reactive、Maven/Gradle、Web/Data/Messaging/Security 技术和部署模型。

## 应用与 package

- 主应用类放在能覆盖 intended component/entity scanning 的根 package；避免 default package。
- 多应用或模块化系统显式限定 scan/import，不依赖过宽 classpath 扫描。
- 目录可按 feature 或稳定模块组织；controller/service/repository 分层只作为局部角色，不强制整个仓库按技术层平铺。
- configuration、adapter、domain 和 application 边界由依赖方向和测试验证。

## 配置

- 使用 Boot externalized configuration；记录 property source 优先级和环境覆盖方式。
- 相关配置聚合为类型安全 `@ConfigurationProperties`，启动时验证必填、范围和格式。
- secret 不进入默认配置或日志；profile 不复制业务逻辑。
- 条件化 bean 和 auto-configuration 写明触发条件、back-off 和测试。

## Web/API

- controller 负责 transport、验证、认证上下文和错误映射，不承载核心业务流程。
- request/response DTO 与领域/实体的耦合按 API 生命周期决定。
- Bean Validation 在边界使用；跨字段/领域不变量由领域服务或明确 validator 处理。
- `@ControllerAdvice`/problem details 等错误合同统一且不泄露内部信息。
- Servlet 与 WebFlux 模型不混用阻塞/非阻塞假设；线程上下文和 backpressure 按实际 stack。

## Service、事务与数据

- transaction 边界围绕用例；明确 propagation、rollback 和 read-only 语义。
- 不在事务中无界等待远程 I/O；跨系统一致性使用项目确认的 outbox/saga/idempotency 策略。
- repository 暴露领域需要的查询，而非让上层依赖 ORM 细节。
- lazy loading、N+1、分页、锁和 batch 用真实集成测试/指标验证。
- migration 工具和 schema 变更按 expand/migrate/contract 或项目策略执行。

## 依赖注入与生命周期

- 优先构造器注入；依赖显式且便于测试。
- Bean scope、线程安全和可变状态一致；singleton bean 不保存请求可变状态。
- scheduler、listener、executor、client 和连接池配置 owner、超时、关闭和 observability。
- application event 不作为隐藏业务事务保证；跨进程事件使用明确协议。

## 测试

- 纯领域/服务单元测试不启动 Spring。
- MVC/WebFlux/Data/Security 等使用适用 test slice；slice 选择来自实际依赖，不复制固定清单。
- `@SpringBootTest` 用于需要完整上下文的集成路径，不作为所有测试默认。
- 数据库、消息、缓存等兼容性重要时使用 Testcontainers 或项目真实环境。
- 随机端口、动态属性、上下文缓存和测试数据隔离明确。
- 配置绑定、条件 Bean、错误映射、事务和安全边界有测试。

## Actuator 与可观测性

仅在项目采用时生成：

- health/readiness 不泄露敏感信息；
- metrics/traces/log correlation 使用项目观测体系；
- endpoint 暴露最小化并受认证/网络边界保护；
- 自定义 health indicator 不进行无界慢调用。

## 访谈触发

- package-by-feature 与当前分层迁移；
- MVC/WebFlux 或阻塞/非阻塞边界；
- transaction/outbox/error contract；
- test slice 与 Testcontainers 门禁；
- profile/configuration properties 统一；
- Boot/JDK 大版本升级。

## 官方依据

- [Spring Boot: Structuring Your Code](https://docs.spring.io/spring-boot/reference/using/structuring-your-code.html)
- [Spring Boot: Externalized Configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html)
- [Spring Boot: Testing](https://docs.spring.io/spring-boot/reference/testing/index.html)
- [Spring Boot: Testcontainers](https://docs.spring.io/spring-boot/reference/testing/testcontainers.html)
