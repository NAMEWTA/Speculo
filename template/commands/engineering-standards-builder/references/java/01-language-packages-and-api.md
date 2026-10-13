# Java：语言、包与公开 API

## Package 与目录

- package 名小写、稳定并与源码路径一致；模块根遵循实际 build source set。
- 顶层 package 反映组织/产品所有权；Spring scanning 等框架约束由适配器处理。
- 在模块内部优先按稳定业务能力组织；controller/service/repository 的层次不是所有 Java 项目的强制目录。
- package-private、protected、public 使用最小可见性；内部实现不因测试便利而公开。
- JPMS 项目显式 exports/opens/requires；反射框架所需 `opens` 限定最小范围。

## 类型与 API

- public API 使用领域类型、不可变值和明确泛型；不泄漏 persistence/framework internals。
- records、sealed types、pattern matching 等仅在项目 JDK 和兼容范围支持时使用。
- collection 返回值明确所有权和可变性；避免返回内部可变集合。
- `Optional` 主要用于可能缺失的返回值，是否用于字段/参数遵循项目和框架兼容事实。
- equals/hashCode/toString 与 identity/value 语义一致；实体和代理类型特别验证。
- 构造器、工厂和 builder 依据不变量与可读性选择，不为每个简单对象自动生成 builder。

## 命名与文档

- class/interface/record、method、constant、test 遵循现有 formatter/style profile。
- public package/type/method 的 Javadoc 记录失败、线程安全、nullability、副作用和兼容性。
- 缩写、DTO/entity/value object 的命名表达边界，不把所有传输对象泛称 `Data` 或 `Model`。

## DTO、领域与持久化

- 外部 transport、领域模型和持久化实体在耦合成本出现时分离。
- 映射集中在边界，可测试且不静默丢字段。
- annotation 不应让核心领域依赖不必要的 Web/数据库框架；是否接受框架耦合由模块目标决定。

## 官方依据

- [Java API design guidance in JDK documentation](https://docs.oracle.com/en/java/javase/)
- [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)（可选 style profile，不是 Java 唯一官方规范）
