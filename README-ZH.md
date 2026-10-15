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

领域和 Work 都使用标准 SKILL.md；共享方法在 references。AI 在未明确指定执行方式时按当前宿主正常执行（mode: lead），App、CLI 等均可，subagent/team 按宿主实际能力和授权使用。明确指定 CLI 交互、Herdr、Orca 等方式时按选择执行，与 current/worktree 独立，并在使用时读取所选工具指南。Speculo 不提供模型运行服务或 Run 状态机。Lead 持续推进已授权 Goal，负责证据核验、正式状态、集成和最终收口。项目协调选择文件可选，未指定方式时无需配置。完整获批 Spec 或 Ready Ticket 均可直接实现，不强制补 Goal；无票也可使用 worktree。选用 Herdr 后按需安装其项目 Skill，再核验受管会话，安装成功不等于运行可用。

读取、发现和投影不授权提交、推送、发布、部署或其他副作用。动作由拥有该步骤的入口确认已有授权；局部缺少权限只阻塞受影响分支。

普通 SpecDev Work 也可直接使用：明确项目、方法资源根和获批数据根即可，CLI 安装不是前置。新 change 在 README 中只保存一个整体 Outcome，进度按范围由 README、无票 Goal 或 Ticket/Evidence 负责；复杂规划、设计批准与集成门保留。

A 收尾核对 change、ADR、context、当前工程 docs，涉及 UI 时再核对 DESIGN。必要现役维护和设计发布完成后才整体移到 changes/archive，稳定名称不变；completed/cancelled 本身不证明验收或授予归档权限。

当前工程 docs 仅在明确请求基线时创建，已有负责文档则导航。I/A 在本次范围维护；docs-sync 仍是手动全局 audit/update/commit 入口，独立拥有 Git 和同步状态。

## 新版边界

CLI 保持 agents-v2 安装身份、staging 和显式恢复。新 SpecDev 活动使用 Markdown 协议，不生成全局/change status 镜像；旧活动数据须显式、定范围转换，混合或未知输入阻塞受影响写入。旧月份归档原位冻结，独立历史 reader 只读定位；其他领域保留各自持久化合同。[转换参考](scripts/references/migrate-specdev-markdown.md)说明仓库维护工具，init 不自动执行转换。

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
