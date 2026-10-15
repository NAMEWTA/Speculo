# Engineering Standards Builder：生成项目专属工程 Skill

[手册首页](../README.md) · [Command 目录](README.md) · [源入口](../../template/commands/engineering-standards-builder/COMMAND.md)

**业务 ID：** `command/engineering-standards-builder`

## 它是什么

根据项目真实代码、目录、配置、测试、CI 和模板，生成 AI 可反复使用的工程规范。它是明确调用的 Command，不是每次实现都必须运行的前置步骤，也不在新项目中自动启动。

## 什么时候用

项目已经有实际做法，但散落在代码和团队经验中；想让 AI 后续修改时准确找到范例、边界与质量门；或者原有规范与当前实现发生偏离，需要有证据地刷新。

```text
明确调用 command/engineering-standards-builder，为当前项目生成工程规范 Skill。
重点学习公共 API、前后端边界、测试和 CI，引用真实模板与成熟实现；
先展示最小 Skill Set 与来源，按我本次要求生成，保留其他已有 Skill。
```

## 会怎样做

1. 确认项目根、重点与排除范围，读取已有规范并验证其真实性。
2. 用确定性扫描建立拓扑，再审计真实实现、消费者与测试。
3. 环境允许且证据域独立时可只读分域取证，Leader 汇总并作为唯一 writer；无 team 时顺序完成。
4. 处理模板、目标实践与旧代码冲突，决定最小充分的 Skill 边界。
5. 展示新增/更新/保留/删除项，形成候选，验证后发布 Builder 拥有的文件。

## 你会得到什么

```text
.agents/skills/
├── engineering-standards/
│   ├── SKILL.md
│   ├── generated-skill-set.json
│   └── references/project/
└── <确有独立触发价值的领域-skill>/
```

根路由始终生成，领域 Skill 可以是零个，不按语言或目录凑数量。项目事实、模块地图、决定与例外、Skill Map、模板来源和 review checklist 都应可定位。

刷新只管理 `generated-skill-set.json` 已登记范围；第三方同名 Skill 和清单外内容不能覆盖。候选验证失败保留旧版本；重复运行不应产生无意义差异。

## 怎么知道结果有用

让它指出每条重要规范的实际证据，以及后续任务应该何时读取哪个 Skill；运行生成物严格验证和本次允许的项目质量门。缺少证据的规则应待确认，而非照搬通用检查清单。

此 Command 的现行源在 `template/commands/engineering-standards-builder/`。项目生成的 `engineering-standards` 与 Builder 自身是两种不同对象。
