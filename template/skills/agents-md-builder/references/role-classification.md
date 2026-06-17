# Role Classification

## 原则

为每个 manifest 目录判定**唯一**角色。按优先级顺序匹配，命中即停止。

角色决定：
- 使用哪个模板骨架
- 证据收集的重点方向
- AGENTS.md 的章节侧重

## 6 种角色

### 优先级 1：`repo-root`

**判定条件**：目录是项目根目录（扫描起点）。

**识别特征**：
- 路径等于 `scan_root`
- 通常包含 `.git`、顶层 CI 配置、workspace 声明等

**模板**：`templates/repo-root-AGENTS.md`

### 优先级 2：`scripts-docs`

**判定条件**：目录是特批的脚本/文档目录。

**识别特征**（满足任一）：
- 用户显式声明为 scripts-docs
- 自动检测：目录名匹配 `script`、`scripts`、`docs`、`docker`、`deploy`，且父目录是 manifest 目录

**特殊规则**：
- 不要求有 manifest 文件
- 只为根目录生成 AGENTS.md，不为子目录继续生成
- 必须显式说明“这是特批文档例外，不是 manifest 模块”
- 必须区分“可执行脚本”“SQL 资产”“配置模板”“运行时数据目录”

**模板**：`templates/scripts-docs-AGENTS.md`

### 优先级 3：`aggregator`

**判定条件**：manifest 声明了子模块、子项目或 workspace 成员。

**各生态识别方式**：

| 生态 | 识别方式 |
|------|---------|
| Node.js / TypeScript | `package.json` 含 `workspaces` 字段 |
| Java / Maven | `pom.xml` 含 `<modules>` 子元素 |
| Java / Gradle | `settings.gradle` 含 `include` 且当前目录是声明目录 |
| Rust | `Cargo.toml` 含 `[workspace]` 且当前是 workspace root |
| Go | 有 `go.work` 且使用 `use` 声明多个模块目录 |
| Python | `pyproject.toml` 含 `[tool.hatch.workspace]` 或 `[tool.uv.workspace]` |
| C / CMake | `CMakeLists.txt` 含 `add_subdirectory()` |
| Dart / Flutter | `pubspec.yaml` 含 `workspace` 且声明了多个 package |
| .NET | 目录含多个 `*.csproj` 且被父级 `*.sln` 或 Directory.Build.props 统管 |

**关键要求**：
- 必须解释子模块的分组逻辑，不是只列模块名
- 必须写清“哪些问题必须进入哪个子模块继续调查”
- 聚合层只说编排，不展开子模块实现

**模板**：`templates/aggregator-AGENTS.md`

### 优先级 4：`runnable-app`

**判定条件**：无子模块声明，但有明确的运行入口。

**各生态识别方式**：

| 生态 | 识别方式 |
|------|---------|
| Node.js / TypeScript | `package.json` 的 `bin` 字段、`main` 指向可执行入口、或存在 `src/main.ts`、`src/index.ts` 且脚本含 `start`/`dev` |
| Java | 存在 `@SpringBootApplication`、`@QuarkusMain`、`SpringApplication.run()`、`public static void main` |
| Rust | `Cargo.toml` 含 `[[bin]]` target，或 `src/main.rs` 存在 |
| Go | `package main` + `func main()` |
| Python | 含 `__main__.py`、`console_scripts` entry point、或 `if __name__ == "__main__"` |
| C / CMake | `CMakeLists.txt` 含 `add_executable()` |
| Ruby | `Gemfile` 含执行入口声明、或 `bin/` 目录含可执行脚本 |
| Elixir | `mix.exs` 含 `application` 配置且 `mod` 指向 Application 模块 |
| Dart | `pubspec.yaml` 含 `executables` 字段 |

**关键要求**：
- 必须写清启动入口、运行时装配、核心应用链路
- 必须写清内部依赖模块如何接入到当前应用
- 不改写成叶子模块的膨胀版

**模板**：`templates/runnable-app-AGENTS.md`

### 优先级 5：`contract-module`

**判定条件**：无子模块、无运行入口，主要职责是暴露类型、契约、配置或依赖约束。

**各生态识别方式**：

| 生态 | 识别方式 |
|------|---------|
| Node.js / TypeScript | `package.json` 的 `name` 含 `types`/`config`/`tsconfig`，或 `main`/`exports` 仅暴露 `.d.ts` 文件 |
| Java / Maven | `pom.xml` 的 `artifactId` 含 `bom`、或 `packaging` 为 `pom`（不含 `<modules>`）、或仅含依赖管理 |
| Java / Gradle | `build.gradle` 使用 `java-platform` 插件 |
| Rust | `Cargo.toml` 不含 `[[bin]]`，`[lib]` 仅暴露类型宏，且无实质运行时逻辑 |
| Go | `go.mod` 声明包但目录内仅含类型定义、常量、接口声明，无 `func main` |
| Python | `pyproject.toml` 仅含类型桩 (`*.pyi`)、或仅暴露 `__init__.py` 无函数体 |
| 通用 | 目录没有 `src/` 或仅有类型定义文件 |

**关键要求**：
- 必须解释约束了什么、被谁消费
- 没有 `src/` 时，显式说明这是约束层而非实现层
- 不要误写成运行时代码模块

**模板**：`templates/contract-module-AGENTS.md`

### 优先级 6：`capability-module`

**判定条件**：以上都不匹配的其余所有 manifest 目录。

**典型匹配**：
- 能力库、工具库、业务模块
- 数据层模块、领域模块
- 集成模块、中间件模块
- 共享组件库

**关键要求**：
- 必须写清导出面、核心分层、关键业务/能力入口
- 必须写清内部依赖与上游消费方
- 区分它是更偏能力模块、业务模块还是集成模块

**模板**：`templates/capability-module-AGENTS.md`

## 角色判定流程图

```
目录有 manifest 文件？
├── 否 → 是项目根？→ 否 → 是 scripts-docs？→ 否 → 非 manifest 目录，跳过
│                          └── 是 → repo-root
│                └── 是 → repo-root
└── 是 → 是 scripts-docs 目录？→ 是 → scripts-docs
         └── 否 → 声明了子模块？→ 是 → aggregator
                  └── 否 → 有运行入口？→ 是 → runnable-app
                           └── 否 → 仅暴露契约/约束？→ 是 → contract-module
                                    └── 否 → capability-module
```

## 角色与模板映射

| 角色 | 模板文件 |
|------|---------|
| `repo-root` | `templates/repo-root-AGENTS.md` |
| `scripts-docs` | `templates/scripts-docs-AGENTS.md` |
| `aggregator` | `templates/aggregator-AGENTS.md` |
| `runnable-app` | `templates/runnable-app-AGENTS.md` |
| `contract-module` | `templates/contract-module-AGENTS.md` |
| `capability-module` | `templates/capability-module-AGENTS.md` |
