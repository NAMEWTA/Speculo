# v3：研究依据与设计取舍

核对日期：2026-11-06。仓库改动基于 Speculo main `9199c3bd0cf983c131efbc6340e44ac8b83a583d`。本页记录重构原因，不作为运行技能的必读材料。

## 原始参考

| 来源 | 采用的原则 | 没有照搬的部分 |
| --- | --- | --- |
| [OpenAI：Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) | 精确触发、按需读取、删掉过细路线与泛化审批，明确交付终点 | 不因模型更强而宣称不必验证结果；文章的 persistence 指持续完成任务，并非磁盘存储规范 |
| [Agent Skills 格式规范](https://agentskills.io/specification) | 一个含 name/description 的 SKILL.md 就可组成技能 | scripts、references、assets 都是可选，不强制辅助文件 |
| [Matt Pocock：writing-for-agents](https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-for-agents/SKILL.md) | 一处维护事实、把环境视为来源、删除无用指导、拆分需有实际收益 | 不照搬 implement-spec 的任务图、合并者或固定子代理编排 |
| [Matt Pocock：domain-modeling](https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/SKILL.md) | 有内容才建文件，重大决定才写 ADR | 不要求普通实现细节逐个变成决策文档 |
| [Matt Pocock：to-spec](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md) | 综合已讨论内容，代码能更准确表达决定时保留代码 | 不搬入长用户故事模板或每阶段审批 |
| [Cursor：subtract-before-you-add](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-subtract-before-you-add/SKILL.md) | 先删除冗余 validator、模板和没有价值的层次 | pstack 中其他复杂架构/反思技能仍有重编排，不把整包当精简范本 |
| [Cursor：experience-first](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-experience-first/SKILL.md) | 必要时用可运行原型先确定体验 | 不让所有任务都必须先做 UI |
| [Cursor：never-block-on-the-human](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-never-block-on-the-human/SKILL.md) | 已授权且可逆的工作先完成，真正的产品决定由人参与 | 环境记录不能替代实际操作授权 |
| [DeepSeek：Agent Notes](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/notes/README.md) | 只补充代码无法表达的长效原因，更新已有 owning note，避免重复中心索引 | 不照搬双语 sidecar、封闭分类、章节和归档 hash 检查 |
| [DeepSeek：implemented notes](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/notes/implemented/AGENTS.md) | 当前事实随代码更新；历史归档不当作当前权威 | 不把每次执行过程都存入当前知识 |
| [Anthropic：Effective context engineering](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) | 少量相关上下文、轻量链接、按需回读，简单笔记支持长任务 | 最少不等于没有必要信息；不强制引入其多代理架构 |
| [Michael Nygard：Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions) | 重要决定保留短的原因与后果；替代时关联新决定 | ADR/context/error/design 四分类是 Speculo 约定，不冒称权威统一标准 |
| [Storybook：Writing stories](https://storybook.js.org/docs/writing-stories) | 代码可以准确描述 UI 状态与行为 | 不因此给所有项目增加 Storybook 依赖 |

公开参考中包含互相不同的取舍。例如 Matt 的 prototype 更倾向一次性分支，而本次用户要求设计可长期保留；Speculo 因此采用长期设计源与版本引用。这里是结合项目目标后的设计，不声称与任何上游逐字或行为等价。

## 关键决定

**一份技能承担一条连续工作链。** 软件开发与部署共用代码、版本、需求和环境背景，合并为 SpecDev。Learning、Media、Person 有独立用途，保留领域入口，但取消内部阶段工作流。

**持久化保存继续工作所需的事实。** 默认一份 release 记录，额外附件、spec、切片只有在改善可读性或并行责任时才拆。当前设计与环境方法在长期位置维护，归档固定当时事实。代码、配置和测试能够回答的问题不重复记录。

**删除业务控制面，保留文件保护。** 不再提供任务状态解析器、schema 校验器、会话协议和执行适配。CLI 的文件归属、路径校验、事务和恢复依然必要；它们与模型推理自由度无冲突。

**明确保留真实失效边界。** #105 的页面结构丢失和 #106 的人工验收被替代，分别通过设计版本直接引用、同状态实际审查、验收主体与真实决定表达。普通任务不增加人工门禁，已存在要求也不能被测试通过冲掉。

**验证作用于实际功能。** 安装、刷新、移除、打包和文件保护由自动测试验证。技能需要用具体任务检查结果；字数、文件数量、关键字扫描不能证明质量或 token 节省。本 PR 的实际测试记录见 PR 描述。

## 删除与保留

删除旧 workflows/common、模板、业务 schema、校验器、自动索引、Canonical 生成物、编排合同及其生成/测试支撑。原始版本可从 Git 历史回读。

保留完整专项工具的确定性实现和必要技术参考，保留真实许可证。被删除的协议测试随协议移除；文件安全、安装恢复、宿主暴露及升级数据保留测试继续运行。具体来源和复制代码归属见 [第三方说明](../THIRD-PARTY-NOTICES.md)。
