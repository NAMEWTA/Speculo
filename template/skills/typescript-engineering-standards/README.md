# TypeScript Engineering Standards Skill

这是一个采用渐进式披露结构的通用 TypeScript 工程规范 Skill。

## 使用方式

将整个 `typescript-engineering-standards/` 目录放入支持 Skill 的目录中，并以 `SKILL.md` 作为入口。不同平台的 Skill 安装位置可能不同；保持目录内部相对路径不变即可。

## 目录说明

```text
typescript-engineering-standards/
├── SKILL.md              # 主入口：触发条件、工作流、参考路由
├── references/           # 详细规范，按任务最小化读取
├── templates/            # AGENTS、tsconfig、格式化、PR 与评审模板
├── examples/             # 目录、命名、类型、注释和审查示例
└── manifest.txt          # 包内文件清单
```

## 设计原则

- `SKILL.md` 保持相对精简，不承载所有细节。
- 详细规则按主题拆分到 `references/`。
- 执行具体任务时只读取必要参考。
- 模板是起点，不直接覆盖现有仓库配置。
- 用户要求、平台约束和仓库事实优先于通用默认规则。

## 推荐入口

- 创建或审查项目目录：`references/01-project-architecture-and-directory-layout.md`
- 文件和标识符命名：`references/02-file-directory-and-symbol-naming.md`
- TypeScript 类型安全：`references/04-typescript-type-system.md`
- 注释和 JSDoc：`references/06-comments-jsdoc-and-documentation.md`
- 测试：`references/07-testing-strategy.md`
- 格式化、Lint、复杂度：`references/10-formatting-lint-and-complexity.md`
- CI 和质量门禁：`references/11-configuration-dependencies-and-ci.md`
