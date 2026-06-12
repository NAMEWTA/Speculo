# README 类文档同步契约（通用）

README 类文档（`README.md`、各语言镜像版本如 `README-ZH.md` / `README.zh-CN.md` / `README-JA.md`）面向初次接触项目的外部读者。本契约提供**与具体项目无关的通用规则**；项目独有的小节结构、表格内容由项目自身的现有 README 决定，同步时保留既有结构做差量更新即可。

## 多语言镜像对等原则

如果项目维护了多语言 README，任何单边改动都必须在同一次同步内把其他语言版本补齐，包括：

1. **章节数量对等**：一级、二级标题数量相同
2. **章节顺序对等**：同样的标题在相同位置出现
3. **表格列数对等**：每个表格的列数相同，行数尽量一致
4. **代码块对等**：命令、路径、配置示例逐字相同，只翻译前后的说明文字
5. **链接对等**：外链 URL 相同；站内链接指向对方语言版本的对应文件

**不翻译的内容**（视为代码实体）：

- CLI 命令、命令行标志、子命令名
- 文件/目录路径、文件名
- 版本号、依赖名、包名
- 环境变量名、配置键
- 函数名、类名、API 路由

## 顶部约定（项目通用）

建议 README 顶部保留（按项目现状为准）：

1. 项目名称（一级标题）
2. 简短描述段（blockquote 或正文段落，一两句话）
3. 状态徽章（build / npm version / downloads / license / node version 等；均为代码实体，所有语言版本保持一致）
4. 如存在多语言镜像：语言切换行，格式建议 `**Languages:** **English** · [简体中文](./README-ZH.md)` 或等价形式

改动徽章或语言切换行时所有语言版本同步。

## 典型小节与同步触发器

下表给出常见小节及其通用同步触发条件；实际存在哪些小节由项目决定。

| 常见小节 | 同步触发条件 |
|---------|-------------|
| 简介 / 它解决什么问题 | 项目定位（tagline、package.json description 等）变化 |
| 特性列表 | 新增/移除对外能力 |
| Quick Start | 入口命令、安装命令、最小示例代码变化 |
| 安装 | 发布渠道、安装命令、前置依赖变化 |
| 使用 / 用法 | 主用例、典型调用方式变化 |
| CLI Reference | CLI 入口（通常是 `src/cli/**`、`cmd/**`、`bin/**` 等）命令增删或签名变化 |
| API Reference | 公共 API 导出表面变化 |
| 配置 | 支持的配置键、默认值、环境变量变化 |
| 架构 / 核心设计 | 顶层模块边界或核心抽象变化 |
| 开发 | `package.json#scripts` / `Makefile` / `justfile` / `pyproject.toml` 的任务入口变化 |
| 发布 / Release Pipeline | CI workflow / release automation 步骤变化 |
| 致谢 / Acknowledgements | 新增/移除显著借鉴项目、贡献者 |
| License | LICENSE 文件变化（通常只在换 license 时） |

## Quick Start 命令同步规则

代码块内容在所有语言版本中**逐字相同**，只翻译说明文字：

英文示例：

````markdown
```bash
some-cli init --name my-project
```
Initialize with a project name.
````

中文示例：

````markdown
```bash
some-cli init --name my-project
```
指定项目名进行初始化。
````

## CLI / API Reference 表同步规则

CLI / API 参考表必须反映代码中的实际入口（如 `src/cli/index.ts` 的 `program.command(...)` 声明、公共 API 导出列表、OpenAPI schema 等）。

同步流程：

1. 从代码中枚举实际命令 / 端点 / 导出符号
2. 对比现有 README 表格
3. 新增条目 → 所有语言版本同时加一行
4. 删除 / 改名 → 所有语言版本同步
5. 签名变化（参数、返回值、标志、必选/可选）→ 同步

表头在所有语言版本的列数固定；仅列名翻译。

## 目录 / 项目结构小节同步规则

如 README 含有项目结构树，它是代码树的当前快照。每次同步对照实际顶层目录，新增 / 删除 / 重命名要跟进。

建议约定：

- 只列到第二层目录；更深层用 `*` 或省略号
- 右侧注释可翻译，左侧路径全语言版本保持一致

## Development / Release 小节同步规则

- `开发` / `Development` 小节中的命令列表来自项目的任务运行器（`package.json#scripts`、`Makefile`、`justfile` 等）；新增脚本时所有语言版本同步
- `Release` / `发布流程` 小节反映 CI 实际步骤；workflow 改动（步骤增删、action 换版本、flag 变化）时同步
- 约束类语句（例如"版本号必须与 tag 对齐"）在所有语言版本中等价表达，不能丢失

## 文档交叉引用

如 README 有"相关文档 / Documentation"小节，所有语言版本都应互相指向对方语言版本与其他站内文档（AGENTS / CHANGELOG / CONTRIBUTING 等）。

## 常见错位示例

| 情形 | 处理 |
|------|------|
| 新增了一个二级标题但忘记在其他语言版本添加 | 同一次同步补齐 |
| 某表格某行描述改了，但其他语言版本未改 | 同步对应行 |
| CLI 参考加了新命令但另一语言未加 | 所有语言版本同步 |
| 徽章版本换了 | 所有语言版本同步 |
| 外链项目 URL 改了（项目迁移） | 所有语言版本同步 |

## 不做的事

- 不整页重写现有 README；只做差量修改
- 不翻译代码实体
- 不在 README 里复述 CHANGELOG / AGENTS 里的内容
- 不添加没有对应代码来源的"计划中"能力（那是 CHANGELOG 的工作）
