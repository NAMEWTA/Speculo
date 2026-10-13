# Speculo

面向 AI Agent 的领域方法、标准 Skill 与显式 Command。当前版本 2.0.0。

[English](README.md) · [架构](docs/architecture.md) · [完整能力目录](docs/capabilities.md) · [安装恢复](docs/transaction-recovery.md)

## 安装

需要 Node.js >=22.22.3 <25；仓库使用 pnpm 11.1.3。

~~~bash
npm install -g @namewta/speculo
speculo init . --workflows specdev,learning --agent-skills domains
speculo init . --workflows all --agent-skills all --claude-skills all
speculo doctor .
speculo resolve . '<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>'
~~~

真实源安装到 .agents/speculo/，状态位于 .agents/speculo/.speculo/。仓库 template 是分发源，不是用户运行时。项目 AGENTS 只维护带标记的发现与永久知识块，保留其他内容。CLAUDE.md 已有内容保留，新建时引用 AGENTS.md。

非交互首次 init 默认仅核心 Command 与共享方法；--workflows 指定领域，--core-only 只刷新核心。未选择刷新但已经安装的领域仍保留。领域选择与宿主曝光是两个独立选项。

--agent-skills 与 --claude-skills 均接受 none、keep、domains、all，或逗号分隔的业务 ID（例如 specdev/implement,command/status）。新安装默认不投影，刷新默认保留选择。Skill YAML 从源原样复制，投影正文要求先读源。Command 包装另行表达宿主显式调用政策。第三方同名目录和人工修改保留，并逐项报告冲突。

## 领域与方法

- SpecDev：需求、规格、Ticket、Goal Plan、实现、审查、复盘与交付。
- Learning：课程、Lesson、提问、作业、复习、目标学习、整合与归档。
- OPS：主机发现、连接、资源初始化、部署及本地资产视图。
- Person：认知方法与双向钢人论证。
- Media：Brief、拆解、视觉、视频、发布草稿与复盘。

领域和 Work 都使用标准 SKILL.md；共享方法在 references。AI 按当前环境选用 Lead、Orca、Herdr 或用户指定无头 CLI，并在使用时读取工具指南。Speculo 不提供模型运行服务或 Run 状态机。Lead 持续推进已授权 Goal，负责证据核验、正式状态、集成和最终收口。项目协调选择文件可选，不存在时默认 Lead。

读取、发现和投影不授权提交、推送、发布、部署或其他副作用。动作由拥有该步骤的入口确认已有授权；局部缺少权限只阻塞受影响分支。

## 新版边界

仅支持 agents-v2 布局和当前 schema。遇到旧安装或旧事务时拒绝写入，保留原文件；不自动迁移、删除 runtime 或并行读取旧根。请在明确选择的干净项目中安装新版。安装事务与显式恢复独立于业务编排。

12 份 canonical 可从 template/canonical 单独取用；每份定义持久化与不可写时的完整文件交付。源码及第三方许可见 LICENSE 与 THIRD-PARTY-NOTICES.md。

## 开发与验收

~~~bash
pnpm install --frozen-lockfile
pnpm generate-assets
pnpm check
pnpm verify-bin
pnpm verify-generated
~~~

生成物必须可重建、二次生成无变化。测试使用一次性夹具；格式校验不代表宿主实际调用或真实模型交付已经验证。版本由 package.json 和 CHANGELOG 驱动，发布仍需明确授权。
