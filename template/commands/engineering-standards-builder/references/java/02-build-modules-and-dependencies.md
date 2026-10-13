# Java：构建、模块与依赖

## Maven

- 使用 Wrapper 时以 Wrapper 为 canonical；CI 与本地命令一致。
- parent、dependencyManagement/BOM 与 pluginManagement 职责清楚；子模块不重复漂移版本。
- lifecycle phase 与 plugin execution 可追溯；不把需要执行的验证只放在手工 profile。
- scope（compile/runtime/test/provided/annotation processor）反映真实所有权。
- 聚合模块和可发布模块区分；module graph 不形成循环。

## Gradle

- 使用 Wrapper；settings 定义参与构建的项目。
- convention plugin/version catalog 用于稳定共享逻辑，避免根脚本复制所有子项目配置。
- API/implementation/runtimeOnly/testImplementation 等 configuration 准确表达暴露边界。
- task 输入、输出与缓存正确；不要依赖 task 执行顺序副作用。
- composite build、included build 和多项目边界按仓库事实生成。

## 依赖

- 新依赖评估维护、许可证、安全、启动/包体和已有替代；
- 禁止未使用或重复功能依赖；
- 依赖版本冲突通过 BOM/platform/resolution evidence 处理，不随意 force 最新；
- annotation processor、agent 和 build plugin 属于供应链边界；
- 公开库避免把内部实现依赖泄漏给消费者。

## 生成代码

- generated source root 与手写源码分离；
- 生成器版本和输入锁定；
- CI 验证 freshness（若提交生成物）；
- 不手改生成文件；例外在生成器边界解决。

## 官方依据

- [Maven POM reference](https://maven.apache.org/pom.html)
- [Maven lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html)
- [Gradle multi-project builds](https://docs.gradle.org/current/userguide/multi_project_builds.html)
- [Gradle dependency management](https://docs.gradle.org/current/userguide/core_dependency_management.html)
