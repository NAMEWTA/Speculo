# TypeScript / JavaScript：检测、版本与作用域

## 触发信号

至少交叉验证两类信号：

- `package.json`、Workspace 配置和锁文件；
- `tsconfig*.json`、`jsconfig.json`；
- `.ts`、`.tsx`、`.mts`、`.cts`、`.js`、`.jsx`、`.vue` 源码；
- CI 中的 package manager、编译、Lint、测试和构建命令；
- 框架入口、bundler 配置和 package exports。

只有依赖但无源码使用时记为依赖信号。根 `package.json` 不能自动把所有 Workspace package 判定为同一框架或运行时。

## 版本事实

记录而不猜测：

- Node/Bun/Deno 等运行时版本来源；
- TypeScript 版本与 `compilerOptions`；
- package manager 与锁文件；
- ESM/CJS 声明；
- 浏览器、Node、Worker、测试、Electron 等环境分别使用的配置；
- React/Vue 和构建工具的大版本。

版本来源优先级：锁定工具链配置、CI、manifest、锁文件、文档。不得把 Builder 所在环境版本当作项目版本。

## Scope

常见 scope：

```text
module:apps/web
module:packages/sdk
language:typescript
runtime:browser
runtime:node
framework:vue
framework:react
```

`.vue` 中的 TypeScript 属于 Vue 模块；Node 构建脚本不应继承浏览器 DOM 规则；测试配置可有独立编译环境。

## 访谈触发

仅在证据冲突时询问：

- JavaScript 存量是否迁移到 TypeScript；
- strict 提升采用全量、模块阶段还是新代码 Ratchet；
- 多运行环境是否拆分 tsconfig；
- ESM/CJS 目标与发布兼容范围；
- typed linting 的作用域和性能预算。

## 官方依据

- [TypeScript TSConfig](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Node.js packages: modules](https://nodejs.org/api/packages.html)
