# TypeScript / JavaScript：模块、包与运行环境边界

## Package 与公开入口

- Workspace package 只通过 `package.json` exports、声明的入口或项目确认的 public barrel 暴露 API。
- 跨 package 深导入内部路径默认禁止；内部测试若需要白盒入口，应建立显式 test-only contract。
- `main`、`module`、`types`、`exports`、`imports`、`bin` 与实际构建产物保持一致。
- package 内部可用相对路径或受控 alias；alias 不得绕过 Workspace 边界或发布时失效。
- 类型导入在项目工具支持时使用 `import type`，避免意外运行时依赖和循环。

## Barrel

barrel 不是通用默认。只有在以下条件成立时采用：

- 代表稳定 public surface；
- 不造成隐藏副作用、初始化顺序问题或循环；
- bundler、测试和 Node resolution 行为已验证；
- 不鼓励同 package 内部绕行 public 入口形成自循环。

“每个目录都建 `index.ts`”不得作为无证据强制规则。

## ESM / CJS

- 依据项目 `type`、扩展名、tsconfig、bundler 和消费者支持范围确定。
- Node ESM 的路径扩展名、条件 exports 和动态 import 按真实运行环境验证。
- 库同时发布多格式时，测试每个导出条件和类型解析；避免 dual-package state hazard。
- 测试工具与生产 runtime 的 module 模式不一致时显式拆分配置。

## 多运行环境

浏览器、Node、Web Worker、Service Worker、Electron main/preload/renderer、测试和构建脚本应拥有清晰边界：

- 不共享错误的全局类型；
- 平台 API 通过 adapter 注入；
- 环境变量只在对应构建/运行边界读取；
- 共享包不得隐式依赖 DOM 或 Node globals，除非 contract 明确；
- 不把 bundler 能解析等同于 Node/消费者能解析。

## 循环与副作用

- module 顶层副作用最小化；注册、polyfill 和启动逻辑放在明确入口。
- 循环依赖先修职责和依赖方向，不依赖打包顺序“碰巧可用”。
- 构建/测试通过不代表 lazy import、SSR 和生产 chunk 初始化顺序安全；高风险边界增加运行测试。

## 官方依据

- [TypeScript modules reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- [Node.js packages](https://nodejs.org/api/packages.html)
- [Node.js ECMAScript modules](https://nodejs.org/api/esm.html)
