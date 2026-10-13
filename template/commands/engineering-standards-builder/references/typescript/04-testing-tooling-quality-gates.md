# TypeScript / JavaScript：测试、工具链与质量门禁

## 工具事实

从仓库识别并复用：

- package manager 与锁文件；
- formatter：Prettier、Biome 或其他；
- lint/static analysis：ESLint、typescript-eslint、Biome、Oxlint 等；
- typecheck：`tsc`、`vue-tsc`、framework build；
- unit/component：Vitest、Jest、Node test runner 等；
- browser/E2E：Playwright、Cypress 等；
- bundler/build：Vite、Webpack、Rollup、esbuild、framework CLI。

不得仅因为 Builder 熟悉某工具就引入或替换工具。

## Type-aware linting

- 先区分 syntax-only 和 type-aware rules；后者更强但有项目加载和性能成本。
- 使用与 Workspace/tsconfig 架构匹配的 parser project 配置；避免单一巨型 config 意外加载整个 Monorepo。
- 生成文件、配置脚本和不同 runtime 可有有理由的 override。
- rule disable 最小化到行或文件，写明 WHY 与删除条件。

## 测试

- 纯逻辑单元测试不启动完整框架或浏览器。
- DOM/组件测试验证公开交互和可访问输出，不读取私有状态。
- 与 layout、原生事件、浏览器 API 或 hydration 强相关的行为使用真实浏览器测试。
- package exports、ESM/CJS、SSR 和不同 runtime 使用消费方视角测试。
- mock timer、network 和 module 时在每个测试后恢复；避免全局泄漏。

## 门禁

项目规范记录真实命令与工作目录，例如：

```text
format-check
lint
[type-aware lint]
typecheck
unit/component test
browser/E2E test
build/package
```

如果命令尚不存在，标记 planned，不伪装为当前门禁。

## 官方依据

- [typescript-eslint typed linting](https://typescript-eslint.io/getting-started/typed-linting/)
- [TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references.html)
