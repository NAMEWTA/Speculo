# 配置、依赖与 CI

## TypeScript 配置

- 不同运行环境使用独立配置或项目引用。
- 共享基线放在 `tsconfig.base.json`。
- 根配置只负责组合时可使用 `files: []` 和 `references`。
- 浏览器和 Node 的 `lib`、`types`、模块解析应隔离。
- 不通过放宽配置掩盖单个文件问题。

## `package.json` 脚本

提供稳定命令名，使开发者和 CI 不依赖具体工具：

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "build": "tsc -b",
    "check": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build"
  }
}
```

实际工具可以替换，但脚本职责保持稳定。

## 依赖分类

- 运行时需要的包放 `dependencies`。
- 构建、测试、类型和格式工具放 `devDependencies`。
- 锁文件必须提交。
- `packageManager` 固定包管理器及版本。
- 新依赖评估维护状态、体积、许可证、安全和平台兼容性。
- 不为一个简单函数引入大型依赖。
- 同一能力避免并存多个库。

## 配置边界

配置在入口处解析并转换为只读、类型安全对象。区分：

- 构建时配置。
- 启动时环境配置。
- 用户配置。
- 动态远端配置。

业务代码通过依赖或上下文接收配置，不到处读取全局变量。

## CI 门禁

推荐顺序：

```text
install
  → format:check
  → lint
  → typecheck
  → unit tests
  → build
  → integration/e2e
```

按项目增加：

- 依赖边界检查。
- 文件大小和复杂度检查。
- 安全扫描。
- 许可证检查。
- 本地化键检查。
- 包体积或性能预算。

## 本地钩子

提交前钩子可仅处理暂存文件，保证快速反馈；完整类型检查、测试和构建必须由 CI 执行。

## 禁止的“通过”方式

- 删除或长期跳过失败测试。
- 关闭核心 Lint 规则。
- 扩大 `any` 或强制断言。
- 放宽 TypeScript 配置而无迁移计划。
- 降低测试范围以隐藏回归。
- 忽略构建警告或生成失败。
