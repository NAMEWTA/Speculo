---
name: typescript-standards-builder
description: 通过仓库事实分析与用户问答，为当前 TypeScript 项目生成项目专属编码规范 Skill。输出正式 Skill 到 .agents/skills/typescript-standards，并创建 Claude 强制引用入口；适用于 TypeScript、React、Node.js、Electron、CLI、库及 Monorepo。
---

# TypeScript Standards Builder

本 Skill 的职责不是直接把一份通用规范复制进项目，而是：

1. 分析当前仓库的真实结构、工具链和历史约定。
2. 使用简短、逐项的用户问答确认仍需决策的规范。
3. 将确认结果生成当前项目专属的 TypeScript 编码规范 Skill。
4. 把正式规范写入 `.agents/skills/typescript-standards/`。
5. 同时创建 `.claude/skills/typescript-standards/SKILL.md`，强制转向 `.agents` 中的唯一规范源。

详细规则采用渐进式读取。不要一次读取全部 `references/`。

## 最终输出目录

完成问答后，必须生成：

```text
.agents/
└── skills/
    ├── typescript-standards/
    │   ├── SKILL.md
    │   └── references/
    │       ├── 00-project-profile.md
    │       ├── 01-architecture-and-layout.md
    │       ├── 02-naming-and-files.md
    │       ├── 03-modules-and-dependencies.md
    │       ├── 04-type-system.md
    │       ├── 05-functions-async-errors.md
    │       ├── 06-comments-and-documentation.md
    │       ├── 07-testing.md
    │       ├── 08-framework-specific.md
    │       ├── 09-tooling-and-quality-gates.md
    │       ├── 10-review-checklist.md
    │       └── 11-decisions-and-exceptions.md
    └── typescript--standards/
        └── SKILL.md

.claude/
└── skills/
    └── typescript-standards/
        └── SKILL.md
```

`.agents/skills/typescript-standards/` 是唯一正式规范源。

由于兼容要求，必须额外生成双连字符入口：

```text
.agents/skills/typescript--standards/SKILL.md
```

该文件只负责跳转到正式的单连字符目录。

`.claude/skills/typescript-standards/SKILL.md` 必须只有一句话，并强制引用用户指定的双连字符路径：

```md
必须先读取并完整遵循项目根目录下的 `.agents/skills/typescript--standards/SKILL.md`，禁止在未读取该文件时执行任何 TypeScript 相关任务。
```

除这一句话外，不得添加 YAML、标题、空白说明、示例或第二句话。

## 已确认的固定默认原则

以下规则来自用户已认可的工程实践，应直接作为生成规范的默认基线；除非仓库存在框架、生成器或公共 API 的硬性冲突，不需要再次询问用户是否采用：

- **领域内部局部平铺**：明确领域内优先平铺文件，只有形成稳定子域后再增加目录。
- **文件名具体**：文件名表达领域和职责，禁止用 `utils`、`helpers`、`common`、`misc` 等模糊名称承载不相关能力。
- **控制文件体积**：为普通 TypeScript、React、测试和脚本设置不同的审查预算；阈值是拆分触发器，不是机械裁决。
- **注释关注 WHY**：注释解释兼容性、性能、安全、平台差异和非直观约束，不逐行翻译代码。
- **工具链形成门禁**：格式化、Lint、类型检查、测试和构建形成自动化质量门禁，不得通过关闭核心规则或删除测试绕过。
- **测试靠近实现**：单元测试与源码共置；跨模块集成、契约和 E2E 测试集中管理。
- **不机械复制结构**：复制规则背后的目的，不把 Electron、React 或某个工具的专属结构强加给不相关项目。

这些原则已分别融入架构、命名、注释、测试、复杂度、CI 和迁移参考文档，不再维护独立的 Orca 附录。

## 规则优先级

发生冲突时依次遵循：

1. 用户在本次问答中明确确认的决定。
2. 运行平台、框架、协议、生成器和公共 API 的硬性约束。
3. 当前仓库已经生效的配置和 CI 门禁。
4. 当前模块一致且可解释的局部惯例。
5. 本 Skill 的固定默认原则和通用推荐。

安全、数据正确性、资源生命周期和外部输入验证不得因为“历史一直如此”而继续弱化。

## 执行流程

### 阶段 1：确认工作区

确定仓库根目录和规范适用范围：

- 单一应用、单一包或整个 Monorepo。
- 是否只覆盖 TypeScript，还是同时覆盖 JavaScript、React、Node.js、Electron、CLI。
- 是否存在自动生成目录、第三方镜像或不应修改的区域。

仓库中可直接判断的事实不得反复询问用户。

### 阶段 2：读取仓库事实

按 `references/01-project-discovery.md` 检查：

- `package.json`、Workspace 配置和锁文件。
- `tsconfig*.json` 及项目引用。
- ESLint、Oxlint、Biome、Prettier、Oxfmt 等配置。
- 测试框架、测试文件命名和覆盖范围。
- `src/`、`apps/`、`packages/` 的实际结构。
- 路径别名、导出入口、包边界和运行环境。
- `AGENTS.md`、`CLAUDE.md`、`CONTRIBUTING.md`、CI 工作流。
- 文件行数、模糊名称、循环依赖和测试共置情况的代表性样本。

输出一份内部项目画像，区分：

- 已由仓库事实确定的规则。
- 存在冲突或不一致的规则。
- 必须由用户决定的规则。

### 阶段 3：进行自适应问答

按 `references/02-interview-workflow.md` 执行。

要求：

- 一次只确认一个决策维度；必要时可把高度关联的两项放在同一轮。
- 每个问题先给出基于仓库事实的推荐默认值。
- 提供 2～4 个具体选项，并允许用户自定义。
- 不询问已经能从配置或代码中确定的事实。
- 不要求用户重新确认上面的七项固定默认原则，除非仓库存在硬冲突。
- 新项目通常确认 5～8 个高影响决策；成熟项目通常只确认冲突和缺失项。
- 每轮记录决定，避免重复提问。

至少要解决以下仍然不明确的项目级问题：

- 规范覆盖范围与遗留代码执行策略。
- 目录主轴和运行环境边界。
- React 组件文件命名（仅 React 项目）。
- 导出、Barrel 和跨模块导入策略。
- `type` / `interface` 默认偏好及运行时验证方式。
- 文件大小预算和超限治理方式。
- 测试框架、命名、共置及 CI 必跑范围。
- 格式化、Lint、类型检查、构建和提交前门禁。
- 例外批准、TODO 与迁移记录方式。

### 阶段 4：生成前确认

问答结束后，向用户展示一份简洁的“规范决策摘要”，必须包含：

- 自动识别的仓库事实。
- 用户确认的选择。
- 使用默认值的项目。
- 需要保留的历史例外。
- 即将创建或更新的文件列表。

只有在用户确认摘要后，才写入项目文件。若用户已经在同一消息中明确要求直接生成，可完成摘要后直接写入，不重复确认。

### 阶段 5：生成项目专属 Skill

按 `references/17-generation-contract.md` 和 `templates/project-skill/` 生成。

生成要求：

- 项目 Skill 必须是当前仓库专属内容，不得包含与项目无关的框架章节。
- `SKILL.md` 保持精简，只包含适用范围、优先级、核心不可违背规则、参考路由和执行要求。
- 详细规则写入 `references/`，按任务最小化读取。
- 每条重要规则标记来源：`仓库事实`、`用户确认`、`默认基线` 或 `兼容例外`。
- 固定默认原则必须进入对应模块，不能只写在总览。
- 文件大小阈值应结合仓库分布和用户决定，不直接硬编码通用数值。
- 对遗留项目使用 Ratchet 策略，不强迫一次性重构全部代码。
- 不覆盖用户已有项目 Skill；若已存在，先读取并合并，保留项目特有条款，并展示变更摘要。

### 阶段 6：创建重定向 Skill

必须创建以下两个入口。

正式兼容入口：

```text
.agents/skills/typescript--standards/SKILL.md
```

内容必须只有一句话：

```md
本文件仅用于路径兼容；必须立即读取并完整遵循项目根目录下的 `.agents/skills/typescript-standards/SKILL.md`。
```

Claude 入口：

```text
.claude/skills/typescript-standards/SKILL.md
```

内容必须只有一句话：

```md
必须先读取并完整遵循项目根目录下的 `.agents/skills/typescript--standards/SKILL.md`，禁止在未读取该文件时执行任何 TypeScript 相关任务。
```

### 阶段 7：验证

生成后必须验证：

- 正式 Skill 路径存在。
- `SKILL.md` YAML Frontmatter 合法，`name` 为 `typescript-standards`。
- 主 Skill 引用的所有 `references/` 文件都存在。
- 没有保留孤立的 `15-orca-derived-observations.md`。
- 七项固定默认原则已分散进入对应模块。
- `.claude` 的 `SKILL.md` 恰好只有一句话。
- 双连字符兼容入口存在且只包含一句话。
- 项目专属规范没有复制不适用的框架或运行环境规则。
- 用户确认的决定与生成内容一致。
- 不存在 `typescript--standards` 与 `typescript-standards` 相互循环引用。

最后报告：创建、更新、保留和未能验证的文件。

## 参考路由

| 任务 | 读取文档 |
|---|---|
| 规则优先级和固定默认原则 | `references/00-governance-and-fixed-defaults.md` |
| 仓库扫描与项目画像 | `references/01-project-discovery.md` |
| 用户问答和决策收敛 | `references/02-interview-workflow.md` |
| 目录、边界、局部平铺 | `references/03-project-architecture-and-directory-layout.md` |
| 文件、目录和标识符命名 | `references/04-file-directory-and-symbol-naming.md` |
| 模块、导入、导出和依赖 | `references/05-modules-imports-exports-and-dependencies.md` |
| TypeScript 类型系统 | `references/06-typescript-type-system.md` |
| 函数、异步、错误和资源 | `references/07-functions-async-errors-and-resources.md` |
| 注释、JSDoc 和文档 | `references/08-comments-jsdoc-and-documentation.md` |
| 测试策略和共置 | `references/09-testing-strategy.md` |
| React 和前端 | `references/10-react-and-frontend.md` |
| Node、CLI 和跨平台 | `references/11-node-cli-and-cross-platform.md` |
| 格式、Lint、文件大小 | `references/12-formatting-lint-and-complexity.md` |
| 配置、依赖和质量门禁 | `references/13-configuration-dependencies-and-ci.md` |
| 安全、性能和国际化 | `references/14-security-performance-and-i18n.md` |
| Git、PR 和交付 | `references/15-git-review-and-delivery.md` |
| 遗留迁移和例外 | `references/16-adoption-exceptions-and-migration.md` |
| 输出目录和文件合同 | `references/17-generation-contract.md` |

完整索引见 `references/README.md`。
