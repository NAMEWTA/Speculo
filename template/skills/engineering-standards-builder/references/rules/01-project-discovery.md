# 项目发现合同

## 原则

规范生成必须先建立 Project Inventory。扫描以只读、确定性、可追溯为目标：

- 不执行安装、构建、测试、代码生成或项目脚本；
- 不依赖目录名字猜测技术栈；
- manifest、配置、CI、源码与文档相互交叉验证；
- 每个判断保留证据路径和置信度；
- 扫描器结果是基线，必须再抽样源码和边界。

## 确定性扫描

运行：

```bash
node <skill-root>/scripts/discover-project.mjs \
  --root <project-root> \
  --pretty \
  --output <approved-path>/project-inventory.json
```

`--output` 只接受扫描根目录内路径；省略时只向 stdout 输出 JSON。

扫描器识别：

- Git/Workspace/Monorepo 拓扑；
- JavaScript/TypeScript manifests、Workspace、锁文件、tsconfig、框架与工具；
- Maven/Gradle、Java 源集与 Spring Boot；
- `go.mod`、`go.work`、Go package/command；
- Cargo package/workspace、toolchain、Rust crate；
- CI、Agent 手册、贡献文档、架构文档和已有规范；
- 源码/测试扩展名统计及代表性根目录；
- 生成、Vendor、构建和缓存目录。

## 人工语义抽样

至少检查每个可编辑模块的：

1. manifest/build 文件；
2. 编译、Lint、格式化和测试配置；
3. CI 中真正执行的命令；
4. 公开入口和模块边界；
5. 两到三个代表性业务目录；
6. 普通实现、测试、配置和入口文件；
7. 大型或高频修改文件；
8. 生成代码标记和不可编辑目录；
9. README、ADR、AGENTS、CLAUDE、CONTRIBUTING 中的有效合同。

只统计扩展名不等于理解架构。框架依赖存在但没有源码使用时，要记录为“依赖信号”，不能直接判定为全模块规则。

## 置信度

- **high**：manifest、编译配置、框架入口、CI 命令或源码导入明确声明；
- **medium**：大量稳定源码模式与目录结构相互支持；
- **low**：仅由目录名、少量文件或间接依赖推断。

低置信度、高影响判断必须人工确认或进入访谈。

## 排除目录

默认排除依赖、构建、缓存、Vendor 与生成输出，例如：

```text
.git node_modules dist build target out coverage
.next .nuxt .output .turbo .gradle vendor
bin obj .cache .venv __pycache__
```

项目明确把某个同名目录作为源码时，必须由证据覆盖默认排除，并缩小扫描范围。

## 发现完成条件

- 每个模块都有路径、语言、框架、运行时、构建和测试事实；
- 每个判断可追溯；
- 作用域互不混淆；
- 冲突、未知项和扫描限制已记录；
- 尚未向用户询问可以直接从仓库回答的问题。
