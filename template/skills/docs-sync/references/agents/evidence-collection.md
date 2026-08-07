# Evidence Collection

## 原则

写 AGENTS.md 之前，先收集证据，再落结论。不允许在没有文件支撑的情况下写结论。

**核心铁律**：
- 结论必须能被文件直接支撑
- 允许总结实现机制，禁止虚构业务语义
- 当证据不足以支撑强结论时，退回到“入口 + 调查顺序”的写法

## 通用证据收集顺序

适用于所有角色，在角色专属取证之前执行。

### 1. Manifest 文件

读取主 manifest 文件的以下内容：

| 生态 | 关键字段 |
|------|---------|
| Node.js / TypeScript | `name`、`description`、`scripts`、`dependencies`、`devDependencies`、`main`、`exports`、`bin`、`workspaces` |
| Java / Maven | `artifactId`、`description`、`packaging`、`<modules>`、`<dependencies>`、插件配置 |
| Rust | `[package]` name/description、`[dependencies]`、`[[bin]]`、`[lib]`、`[workspace]` |
| Go | `module` 路径、`require`/`replace` 指令 |
| Python | `[project]` name/description、`[project.scripts]`、`[project.dependencies]` |
| CMake | `project()`、`add_executable()`、`add_library()`、`target_link_libraries()` |
| 通用 | 任何描述当前模块定位、边界和依赖的声明 |

### 2. 关键目录结构

列出直接子目录，跳过忽略目录。粗略统计：

- 源码主目录（如 `src/`、`lib/`、`app/`）
- 资源/配置目录（如 `resources/`、`config/`、`assets/`）
- 测试目录（如 `test/`、`tests/`、`spec/`、`__tests__/`）
- 文档目录（如 `docs/`）

不超过 10 项。不要穷举，只列对定位问题有用的。

### 3. 关键入口文件

至少找到 3-6 个最能代表模块职责的文件：

- 入口/启动文件
- 导出索引文件
- 核心业务/能力文件
- 关键配置文件
- 测试入口

### 4. 依赖与消费关系

- 项目/仓库内部依赖了哪些兄弟模块
- 被哪些兄弟模块依赖（反向消费方）
- 若有外部关键依赖需要说明，只提 AGENTS 无法从 manifest 推断的

### 5. 测试入口

- 测试目录路径
- 测试运行命令（如果非标准）
- 测试覆盖范围简述

## 各角色专属取证重点

### `repo-root`

**优先读**：
- 顶层 manifest 的 workspace/multi-module 声明
- 顶层直接子目录的 manifest 清单
- 根级 CI/CD 配置（如 `.github/workflows/`）
- 根级工具链配置（如 `turbo.json`、`nx.json`、`lerna.json`）

**重点关注**：
- 顶层分层理由：为什么这样拆 apps/libs/modules
- 根级命令与任务编排
- 哪些是聚合层，哪些是叶子层

### `scripts-docs`

**优先读**：
- 脚本根目录下的直接子目录
- 根级读写脚本/管理脚本
- 配置文件与模板

**至少抽看**：
- 每个一级子目录的 1-2 个代表性文件
- 明确哪些子目录是运行时数据、初始化脚本、人工样例或环境配置

**重点关注**：
- 五类子树覆盖：脚本、SQL/迁移、配置、任务清单、样例数据
- 不需要穷举所有文件，但必须覆盖各类子树的职责和继续下钻入口

### `aggregator`

**优先读**：
- 父 manifest 的子模块声明（`<modules>`、`workspaces`、`members`）
- 子模块名称列表与各自 manifest 的关键字段

**至少抽看**：
- 1-2 个代表性子模块的 manifest 或源码入口
- 子模块之间的分组逻辑（BOM 组 / 核心能力组 / 应用组 / 业务域组）

**重点关注**：
- 为什么需要这个聚合层
- 子模块的分组逻辑，避免聚合描述空泛
- 不展开子模块实现细节

### `runnable-app`

**优先读**：
- 启动入口文件（如 `main.ts`、`Application.java`、`main.rs`）
- 路由/控制器入口
- 中间件/插件装配
- 运行时配置（如 `application.yml`、`.env`、`vite.config.ts`）

**至少抽看**：
- 请求/响应链路：路由 → 控制器 → 服务 → 数据层
- store / 状态管理入口（前端）
- 核心业务子树

**重点关注**：
- 启动链路与运行时装配方式
- 内部依赖模块如何组装进应用
- 不要把应用写成纯目录列表

### `capability-module`

**优先读**：
- 导出入口文件（如 `src/index.ts`、`mod.rs`、`__init__.py`）
- 主包路径下的核心分层目录

**至少抽看**：
- 最能代表模块职责的 3-6 个关键文件或子目录
- 如果存在明确的请求处理链路（controller → service → domain → mapper），写成排查路径
- 如果更偏框架扩展，重点看 config / plugin / utils / factory

**重点关注**：
- 它是能力模块、业务模块还是集成模块
- 被哪些兄弟模块消费
- 上下游依赖链

### `contract-module`

**优先读**：
- manifest 的依赖管理、导出声明
- 若存在类型文件/配置文件的目录

**重点关注**：
- 约束了什么：版本对齐、依赖传递、配置契约、类型契约、接口契约
- 由谁引用、为什么需要独立出来
- 没有 `src/` 时要显式说明这是约束层

**不需要**：
- 查运行时代码（它没有）
- 虚构消费链路

## 证据记录格式

收集证据时，在心里或临时笔记中这样组织：

```
[目录路径] <角色>
  Manifest: <关键字段摘要>
  关键目录: <3-6个>
  入口文件: <3-6个>
  内部依赖: <列表>
  消费方: <列表>
  测试: <目录或入口>
  定位: <一句话模块定位>
  核心逻辑: <2-3句话>
```

这是内部工作格式，不写入 AGENTS.md。目的是确保有足够证据支撑每个章节。

## 证据不足时的处理

当某个章节找不到足够证据时：

1. **Module Positioning**：退回到“目录位置 + manifest 声明”，不臆断定位。
2. **Core Logic**：退回到“入口文件 + 阅读顺序”，不虚构工作流。
3. **Dependencies**：只写 manifest 中直接看到的依赖，不推断传递依赖。
4. **Usage Notes**：只写可直接验证的提醒，不写猜测。

总之：宁愿留白，不造假。
