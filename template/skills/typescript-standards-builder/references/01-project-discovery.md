# 项目发现与仓库事实分析

生成规范前必须先建立项目画像。不要凭技术栈名称猜测实际规则。

## 根目录与范围

确认：

- Git 或 Workspace 根目录。
- 规范覆盖整个仓库、某个应用还是某些包。
- 自动生成、Vendored、迁移冻结或第三方目录。
- 是否存在多个互相独立的 TypeScript 工程。

## 优先读取文件

按存在情况检查：

```text
package.json
pnpm-workspace.yaml
yarn.lock / pnpm-lock.yaml / package-lock.json
nx.json / turbo.json
 tsconfig*.json
eslint.config.* / .eslintrc*
.oxlintrc* / biome.json* / .prettierrc* / oxfmt*
vitest.config.* / jest.config.* / playwright.config.*
AGENTS.md / CLAUDE.md / CONTRIBUTING.md
.github/workflows/* / .gitlab-ci.yml
```

## 结构采样

至少查看：

- `src/`、`apps/`、`packages/` 的两到三个代表性领域。
- 普通 `.ts`、React `.tsx`、测试、声明文件和脚本。
- 公共入口、`index.ts`、路径别名和跨包导入。
- 运行环境边界，如 Web、Node、Electron、Worker、CLI。
- 最大或高频修改文件，判断职责和大小分布。

## 工具链事实

记录：

- 包管理器及版本。
- ESM、CommonJS 或 Bundler 模块模式。
- TypeScript 版本和严格选项。
- 格式化与 Lint 工具。
- 测试框架、浏览器测试和覆盖率工具。
- 构建、代码生成、发布和 CI 命令。
- Git Hooks 与暂存文件检查。

## 规范冲突识别

把发现分为：

### 已确定

例如：

- 所有普通文件已经统一使用 `kebab-case.ts`。
- React 文件统一使用 `PascalCase.tsx`。
- 单元测试全部为 `*.test.ts` 并与源码共置。
- `strict` 已启用。

这些事实不需要再问用户。

### 不一致

例如：

- 同一领域混用技术目录和领域目录。
- `type` 与 `interface` 无规律混用。
- 测试一部分共置、一部分集中。
- ESLint 与 Oxlint 同时存在但职责不清。

这些问题进入用户问答。

### 缺失

例如：

- 没有 CI 类型检查。
- 没有文件大小预算。
- 没有例外流程。
- 没有跨运行环境依赖限制。

缺失项应给出推荐默认值，再由用户确认高影响选择。

## 代表性统计

条件允许时，统计而不是凭印象判断：

- `.ts`、`.tsx`、测试文件行数分位数。
- 模糊文件名数量。
- `any`、`@ts-ignore`、规则禁用数量。
- 单元测试共置比例。
- Barrel 文件和循环依赖情况。

统计只用于形成推荐，不自动做大规模整改。
