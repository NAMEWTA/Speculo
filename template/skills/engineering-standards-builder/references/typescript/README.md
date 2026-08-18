# TypeScript / JavaScript 适配器

当 Project Inventory 为某个 scope 识别到 TypeScript 或 JavaScript 时读取本索引。先读语言核心，再按证据选择框架、运行时和应用类型。

## 语言核心

- [检测、版本与作用域](00-detection-and-scope.md)
- [语言与类型系统](01-language-and-type-system.md)
- [模块、包与运行环境边界](02-modules-packages-and-runtime-boundaries.md)
- [函数、异步、错误与资源](03-functions-async-errors-resources.md)
- [测试、工具链与质量门禁](04-testing-tooling-quality-gates.md)

## 框架

- [React](frameworks/react.md)
- [Vue](frameworks/vue.md)

## 运行时

- [Browser](runtimes/browser.md)
- [Node.js](runtimes/node.md)
- [Electron](runtimes/electron.md)

## 应用类型

- [CLI](app-types/cli.md)
- [发布库 / SDK](app-types/library.md)
