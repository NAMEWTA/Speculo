---
name: writing-for-agents
description: Review or author agent instructions, Skills, AGENTS, commands and workflow contracts when explicitly requested.
disable-model-invocation: true
metadata: {"speculo-id": "writing-for-agents", "speculo-kind": "skill", "speculo-invocation": "user-only"}
---

# Writing for Agents

对明确要求的文档编写/重构使用本能力；不因仓库存在指令文件而自动审计。先读 [保真合同](references/document-contract.md)，确定真实源、调用方、owner、输出与恢复边界。

1. 从当前任务入口追踪相关调用和生成器，列出现存能力、数量、工具、权限、验证及失败语义。不要默认整读仓库。
2. 明确触发分支和近邻职责；入口保留每次必读步骤，只有分支规则、示例、flags 与模板下沉。需要审查结构与冗余时读 [编写原则](references/authoring-principles.md)，术语按需查 [GLOSSARY](GLOSSARY.md)。
3. 按单一规则 owner 合并重复；删除无效/过期内容，保留不可丢失的证据、研究、许可与必要元数据。新增或改变的行为单列。
4. 修订调用方与生成器，测试正常、近邻不触发、缺失输入、失败与恢复；语法通过不代表实际宿主行为。
5. 交付实际差异、全源字符统计、验证和未验证项。没有实际用量证据不声称 token 或额度节省。

## 宿主适配

Claude 的显式调用使用 disable-model-invocation；Codex 使用 agents/openai.yaml 中 policy.allow_implicit_invocation=false。metadata 仅描述策略，不授予权限。Speculo 的分发路径不等于宿主原生发现目录，安装/启用需由对应宿主方式完成；不要复制到系统或插件缓存。

AGENTS 放项目独有事实与作用域约束，工具可检验的规则交机械检查；CLAUDE 需要加载同层手册时使用 @AGENTS.md，保护用户现有内容。
