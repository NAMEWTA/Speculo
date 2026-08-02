---
name: typescript-engineering-standards
description: 为 TypeScript、JavaScript、React、Node.js、Electron、CLI、npm 库与 Monorepo 项目提供可渐进加载的工程规范。用于新建项目、生成代码、目录设计、命名、类型建模、代码审查、重构、测试、Lint、CI、安全与质量门禁；详细规则按任务从 references/ 中最小化读取。
---

# TypeScript Engineering Standards Skill

本 Skill 将 TypeScript 工程规范拆成一个轻量主入口和多个主题参考文档。执行任务时采用**渐进式披露**：先判断任务类型，再只读取必要参考，避免把全部规范一次性加入上下文。

## 适用任务

在以下任务中使用本 Skill：

- 设计或调整 TypeScript 项目目录。
- 创建、重命名、移动 `.ts`、`.tsx`、测试或声明文件。
- 编写、补全、重构或审查 TypeScript/React/Node.js 代码。
- 制定团队编码规范、`AGENTS.md`、`CONTRIBUTING.md` 或 PR 检查清单。
- 配置 TypeScript、格式化、Lint、测试、构建与 CI。
- 处理类型安全、异步、错误、资源清理、安全、性能或跨平台问题。
- 对现有仓库做工程质量审计。

不在以下场景机械套用：

- 用户明确指定了不同规范。
- 框架、生成器或公开 API 有不可违背的约定。
- 任务仅是解释一段代码且不涉及代码修改或规范判断。

## 规则优先级

发生冲突时依次遵循：

1. 用户的明确要求。
2. 当前仓库已生效的配置、公共 API 与框架约定。
3. 当前模块已经形成且一致的局部惯例。
4. 本 Skill 的通用默认规则。

不要为了符合本 Skill 而进行与任务无关的大规模重命名、格式化或架构迁移。发现历史问题时，区分“本次必须修复”和“建议后续治理”。

## 核心执行流程

### 1. 识别任务和边界

先判断：

- 项目类型：Web、React、Node.js、Electron、CLI、库或 Monorepo。
- 任务类型：新建、增量开发、重构、审查、修复、规范制定或配置。
- 运行边界：浏览器、服务端、主进程、预加载、Worker、测试环境。
- 变更范围：单文件、单领域、跨模块或全仓库。

### 2. 检查仓库事实

修改现有项目时，优先检查：

- `package.json` 与锁文件。
- `tsconfig*.json`。
- ESLint、Oxlint、Prettier、Oxfmt、Biome 等配置。
- 测试配置与现有测试命名。
- `src/` 目录结构、路径别名和导出方式。
- `AGENTS.md`、`CONTRIBUTING.md`、README 与 CI 工作流。

不要假设项目使用 React、ESLint、Prettier、Vitest、Zod 或某种模块系统。

### 3. 最小化读取参考文档

仅加载与任务直接相关的参考文档。只有进行全仓库规范设计或综合审计时，才读取多个主题。

| 任务 | 首选参考 |
|---|---|
| 判断规则强度、处理冲突 | `references/00-standard-levels-and-precedence.md` |
| 设计目录、拆模块、平铺策略 | `references/01-project-architecture-and-directory-layout.md` |
| 文件、目录、变量、类型命名 | `references/02-file-directory-and-symbol-naming.md` |
| 导入、导出、Barrel、依赖方向 | `references/03-modules-imports-exports-and-dependencies.md` |
| 类型、`unknown`、联合、声明文件 | `references/04-typescript-type-system.md` |
| 函数、异步、错误、资源生命周期 | `references/05-functions-async-errors-and-resources.md` |
| 注释、JSDoc、TODO、文档 | `references/06-comments-jsdoc-and-documentation.md` |
| 单元、集成、契约、E2E 测试 | `references/07-testing-strategy.md` |
| React、Hook、状态、可访问性 | `references/08-react-and-frontend.md` |
| Node.js、CLI、路径、环境变量 | `references/09-node-cli-and-cross-platform.md` |
| 格式、Lint、文件大小、复杂度 | `references/10-formatting-lint-and-complexity.md` |
| 配置、依赖、脚本、CI | `references/11-configuration-dependencies-and-ci.md` |
| 安全、性能、国际化 | `references/12-security-performance-and-i18n.md` |
| Git、PR、评审和交付 | `references/13-git-review-and-delivery.md` |
| 老项目迁移、例外和渐进治理 | `references/14-adoption-exceptions-and-migration.md` |
| 了解 Orca 中提炼出的工程习惯 | `references/15-orca-derived-observations.md` |

完整索引见 `references/README.md`。

### 4. 应用核心默认规则

除非仓库事实或用户要求另有规定，默认遵守：

- 先按运行环境和业务领域划分边界，领域内部局部平铺。
- 文件名表达“领域 + 职责”，避免 `utils`、`helpers`、`common`、`misc` 等模糊名称。
- 一个文件只有一个主要职责；不要为单个文件机械创建目录。
- 默认使用命名导出，控制公共 API，禁止无意义全局 Barrel。
- TypeScript 开启严格模式；外部输入先作为 `unknown` 并在边界验证。
- 优先使用可辨识联合表达状态，使无效状态难以构造。
- 所有 Promise、监听器、Timer、连接和进程都有明确处理与清理路径。
- 注释解释原因、约束与权衡，不逐行翻译代码。
- 单元测试靠近源码；跨模块集成与 E2E 测试放在独立测试目录。
- 通过格式化、Lint、类型检查、测试和构建形成自动化门禁。

### 5. 生成或修改代码

生成代码时：

- 遵循仓库现有模块系统和格式风格。
- 新公开函数写明确返回类型。
- 不引入未经请求的新框架或依赖。
- 不用 `any`、双重断言、规则禁用或删除测试掩盖问题。
- 需要外部验证时，在边界层完成，不把不可信类型传播到内部。
- 修复缺陷时优先补回归测试。
- 只修改任务相关文件，避免格式噪声。

### 6. 审查和输出

代码审查时按以下优先级报告：

1. 正确性、安全和数据损坏风险。
2. 类型系统未覆盖的运行时风险。
3. 资源泄漏、竞态、取消与错误处理。
4. 架构边界、循环依赖和公共 API。
5. 测试缺口。
6. 命名、文件大小和可维护性。
7. 纯风格建议。

每条问题尽量包含：位置、风险、触发条件、修复方向。不要把个人偏好描述成缺陷。

## 常用模板

- 精简团队规则：`templates/AGENTS.typescript.md`
- 严格 TypeScript 基线：`templates/tsconfig.base.json`
- 多环境项目引用：`templates/tsconfig.project-references.json`
- 格式化基线：`templates/prettier.json`
- 编辑器基线：`templates/.editorconfig`
- npm 脚本示例：`templates/package-scripts.json`
- PR 模板：`templates/pull-request-template.md`
- 代码评审清单：`templates/code-review-checklist.md`

模板是起点，不得在未检查项目工具链时直接覆盖现有配置。

## 示例

- 项目目录示例：`examples/project-layouts.md`
- 命名模式示例：`examples/naming-patterns.md`
- 类型建模示例：`examples/type-modeling-patterns.md`
- 注释示例：`examples/comment-patterns.md`
- 审查输出示例：`examples/review-output-example.md`

## 交付要求

完成任务前确认：

- 变更符合当前仓库事实，而非仅符合抽象规范。
- 必要测试和质量检查已执行，或明确说明未能执行的项目。
- 没有增加无意义目录、模糊文件名或隐藏依赖。
- 没有通过削弱类型、关闭规则或跳过测试来获得表面通过。
- 输出聚焦本次任务；更广泛的治理建议单独列出，不混入必要修复。
