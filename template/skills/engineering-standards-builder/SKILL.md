---
name: engineering-standards-builder
description: 探索当前项目并生成或刷新项目专属工程 Skill Set，持久化到项目 .agents/skills/。
disable-model-invocation: true
---

# Engineering Standards Builder

本 Skill 只在用户明确调用时运行。它不会在新项目中自动启动，也不把 Builder 自带的通用建议直接复制成项目规范。

目标是先理解当前项目真实的代码、目录、配置、测试、CI 与模板，再生成一组可长期复用的项目专属 Skill：一个稳定的工程规范路由入口，以及零个或多个有独立触发价值的领域 Skill。

```text
项目事实 + 用户指定的重点范围 + 已确认目标
  -> 证据审计与冲突收敛
  -> 最小充分 Skill Set
  -> .agents/skills/
```

## 产物与所有权

始终生成根路由：

```text
.agents/skills/
├── engineering-standards/
│   ├── SKILL.md
│   ├── generated-skill-set.json
│   └── references/project/
│       ├── 00-project-profile.md
│       ├── 01-module-map.md
│       ├── 02-decisions-and-exceptions.md
│       ├── 03-skill-map.md
│       ├── 04-source-and-template-map.md
│       └── review-checklist.md
└── <optional-domain-skill>/
    ├── SKILL.md
    └── references/...
```

`engineering-standards` 是规范权威与路由器；领域 Skill 负责可独立触发的实现导航，不重复定义冲突规则。`generated-skill-set.json` 只登记 Builder 拥有的 `.agents/skills/*` 路径。刷新时不得改动或删除清单之外的 Skill。

## 最小原则

- 不按语言、目录或 Agent 数量机械拆 Skill。
- 能由根路由和少量 references 清楚表达时，不新增领域 Skill。
- 没有项目证据的规则不生成；Builder references 只提供审计维度与 fallback。
- 不复制项目源码、FM 模板或脚手架正文；引用其真实路径并说明适用条件、集成步骤和验证方式。
- 不新增配置文件、参数、时间戳、hash 或模型元数据来制造形式化负担。
- 扫描深度、文件数和字节限制只是脚本内部资源保护，不是用户需要决策的项目规范。

## 执行流程

### 1. 确定项目根与学习范围

从用户当前工作目录、Git/Workspace 边界和用户指定的代码或目录确定真实项目根。记录需要重点学习的模块、代码、目录、模板或脚手架；未指定时覆盖所有可编辑模块。

读取现有 `AGENTS.md`、`CLAUDE.md`、贡献文档、架构文档和 `.agents/skills/`，但将它们视为待验证证据。识别 generated、vendor、build、cache、fixture 与冻结目录。发现已有 `generated-skill-set.json` 时进入 refresh；只有 legacy `engineering-standards` 时，在计划中声明接管该根 Skill，其他现有 Skill 一律视为非 Builder 所有。

冲突优先级见 [治理与证据优先级](references/rules/00-governance-and-precedence.md)，路径和 scope 见 [证据、拓扑与作用域](references/rules/02-evidence-topology-and-scope.md)。本阶段只读。

**完成标准**：项目根、重点范围、排除范围、现有规范和 Builder 写入边界明确。

### 2. 建立确定性事实基线

运行扫描器并捕获 stdout；默认不在项目中持久化 inventory：

```bash
node <skill-root>/scripts/discover-project.mjs --root <project-root> --pretty
```

扫描合同见 [项目发现合同](references/rules/01-project-discovery.md)。扫描器只提供拓扑基线，不能替代源码审计。继续读取真实 manifest/build 配置、CI 命令、公共入口、代表性实现、测试、消费者与项目模板。

**完成标准**：每个可编辑模块有路径、技术栈、入口、质量门禁和证据；扫描限制、冲突与未知项已记录。

### 3. 用 Agent Team 分域取证

当运行环境支持 Agent Team 且存在两个以上可独立审计的证据域时，默认由 leader 并行派发只读 scout。证据域按项目真实边界划分，例如架构与公共 API、后端、前端、公共复用、测试与 CI、FM/脚手架；不得套用固定角色表。

leader 是唯一写入者。每个 scout 必须返回同一份精简证据合同：

```text
Scope
Observed capability
Canonical source paths
Mature implementations
Template paths
Consumers and tests
Applicable conditions
Legacy/counterexamples
Conflicts/unknowns
Recommended skill boundary
```

leader 必须复读高影响路径，检查跨域冲突，并把同一事实的重复报告合并。Agent Team 不可用或任务不可合理拆分时，leader 按相同合同顺序审计；结果标准不变。

**完成标准**：重要规范均有真实路径、消费者或测试支撑；反例、旧实现和未知项没有被“多数模式”掩盖。

### 4. 收敛规范与 Skill 边界

先识别项目已经声明的 canonical 模板或代码样板，例如 `docs/fm/**`、scaffold、generator assets。模板与成熟代码冲突时，判断它是目标模板、过期模板还是仅负责骨架，并记录 current、target 与 migration；不得静默任选一方。

只有同时满足以下条件才创建领域 Skill：

1. 有可独立描述的触发场景；
2. 会在多次开发中复用；
3. 有充分的项目源码、模板、测试或配置证据；
4. 与根路由或其他领域 Skill 边界清晰；
5. 独立后能明显减少无关上下文。

否则内容留在 `engineering-standards`。领域 Skill 名称来自项目语义，不使用固定列表或固定数量。高影响未知项按 [决策收敛合同](references/rules/03-interview-and-decisions.md) 询问；用户已授权直接生成时，将无法安全推断的事项记为 `pending-decision`。

只读取与项目事实匹配的 [通用规则索引](references/rules/README.md)、[TypeScript/JavaScript](references/typescript/README.md)、[Java](references/java/README.md)、[Go](references/go/README.md) 或 [Rust](references/rust/README.md) references。内置语言包和 [未内置语言 fallback](references/rules/16-language-adapter-contract.md) 是检查清单，不是高于项目代码的规范来源。

**完成标准**：每个生成 Skill 都有独立价值和证据边界；没有为了覆盖目录或技术栈而过度拆分。

### 5. 计划、生成与刷新

先展示精简计划：模块与证据摘要、Skill Map、每个 Skill 的来源路径、保留/更新/新增/删除项、冲突决策和验证命令。用户已在当前请求中授权实施时，展示后直接执行。

按 [Skill Set 生成合同](references/rules/14-generation-contract.md) 和 [模板索引](templates/README.md) 生成。所有项目引用使用项目根相对路径，并说明：何时读取、它负责什么、输出位置、需要哪些手工集成、运行什么验证。

先准备完整候选内容并校验，再替换 Builder 拥有的文件。刷新规则：

- 只更新或删除旧 `generated-skill-set.json` 登记的路径；
- 名称与未登记 Skill 冲突时停止覆盖并重新命名或询问；
- 保留仍有效的用户决策、例外和项目特有知识；
- 删除或重命名必须在计划中显式列出；
- 候选验证失败时保留旧 Skill Set；发布后验证失败时恢复旧内容；
- 相同项目事实与决策重复运行应无无意义 diff。

**完成标准**：根路由、领域 Skill、项目引用与所有权清单一致，清单外 Skill 未发生变化。

### 6. 验证与报告

运行：

```bash
node <skill-root>/scripts/validate-generated-skill.mjs --root <project-root> --strict
```

再按 [验证合同](references/rules/15-validation-contract.md) 执行项目已存在且本次允许的质量门禁。不得通过删除测试、放宽编译配置或扩大例外获取通过。

最终报告生成/更新/保留/删除的 Skill，关键证据与模板路径，运行命令及退出码，未验证项、待确认决策和临时例外。

**完成标准**：所有权、frontmatter、Skill 路由、项目内引用、选择性适配和规则字段通过；项目门禁通过或留下可复现阻塞证据。

## Builder 自校验

维护本 Skill 时读取 [fixture 合同](examples/README.md)，并运行：

```bash
node scripts/sync-manifest.mjs --root . --check
node scripts/validate-builder.mjs --root .
node scripts/self-test.mjs --root .
```

这些脚本无第三方依赖、接受显式根目录、拒绝路径越界，并提供 `--help`。
