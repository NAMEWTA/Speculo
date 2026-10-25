# Speculo runtime guide

已安装时从项目根字面路径 `.agents/speculo/.speculo/workspace.json` 解析并验证 roots；SpecDev 直接使用可由入口确认明确项目/方法/数据根，按需读取安装根生成的 `catalog.json`；发现不激活、不授权。先按当前任务定位相关 workflow、command、skill 或 change，再读取对应入口和分支 reference；不默认整读 `.agents/speculo/` 或永久知识索引。

- 被动发现：按关键词/ID 搜索 `.agents/speculo/workflows/<workflow>/SKILL.md` 的相关行，只定位与当前请求相关的永久知识条目。
- 激活 workflow：再读取对应 `common/rules/activation-and-memory.md` 与所需运行合同、该领域的权威工件和当前 Work；只加载当前分支需要的规则、schema、模板与工具。
- 记忆检索：先定位索引 entry，再回读少量原文和 provenance；没有匹配证据时停止猜测。
- 记忆写入：先解析 owner/gateway，检查 pending transaction、lock 和 recovery evidence；网关未知时阻塞该写入并继续独立工作。
- 只读探索、静态编辑和本地测试可直接进行；提交、推送、发布、部署、远程写入、归档移动、永久知识改写和不可逆操作必须由拥有该动作的入口取得明确授权。
- 同一目标、动作和范围的明确授权由入口核对并复用；扩大范围、新增副作用或计划漂移时补充确认。已加载且未变化的合同不机械重读。
- 失败、漂移、schema 冲突、越界路径或 owner 不明时停止受影响分支，保留证据并报告恢复路径。

详细状态、所有权和副作用合同由各 workflow 的 领域/Work `SKILL.md`、manifest、`common/rules/` 和 schema 定义。

规划、修改或审查现有功能时，按 <Path>{roots.references}/change-scope/change-contract.md</Path> 核对调用关系与依赖，简列预计修改及可能受影响的文件与验证范围，明确最小充分修改范围。普通代码任务同样适用，不要求激活 workflow；影响清单不扩大可写权限。

规划、设计、文档和实现先检查已有实现与决策；出现知识缺口、复用比较或含引用内容的转写时，读取 <Path>{roots.references}/research-and-reuse/research-contract.md</Path>，用于确定研究范围和保留采用内容的原始来源。普通项目任务也适用，不要求激活 workflow。

文档结构、行为、迁移或所有权变化时，读取 `<Path>{roots.references}/writing-for-agents/references/document-contract.md</Path>`。普通修正直接核对相关事实、链接与格式；其他验证按改动风险选择。真实源优先，保留软链接、文件模式、许可、必要元数据、用户指定数量、默认工具和失败边界。重构保留可恢复的编辑前内容；字符统计仅用于重构评估。交付实际修改、验证和未完成项，不把字符变化当作 Token 或额度收益。

SpecDev 普通 Work 不要求全局初始化或重复业务 status；新对象从实际目录与 README 唯一 Outcome 发现，进度只由原 README/Goal/Ticket 之一负责。工程事实按需查看 <Path>{roots.state}/docs/README.md</Path>，缺失不妨碍普通工作。明确基线请求或本次文档修改时使用 <Path>{roots.references}/writing-for-agents/references/current-facts-docs.md</Path>；全局整理另由 project-maintenance 显式调用。

跨领域编排：用户明确要求协作或当前 Work 要求独立协作者时，读取 <Path>{roots.references}/coordination/coordination-contract.md</Path>。项目默认编排方式由公共 command/coordination-init 初始化；具体工具、模型、任务顺序和 Skill 由当次请求决定。用户明确要求 handoff 时读取 <Path>{roots.references}/handoff/handoff-contract.md</Path>，更新实际 change 的 handoff.md 或整体会话报告。
