# 证据、项目拓扑与作用域

## 最小模块记录

```text
id
path
languages/frameworks/runtimes
build and test systems
source/test roots
public entrypoints
generated/frozen paths
quality gates
evidence/confidence
```

模块可以是 Workspace package、Maven/Gradle 子项目、Go module、Cargo crate，也可以是由源码、配置和依赖边界共同证明的独立应用。多个 manifest 不自动等于 Monorepo。

## Scope

使用最窄充分范围：

```text
repository
module:apps/web
language:typescript
framework:vue
runtime:node
path:packages/sdk/**
public-api:packages/sdk
```

“前端”“后端”只有在项目已有对应路径定义时才可使用。

## 项目来源记录

项目源码或模板证据至少记录：

```text
Path: docs/fm/controller.java.ftl
Role: canonical scaffold template
Applies when: generating a controller
Produces: <target path/pattern>
Integration: <manual registration/import/configuration>
Verification: <existing validator/test/build command>
Consumers/tests: <paths>
Confidence: high
```

生成 Skill 只引用真实项目路径，不复制源码或模板正文。若没有正式模板，引用同一 owner/scope 下的成熟实现和测试；没有足够证据则省略规则或标记待确认。

## 冲突类型

重点识别 manifest 与源码不一致、CI 与本地脚本不一致、模板与成熟代码不一致、公开 API 被深导入绕过、generated 与手写代码混合、多框架边界不清，以及目标规则无法通过当前门禁。

冲突不得靠“选择多数”消失。高影响冲突进入决策；存量问题进入 Ratchet、迁移或局部例外。

## 完成条件

每条规范和每个 Skill 边界均可映射到明确 scope 与路径；框架规则不泄漏到其他模块；模板的责任范围与后续手工集成已说明。
