# Reference Index

本目录保存 TypeScript 工程规范的详细知识模块。`SKILL.md` 是唯一主入口；执行具体任务时只读取必要模块。

## 分类

### 治理与决策

- `00-standard-levels-and-precedence.md`：规则级别、冲突处理、事实优先。
- `14-adoption-exceptions-and-migration.md`：例外、遗留项目、渐进迁移。
- `15-orca-derived-observations.md`：从 Orca 工程实践中抽象出的可迁移经验。

### 架构与代码组织

- `01-project-architecture-and-directory-layout.md`
- `02-file-directory-and-symbol-naming.md`
- `03-modules-imports-exports-and-dependencies.md`

### 语言与实现

- `04-typescript-type-system.md`
- `05-functions-async-errors-and-resources.md`
- `06-comments-jsdoc-and-documentation.md`

### 平台与测试

- `07-testing-strategy.md`
- `08-react-and-frontend.md`
- `09-node-cli-and-cross-platform.md`

### 工程化与交付

- `10-formatting-lint-and-complexity.md`
- `11-configuration-dependencies-and-ci.md`
- `12-security-performance-and-i18n.md`
- `13-git-review-and-delivery.md`

## 读取原则

- 单文件命名问题：读取 `02`，通常无需读取其他文件。
- 类型错误或 API 设计：读取 `04`，涉及异步时再读 `05`。
- 新领域目录设计：读取 `01`、`02`、`03`。
- React 组件重构：读取 `08`，并按需补充 `04`、`05`、`07`。
- 全仓库审计：从 `00` 开始，再按仓库技术栈选择相关模块。
- 制定团队规范：先读 `00`、`01`、`02`、`04`、`10`、`11`、`13`，其余按技术栈补充。
