# Speculo Skill Authoring Contract

## Prerequisites

编写 skill 前必须读取：
- [AGENTS.md](../AGENTS.md) — 代理手册
- [persistence-contract.md](./persistence-contract.md) — 持久化边界
- [.agents/skills/_shared/authoring-quality.md](../.agents/skills/_shared/authoring-quality.md) — 质量模型

## When to Create a Skill

- 能力有独立触发词或多个调用方。
- 逻辑在 commands、workflows 或其他 skills 间可复用。
- 任务需要专用 `SKILL.md` 配 references 和可选 scripts。

Workflow 内的一对一 `atomic-skills/<id>.md` 是持久化适配入口，不是可复用 `template/skills/<id>/SKILL.md`。前者遵循 [persistence-contract.md](./persistence-contract.md) 并只包装一个真实 SKILL；跨 workflow 复用的能力才按本文创建 skill package。

## SKILL.md Structure

- **Frontmatter**：`id`、`type: skill`、`name`、`description`。
- **Body**：步骤流程，每步有明确输入、输出和完成标准。
- **References**：共享契约指向 `docs/` 或专用 reference 文件。
- **Scripts**：仅用于确定性可重复操作。

## Quality Requirements

按 [authoring-quality.md](../.agents/skills/_shared/authoring-quality.md) 的质量模型：

- **可预测性**：每次运行遵循相同过程，不强求相同输出。
- **主导词**：用紧凑概念锚定 description、步骤和完成标准。
- **信息层级**：入口只保留每条分支都需要的步骤；分支细节放到直接指针后。
- **就近放置**：定义、规则、边界和完成标准放在使用位置附近。
- **完成标准**：每个工作单元以可检查条件结束；关键步骤要求穷尽。
- **单一事实来源**：共享契约放在 `docs/` 或唯一 reference，调用方只建立上下文指针。

## Pruning

逐句执行两个判断：
1. 这句仍影响行为吗？
2. 它相对模型默认行为改变了什么吗？

删除重复、沉积和无效操作。用正面目标描述期望行为；只有无法正面表达的安全边界才使用禁令。

## Completion Criteria

- 每条运行分支都能从 description 和入口可靠到达所需材料。
- 每项共享规则只有一个权威位置。
- 所有步骤都有可检查、关键处穷尽的完成标准。
- 入口中没有未触发分支的细节、同义重复或无效操作。
