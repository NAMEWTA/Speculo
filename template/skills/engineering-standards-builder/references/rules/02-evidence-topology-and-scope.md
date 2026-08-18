# 证据、项目拓扑与规则作用域

## 模块模型

每个模块至少记录：

```text
id
path
languages
frameworks
runtimes
buildSystems
packageManagers
sourceRoots
testRoots
publicEntrypoints
generatedPaths
qualityGates
evidence
confidence
```

模块可以是 Workspace package、Maven/Gradle 子项目、Go module、Cargo crate，也可以是经源码和构建边界证明的独立应用。

## 拓扑分类

- `single-project`
- `workspace`
- `monorepo`
- `multi-module`
- `polyglot-monorepo`
- `multi-root`

不要因为有多个 manifest 就自动称为 Monorepo；必须判断它们是否由共同根、Workspace、CI、发布或依赖关系管理。

## Scope 语法

生成规则时使用最窄充分 scope：

```text
repository
module:apps/web
module:services/orders
language:typescript
framework:vue
runtime:node
path:packages/sdk/**
public-api:packages/sdk
```

同一条规则需要多个 scope 时显式列出，不使用“前端”“后端”这类无法映射路径的模糊标签，除非项目已经定义这些边界。

## 证据记录

推荐格式：

```text
Evidence:
- path: apps/web/package.json
  signal: dependencies.vue
  confidence: high
- path: apps/web/src/App.vue
  signal: Vue SFC
  confidence: high
```

命令证据记录命令与来源，例如“`.github/workflows/ci.yml` 中执行 `pnpm test`”，不能只写“项目有测试”。

## 冲突类型

至少识别：

- manifest 与源码不一致；
- 同一 scope 内多种无规律命名或目录策略；
- 本地脚本与 CI 门禁不一致；
- 声明的 Java/Node/Go/Rust 版本不一致；
- React 与 Vue、Maven 与 Gradle等多框架/多构建系统共存但边界不清；
- 公开 API 实际被跨模块深导入绕过；
- 生成代码与手写代码混合；
- 新目标规则无法通过当前门禁。

冲突不得通过“选择多数”静默消失。高影响冲突进入决策，低影响冲突进入 Ratchet 或局部例外。

## 作用域完成条件

每个被选规则包和每条项目规则都能映射到明确路径或模块；没有框架规则泄漏到无关模块；不存在用仓库根 manifest 覆盖所有子项目的推断。
