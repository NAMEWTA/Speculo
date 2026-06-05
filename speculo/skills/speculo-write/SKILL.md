---
id: speculo-write
type: skill
name: Speculo Write
description: 创建或改造 Speculo workflows、skills、commands 的原子能力；当用户要求根据参考项目、外部技能、当前规范或产品意图，设计、迁移、融合、更新 Speculo 资产时使用。
---

# Speculo Write

## 何时使用

当任务是新增、迁移、融合或改造 Speculo 的 `workflows/`、`skills/`、`commands/`、配套模板、引用资料或 `.speculo/` 状态骨架时使用。

典型触发：

- “把这个外部 skill 迁移进 Speculo”
- “给 dev 加一个 review workflow”
- “做一个一次性归档 command”
- “把这几个旧技能融合成一个原子 skill”

## 输入

- 用户目标、成功标准、目标受众、约束和参考项目路径
- 现有同类资产：`speculo/workflows/<cat>/`、`speculo/skills/`、`speculo/commands/`
- 外部源材料：旧技能、参考 workflow、临时目录、README 索引、脚本、模板

本 skill 自带全部 Speculo 规范，已内化到下方 `references/`，**编写时不外读仓库 `docs/`**。

## 输出

- 合规的 Speculo workflow、skill 或 command 资产
- 必要的 `references/`、workflow phase 文件、workflow `_templates/` 或 command 内联模板
- 必要的 `.speculo/` 初始骨架或状态索引更新建议
- 文档、测试和残留路径检查清单

## 执行步骤

1. **判定资产类型** —— workflow、skill、command，或组合。规则见 `references/asset-selection-sop.md`。
2. **读取同类资产** —— 看目标目录里现有资产的真实写法，对齐风格，不直接套用外部技能格式。
3. **提取可复用行为** —— 从参考材料保留核心内容（触发、输入输出、铁律、边界、失败恢复、模板），只规范化路径、frontmatter、产物和渐进披露。
4. **设计文件结构** —— 入口、别名、状态字段、产物路径和验证清单。
5. **实施** —— 实施前确认不会覆盖用户已有改动；实施后同步索引、文档和测试。
6. **验证** —— 旧路径和旧工具名没有回流，运行项目测试或记录无法运行原因；提交前过一遍 `references/validation-checklist.md`。

## 渐进披露

- `references/asset-selection-sop.md`：判断应做 workflow、skill 还是 command 时读取。
- `references/workflow-authoring-sop.md`：创建或改造 workflow、phase、template、索引和状态字段时读取。
- `references/skill-authoring-sop.md`：创建原子 skill、迁移外部技能、拆分 references 时读取。
- `references/command-authoring-sop.md`：创建单步 command、调用 skill、设计归档产物时读取。
- `references/persistence-contract-sop.md`：需要 `.status.json` schema、目录命名、frontmatter 最小集或写入责任时读取。
- `references/migration-sop.md`：从 `temp/skills`、参考项目或旧 workflow 迁移能力时读取。
- `references/validation-checklist.md`：提交前检查 frontmatter、路径、模板、`.speculo/`、测试和旧路径残留时读取。
