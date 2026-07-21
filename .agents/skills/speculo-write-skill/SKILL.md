---
name: speculo-write-skill
description: 创建、审计、合并或迁移 Speculo 的可复用 skill。用户要求新增 template/skills 能力、清理 SKILL.md、整合相似 skills、迁移外部 skill 或修复渐进披露时使用。
---

# Speculo Write Skill

## 过程

1. 读取 [AGENTS.md](../../../AGENTS.md)、[skill-authoring.md](../../../docs/skill-authoring.md)、[persistence-contract.md](../../../docs/persistence-contract.md) 和 [authoring-quality.md](../_shared/authoring-quality.md)。完成标准：当前 skill/frontmatter/持久化契约和质量杠杆已列成检查项。
2. 扫描 `../../../template/skills/`、调用它的 commands/workflows 和同类能力。按独立主导词、复用方和持久化责任判断新增、合并、重命名或删除。完成标准：每个候选 skill 只有一个清晰职责，重复能力已有明确归属。
3. 设计 `SKILL.md` 的触发、输入、步骤、输出和直接 reference 指针。Skill 只返回内容或写入调用方提供的路径；确定性重复操作才添加 script。完成标准：每条分支都可到达所需材料，入口没有分支专属细节和契约副本。
4. 实施最小文件集，更新所有调用方和索引。完成标准：没有断链、旧 id 残留、README 类附加文件或自选持久化根。
5. 运行 `pnpm validate-assets`、相关测试和新增 script 的真实样例。逐句执行相关性、无效操作、重复、沉积和蔓延审计。完成标准：所有校验通过，或每个阻塞都有命令输出和未完成影响。

