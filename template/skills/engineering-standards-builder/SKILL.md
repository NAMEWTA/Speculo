---
name: engineering-standards-builder
description: 生成工程规范：先探索仓库技术架构，再通过最少必要问答，为 TypeScript/JavaScript、React、Vue、Java/Spring Boot、Go、Rust 及多语言 Monorepo 生成项目专属的代码、目录、测试、工具链与交付规范 Skill。
---

# Engineering Standards Builder

`engineering-standards-builder` 是为现有调用方保留的稳定 Skill ID；它生成的规范已经是跨语言的 **Engineering Standards**，不再以 TypeScript 或 React 为中心。

本 Skill 是一个“规范编译器”：

```text
仓库事实
  + 用户明确决策
  + 适用的通用规则
  + 适用的语言/框架/运行时规则
  - 不适用规则
  - 已记录例外
  = 当前项目专属工程规范 Skill
```

详细知识按分支渐进读取。不得在开始时一次加载全部 `references/`。

## 最终产物

默认 canonical 输出：

```text
.agents/skills/engineering-standards/
├── SKILL.md
└── references/
    ├── project/
    │   ├── 00-project-profile.md
    │   ├── 01-module-map.md
    │   └── 02-decisions-and-exceptions.md
    ├── rules/
    ├── typescript/     # 仅项目实际使用时
    ├── java/           # 仅项目实际使用时
    ├── go/             # 仅项目实际使用时
    └── rust/           # 仅项目实际使用时
```

兼容入口只能单向指向 canonical，不能复制规范正文或形成循环：

```text
.agents/skills/typescript-standards/SKILL.md
.agents/skills/typescript--standards/SKILL.md
.claude/skills/engineering-standards/SKILL.md
.claude/skills/typescript-standards/SKILL.md
```

仅在对应 Agent 目录已存在、用户要求兼容，或仓库已有旧路径时创建兼容入口。

## 执行过程

### 1. 锁定根目录、模式与写入边界

确定：

- 真实仓库或 Workspace 根目录；
- 覆盖整个仓库、指定模块还是指定路径；
- `create`、`refresh`、`merge` 或 `dry-run` 模式；
- 生成代码、第三方镜像、Vendor、构建输出与冻结区域；
- 已存在的工程规范、`AGENTS.md`、`CLAUDE.md`、`CONTRIBUTING.md` 和架构文档。

发生冲突时读取 [`references/rules/00-governance-and-precedence.md`](references/rules/00-governance-and-precedence.md)。路径与作用域判定读取 [`references/rules/02-evidence-topology-and-scope.md`](references/rules/02-evidence-topology-and-scope.md)。

未经明确授权，阶段 1～4 只读。不得执行项目安装、构建、测试、生成器或网络脚本来“探测”技术栈。

**完成标准**：根目录解析为真实路径；扫描范围、排除范围、运行模式、已有规范位置与允许写入位置均已记录。

### 2. 先搜索探索整个项目

先运行确定性扫描器，再进行人工语义抽样：

```bash
node <skill-root>/scripts/discover-project.mjs \
  --root <project-root> \
  --pretty \
  --output .engineering/project-inventory.json
```

扫描合同与补充检查见 [`references/rules/01-project-discovery.md`](references/rules/01-project-discovery.md)。扫描器是事实基线，不替代源码、CI 和架构文档抽样。`--output` 只接受根目录内路径；需要外部临时文件时省略该参数并由调用方捕获 stdout。

必须建立：

- 仓库拓扑：单项目、Workspace、Monorepo、多模块或多语言 Monorepo；
- 每个模块的路径、语言、框架、运行时、构建系统、测试系统和交付物；
- 源码根、测试根、公开入口、生成目录和边界；
- 已生效的格式化、静态检查、类型检查、测试、构建与 CI 命令；
- 每项判断的证据路径、置信度、冲突和未知项；
- 代表性源码样本，而不是只读取 manifest。

**完成标准**：每个可编辑模块都有唯一 scope；每项技术判断可追溯到证据；生成/Vendor/构建目录已排除；冲突和未知项均已列出；此时尚未向用户询问仓库中已经能确定的事实。

### 3. 按作用域装配规则包

始终读取通用规则；随后只读取与模块事实匹配的语言、框架、运行时和应用类型参考。

装配顺序：

```text
references/rules/*
  → references/<language>/*
    → references/<language>/frameworks/*
      → references/<language>/runtimes/*
        → references/<language>/app-types/*
          → 当前项目决策与例外
```

完整索引：

- [通用规则](references/rules/README.md)
- [TypeScript / JavaScript](references/typescript/README.md)
- [Java](references/java/README.md)
- [Go](references/go/README.md)
- [Rust](references/rust/README.md)

分支路由：

| 识别事实 | 读取 |
|---|---|
| 所有项目 | `references/rules/04`～`13` 中与任务相关的文件 |
| TypeScript/JavaScript | `references/typescript/00`～`04` |
| React | `references/typescript/frameworks/react.md` |
| Vue | `references/typescript/frameworks/vue.md` |
| 浏览器、Node、Electron | 对应 `references/typescript/runtimes/*` |
| CLI 或发布库 | 对应 `references/typescript/app-types/*` |
| Java | `references/java/00`～`04` |
| Spring Boot | `references/java/frameworks/spring-boot.md` |
| Go | `references/go/00`～`04` |
| Rust | `references/rust/00`～`04` |
| 未内置语言 | `references/rules/16-language-adapter-contract.md` 的 fallback |

一个模块出现 `.vue` 文件不能让整个仓库继承 Vue 规则；根目录存在 `package.json` 也不能让 Java、Go 或 Rust 模块继承 Node 规则。

**完成标准**：每个待采用规则包都有匹配证据和明确 scope；所有不适用包均已排除；通用层没有语言专属实现被误用。

### 4. 只解决无法由事实确定的高影响决策

读取 [`references/rules/03-interview-and-decisions.md`](references/rules/03-interview-and-decisions.md)。

仅询问会改变生成结果的问题，例如：

- 新代码立即强制还是存量 Ratchet；
- 模块边界、公开 API 和允许的依赖方向；
- 仓库中真实存在冲突的目录、命名、测试或工具链选择；
- React/Vue、Spring Boot、Go 或 Rust 的版本迁移与兼容边界；
- 临时例外的所有者、到期条件和删除条件。

每个问题：

1. 先给出仓库证据；
2. 给出推荐默认值及理由；
3. 提供 2～4 个可执行选项；
4. 记录用户选择、适用 scope 和来源；
5. 不重复询问已回答或已由仓库确认的事项。

用户已明确要求直接生成时，使用可解释默认值并把不确定项记录为“待确认”，不再额外阻塞写入。

**完成标准**：所有会改变目录、公共 API、强制级别、迁移策略或 CI 门禁的未知项均已决策或显式登记为待确认；没有固定数量的形式化问题。

### 5. 生成前形成可审查计划

展示：

- 项目模块地图与技术栈；
- 将采用和排除的规则包；
- 仓库事实、用户决策、默认建议和兼容例外；
- 当前状态、目标状态及迁移阶段；
- 将创建、合并、保留、移动或删除的文件；
- 将运行的验证命令。

用户在同一请求中已经授权实施时，展示摘要后直接写入，不重复要求确认。

**完成标准**：每个即将写入的文件都有来源和用途；没有未声明覆盖；兼容入口方向唯一。

### 6. 生成或合并项目专属 Skill

读取：

- [`references/rules/14-generation-contract.md`](references/rules/14-generation-contract.md)
- [生成模板索引](templates/README.md)
- 对应的语言/框架 references

生成原则：

- canonical 只有 `.agents/skills/engineering-standards/` 一份；
- `SKILL.md` 只保留每次执行必须读取的流程、作用域和路由；
- 详细规则按 `project/`、`rules/`、语言与框架分层；
- 只生成当前项目实际使用的语言、框架与运行时目录；
- 每条重要规则包含 `Scope`、`Level`、`Source`、`Verification`；
- 项目真实命令来自仓库事实或用户确认，不能凭空创造；
- `refresh`/`merge` 保留用户决策、公共 API、项目特有规则和未到期例外；
- 存量代码采用 Ratchet，不借生成规范发动无关的大规模重写。

**完成标准**：生成树可由项目事实和决策完整解释；没有不适用章节；canonical 内容仅存在一份；所有旧入口单向路由。

### 7. 验证并报告

先运行生成 Skill 验证器：

```bash
node <skill-root>/scripts/validate-generated-skill.mjs \
  --root <project-root> \
  --strict
```

验证合同见 [`references/rules/15-validation-contract.md`](references/rules/15-validation-contract.md)。

随后只运行仓库已经定义且本次允许执行的质量门禁。不得为获得通过而删除测试、关闭核心规则、放宽类型/编译配置或扩大例外。

最终报告：

- 创建、更新、保留和删除的文件；
- 实际采用与排除的规则包；
- 运行的命令、退出码和关键结果；
- 未执行或无法验证的项目门禁及原因；
- 待确认决策、临时例外与后续删除条件。

**完成标准**：静态引用、frontmatter、scope、兼容路由和选择性生成全部通过；项目门禁通过，或阻塞证据包含命令、退出码、路径和影响。

## Builder 自校验

维护本 Skill 本身时，fixture 合同见 [examples/README.md](examples/README.md)，并运行：

```bash
node scripts/sync-manifest.mjs --root . --check
node scripts/validate-builder.mjs --root .
node scripts/self-test.mjs --root .
```

脚本均无第三方依赖、接受显式根目录、拒绝路径越界，并提供 `--help`。
