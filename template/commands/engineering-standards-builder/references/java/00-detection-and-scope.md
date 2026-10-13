# Java：检测、版本与作用域

## 信号

- `pom.xml`、`.mvn/`、Maven Wrapper；
- `settings.gradle*`、`build.gradle*`、`gradle.properties`、Gradle Wrapper；
- `src/*/java`、`module-info.java`；
- toolchain、compiler release/source/target、CI JDK；
- Spring Boot plugin/starter 与应用注解；
- formatter、Checkstyle、Spotless、PMD、Error Prone、JaCoCo、ArchUnit 等配置。

只看到 `.java` 文件可判定语言，但构建模块、JDK 和框架必须由构建文件/源码入口交叉确认。

## 版本与构建事实

记录：

- JDK/toolchain 和目标 bytecode；
- Maven/Gradle 及 Wrapper 版本；
- parent/BOM/version catalog；
- 多模块图与 source sets；
- JPMS 是否启用；
- 测试平台和 CI lifecycle；
- Spring Boot 大版本与 Java 基线。

不得根据本机 JDK 推断项目版本，也不得同时生成 Maven 与 Gradle 命令，除非 scope 确实分别使用。

## 访谈触发

- Maven/Gradle 共存边界不清；
- JDK 升级目标影响 API、虚拟线程、records 或 module；
- package-by-feature 与既有分层发生真实冲突；
- nullability/exception/public API 策略不一致；
- formatter/style profile 或质量插件准备统一。

## 官方依据

- [Maven standard directory layout](https://maven.apache.org/guides/introduction/introduction-to-the-standard-directory-layout.html)
- [Gradle multi-project builds](https://docs.gradle.org/current/userguide/multi_project_builds.html)
- [Java language and API documentation](https://docs.oracle.com/en/java/)
