---
id: agents-md-builder
type: skill
name: AGENTS.md Builder
description: 扫描 manifest 目录并生成有证据、极简且形成父子导航树的 AGENTS.md 与 CLAUDE.md。
---

# AGENTS.md Builder

每份 AGENTS.md 是模块导读。逐行执行删除测试：删除后不会使代理犯错的内容不进入产物。

## 输入

- 项目根（默认 runtime context 的 project root）与可选目标子树。
- 可选 manifest 类型过滤和输出语言（默认中文）。

## 流程

1. 读取 `references/manifest-discovery.md`，发现 manifest 目录、忽略目录和父子树；同时列出无 manifest 却存在代理手册的目录。完成标准：扫描范围内每个 manifest 恰好出现一次，所有孤立手册已列为候选而未直接删除。
2. 读取 `references/role-classification.md`，按优先级为每个目录判定唯一角色。完成标准：所有目录都有角色及支持证据，没有多重分类。
3. 读取 `references/evidence-collection.md`，收集 manifest、入口、依赖、消费方和测试。完成标准：每个将写入的结论都能指向真实文件。
4. 读取 `references/content-contract.md`、`references/writing-style.md` 和对应 `references/templates/*`，自底向上生成或更新 AGENTS.md。完成标准：父子 routing 完整、内容不跨模块重复且逐行通过删除测试。
5. 读取 `references/claude-redirect.md` 生成同层 CLAUDE.md；展示创建、更新和删除候选，确认后再写入。完成标准：每个合法 AGENTS.md 有唯一重定向，非法候选的处置有记录。

## 输出

- 生成/更新的 AGENTS.md 与 CLAUDE.md 清单。
- 按角色统计、证据缺口和经确认清理的孤立文件清单。

本 skill 不自行选择 Speculo 报告路径；需要持久化时由调用方提供。
