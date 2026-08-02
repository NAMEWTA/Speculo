# 配置、依赖与自动化质量门禁

## 工具链必须形成门禁

这是固定默认原则。项目至少应通过稳定命令覆盖：

- 格式检查。
- Lint。
- TypeScript 类型检查。
- 单元测试。
- 构建。

按项目增加集成、契约、E2E、安全、许可证、包体积、依赖边界和本地化检查。

底层工具可替换，但推荐保持稳定脚本职责：

```text
format
format:check
lint
typecheck
test
build
check
```

## CI 顺序

常用顺序：

```text
install
  → format:check
  → lint
  → typecheck
  → unit tests
  → build
  → integration/e2e
```

实际顺序可并行优化，但不得省略项目确认的核心门禁。

## 禁止绕过

不得通过以下方式获得表面通过：

- 删除或长期跳过失败测试。
- 关闭核心 Lint 规则。
- 扩大 `any` 或强制断言。
- 无计划放宽 TypeScript 配置。
- 降低测试范围隐藏回归。
- 忽略构建或代码生成失败。

## TypeScript 配置

- 多运行环境使用独立配置或项目引用。
- 共享基线放在根配置。
- 浏览器和 Node 的 `lib`、`types`、模块解析隔离。
- 不为解决单个文件问题全局放宽配置。

## 依赖

- 运行时包进入 `dependencies`。
- 构建、测试、类型和格式工具进入 `devDependencies`。
- 锁文件提交，`packageManager` 固定工具和版本。
- 新依赖评估维护、体积、许可证、安全和平台兼容性。
- 不为一个简单函数引入大型依赖。

## 本地钩子

提交前钩子可只处理暂存文件以保证速度；完整类型检查、测试和构建由 CI 负责。项目规范必须写清本地与 CI 的职责边界。
