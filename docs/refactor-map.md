# v3 重构对应表

基线为 Speculo main [`9199c3b`](https://github.com/NAMEWTA/Speculo/tree/9199c3bd0cf983c131efbc6340e44ac8b83a583d)。PR #107 首版把精简做成了过度压缩，丢失了独立 Work 和专业资料。修正版按原能力逐项重写：保留任务方法、知识和可用工具，删除重复约束、强制表单与编排。

这是一份维护者核对记录，不是 AI 执行时必须读取的合同。单项技能以其当前源文件为准。

## 39 个 Work 的承接

四个领域入口仅负责定位任务。以下 39 项能力都可以独立使用；原 Ops 的五项合入 SpecDev。旧 ID 的安装选择兼容关系见 [升级说明](upgrade-v3.md)。

| 原 ID | 新 ID | 承接位置与能力 |
| --- | --- | --- |
| `learning/archive` | `learning/archive` | [冷归档](../template/workflows/learning/learning-a-archive/SKILL.md) |
| `learning/assess-and-plan` | `learning/assess-and-plan` | [评估背景并设计课程](../template/workflows/learning/learning-a-assess-and-plan/SKILL.md) |
| `learning/consolidate` | `learning/consolidate` | [主题整合](../template/workflows/learning/learning-c-consolidate/SKILL.md) |
| `learning/goal` | `learning/goal` | [目标学习（目标模式）](../template/workflows/learning/learning-g-goal/SKILL.md) |
| `learning/homework` | `learning/homework` | [课程作业与评审](../template/workflows/learning/learning-h-homework/SKILL.md) |
| `learning/init-setup` | `learning/init-setup` | [初始化学习系统](../template/workflows/learning/learning-i-init-setup/SKILL.md) |
| `learning/lesson` | `learning/lesson` | [完整课程讲解](../template/workflows/learning/learning-l-lesson/SKILL.md) |
| `learning/question` | `learning/question` | [深度探究与苏格拉底问答课](../template/workflows/learning/learning-q-question/SKILL.md) |
| `learning/review` | `learning/review` | [延迟保持与周期复习](../template/workflows/learning/learning-r-review/SKILL.md) |
| `media/brief` | `media/brief` | [选题与母内容简报](../template/workflows/media/media-b-brief/SKILL.md) |
| `media/deconstruct` | `media/deconstruct` | [对标结构拆解](../template/workflows/media/media-d-deconstruct/SKILL.md) |
| `media/hand-drawn` | `media/hand-drawn` | [固定画风提示词](../template/workflows/media/media-h-hand-drawn/SKILL.md) |
| `media/init-setup` | `media/init-setup` | [创作者初始化](../template/workflows/media/media-i-init-setup/SKILL.md) |
| `media/publish-draft` | `media/publish-draft` | [多渠道本地草稿](../template/workflows/media/media-p-publish-draft/SKILL.md) |
| `media/retro` | `media/retro` | [数据复盘与模板沉淀](../template/workflows/media/media-r-retro/SKILL.md) |
| `media/video` | `media/video` | [可验证代码视频](../template/workflows/media/media-v-video/SKILL.md) |
| `ops/project-deploy` | `specdev/project-deploy` | [项目与共享服务部署](../template/workflows/specdev/specdev-d-project-deploy/SKILL.md) |
| `ops/host-manage` | `specdev/host-manage` | [服务器环境与治理](../template/workflows/specdev/specdev-h-host-manage/SKILL.md) |
| `ops/initialize` | `specdev/environment-setup` | [控制端初始化](../template/workflows/specdev/specdev-i-environment-setup/SKILL.md) |
| `ops/server-connect` | `specdev/server-connect` | [服务器接入与登记](../template/workflows/specdev/specdev-s-server-connect/SKILL.md) |
| `ops/inventory-view` | `specdev/inventory-view` | [服务器与部署资产视图](../template/workflows/specdev/specdev-v-inventory-view/SKILL.md) |
| `person/mao-zedong-cognitive-os` | `person/mao-zedong-cognitive-os` | [毛泽东 · 认知操作系统](../template/workflows/person/person-m-mao-zedong-cognitive-os/SKILL.md) |
| `person/steelman-deliberation` | `person/steelman-deliberation` | [双向钢人论证](../template/workflows/person/person-s-steelman-deliberation/SKILL.md) |
| `specdev/archive-and-consolidate` | `specdev/archive-and-consolidate` | [归档与沉淀](../template/workflows/specdev/specdev-a-archive-and-consolidate/SKILL.md) |
| `specdev/code-review` | `specdev/code-review` | [代码审查](../template/workflows/specdev/specdev-c-code-review/SKILL.md) |
| `specdev/delivery` | `specdev/delivery` | [开发交付](../template/workflows/specdev/specdev-d-delivery/SKILL.md) |
| `specdev/diagnose-bugs` | `specdev/diagnose-bugs` | [诊断 Bug](../template/workflows/specdev/specdev-d-diagnose-bugs/SKILL.md) |
| `specdev/grill-with-docs` | `specdev/grill-with-docs` | [Change 决策访谈](../template/workflows/specdev/specdev-g-grill-with-docs/SKILL.md) |
| `specdev/implement` | `specdev/implement` | [实现与验收](../template/workflows/specdev/specdev-i-implement/SKILL.md) |
| `specdev/init-setup` | `specdev/init-setup` | [初始化设置](../template/workflows/specdev/specdev-i-init-setup/SKILL.md) |
| `specdev/learn` | `specdev/learn` | [学习与图解](../template/workflows/specdev/specdev-l-learn/SKILL.md) |
| `specdev/goal-plan` | `specdev/goal-plan` | [Goal 规划与执行](../template/workflows/specdev/specdev-p-goal-plan/SKILL.md) |
| `specdev/prototype` | `specdev/prototype` | [逻辑与 UI 原型](../template/workflows/specdev/specdev-p-prototype/SKILL.md) |
| `specdev/retro` | `specdev/retro` | [整体会话复盘与知识沉淀](../template/workflows/specdev/specdev-r-retro/SKILL.md) |
| `specdev/review-architecture` | `specdev/review-architecture` | [架构审查](../template/workflows/specdev/specdev-r-review-architecture/SKILL.md) |
| `specdev/spec` | `specdev/spec` | [编写 Spec](../template/workflows/specdev/specdev-s-spec/SKILL.md) |
| `specdev/tickets` | `specdev/tickets` | [编写计划型 Tickets](../template/workflows/specdev/specdev-t-tickets/SKILL.md) |
| `specdev/triage` | `specdev/triage` | [请求评估与分诊](../template/workflows/specdev/specdev-t-triage/SKILL.md) |
| `specdev/wayfinder` | `specdev/wayfinder` | [探索大需求与 Change 边界](../template/workflows/specdev/specdev-w-wayfinder/SKILL.md) |

## 资料与工具的处置

| 原内容 | 当前处置 | 原因 |
| --- | --- | --- |
| 领域与 Work 的任务方法 | 各自 SKILL 重写；按实际分支读取必要参考 | 保留专业能力，缩短当前上下文 |
| Person 原文资料库 | 保留原始来源文件，重写检索和引用说明 | 原文是可查证资料，不是模型约束 |
| UI 原型、CSS/JS、设计来源与研究快照 | 作为原型 Work 的按需资料保留；历史快照明确日期与用途 | 能运行或解释选择的资产有独立价值 |
| 源码 ZIP 的独立 Node 工具 | 保留原始实现、默认过滤和实际 ZIP 输出测试，重写调用说明 | 确定性打包能力与业务状态协议无关 |
| Media HTML 视频渲染 | 独立可选渲染工具与实际示例；不依赖业务状态表单 | 保留执行能力，取消阶段协议耦合 |
| 手绘风格与内容方法 | 改写为适用分支和可引用方法 | 保留任务辨别和专业细节 |
| 工作流 manifest / runtime-contract / 业务 schema | 移除 | 目录与标准技能足以发现；不再机器编排业务过程 |
| 固定 goal-plan / TASK / REPORT / 派单图 | 移除格式和调度协议；保留目标规划、切片和接续方法 | 用户按实际任务决定规模与工具 |
| Canonical 和重复生成的业务运行库 | 移除 | 直接读取当前权威技能与其资料 |
| 业务状态与语义 validator | 移除 | 字段和摘要不能证明设计、学习或交付质量 |
| 安装元数据、事务、路径与归属校验 | 保留 | 保护真实用户文件和故障恢复 |

## 文档承接

| 原文档类别 | 当前位置 |
| --- | --- |
| 概念、能力目录与使用说明 | [概念](concepts.md)、[能力](capabilities.md)、[快速开始](getting-started.md) |
| SpecDev 与 Ops 使用手册 | [SpecDev](workflows/specdev.md)、[完整交付流程](workflow.md) |
| Learning / Media / Person 手册 | [Learning](workflows/learning.md)、[Media](workflows/media.md)、[Person](workflows/person.md) |
| 八个有效 Command 的使用文档 | [命令指南](commands/README.md) 与各命令页 |
| 安装与恢复、排障、架构 | [CLI](cli.md)、[事务恢复](transaction-recovery.md)、[排障](troubleshooting.md)、[架构](architecture.md) |
| 交接与永久知识 | [流程与持久化](workflow.md)、handoff / project-maintenance 命令 |
| 媒体示例 | Media Work 的可运行离线示例和渲染方法 |
| 维护者五种 authoring 入口 | 一个 [维护者入口](../.agents/skills/speculo-author/SKILL.md) 按需路由到 Workflow / Work / Skill / Command 指导；Canonical 生成退役 |
| 上游与许可说明 | [研究依据](research.md)、[第三方说明](../THIRD-PARTY-NOTICES.md) 与资料旁的许可 |
| 已失效的编排计划、Canonical 和协议完整性文档 | 不再作为当前使用方法分发；原始内容保存在上述基线和 Git 历史 |

## Hub 与维护者方法

| 原技能 | 需要完整承接的能力 | 本轮承接方式 |
| --- | --- | --- |
| grok-bot-team-steward | 管家设置、账号/对象盘点、角色与技能/记忆/对话导出、本地比较、具名恢复、部分失败重试和覆盖核验 | 重写入口；按需的 export / restore / setup 三份指导；一份 snapshot 记录取代固定文件树 |
| gitea-repo | Gitea/Forgejo 定位、认证、issue/PR/标签/里程碑/Release、全量分页、未定响应重试 | 重写入口，保留并校正端点、scope、分页参考与真实 API 工具 |
| github-repo-steward | 账号清单、仓库保留/归档/删除、stars、权限诊断和执行读回 | 重写入口与相关参考，移除固定活跃天数、全量表格和权限失败后换身份尝试的错误建议 |
| vscode-fullstack | 多 Profile 与本机/远程作用域、扩展配置、运行时复用、JSONC 差异、功能验收与恢复 | 重写入口，保留语言/扩展/运行时的专项说明，按实际目标读取 |
| photo-retouch | 自然修饰、证件照、商品、局部物体、旅行社媒创意、修复扩图、身份与图像验收 | 重写入口，保留七类具体编辑参考及素材角色说明 |
| clash-client-profile | TUN/规则链、订阅覆写、DNS/节点 bootstrap、系统与浏览器路径、性能排错和回滚 | 重写入口，保留技术分支与三个确定性工具，不将 DNS 配置输入误删为业务状态 schema |
| linux-dev-disk-cleanup | 分区/inode 审计、APT/journal/snap/Docker/工具缓存清理、保留业务数据、实测收益 | 重写入口与平台参考，去除固定清理顺序和无关审批环节，保留具体对象及用途核验 |
| optimize-codex-config | Codex/Claude 初始化与体检、配置来源、隐私/额度状态栏、计划/apply/verify/rollback、诊断 | 重写入口；工具的计划完整性、writer/ACL 平台限制是实际程序约束，保留；移除每轮重复审批措辞 |
| proxy-region-locale | 目标城市/时区 ID、字段与作用域、三平台实际修改、生效和回滚 | 重写入口，保留平台命令与语言/键盘/NTP 边界 |
| system-health-audit | 实际主机基线、CPU/内存/IO/磁盘/工具链证据、瓶颈假设、可验证优化计划 | 重写入口，保留平台采样参考，恢复诊断方法与专项后续入口 |
| windows-dev-disk-cleanup | 卷空间审计、junction/云文件/VHDX 差异、缓存/应用/工具链清理、数据与活动运行时保护 | 重写入口与平台参考，保留实际执行方法与验证 |
| align-intent | 多诉求与因果关系复述、显式要求/推断/未知、纠正与授权、局部继续 | 重写入口，恢复真实语义对齐示例；已授权且清楚的工作继续，不强制每次等确认 |
| eli5 | 完整授课、短答、深挖、费曼/苏格拉底练习；先修/推导/类比边界/迁移；真实反馈与续课 | 重写入口，补充教学、深挖、练习三个方法参考；保留学习内容、移除 ID/状态机/固定题量与提交口令 |
| job-application | 经历原件、知识库索引、公司/JD研究、岗位匹配、简历/渲染、口播/预测题、能力提升 | 重写入口；experience / targeting / resume / interview / development / tools 按需参考；无强制19节/claim ID/双写配置 |
| ste-zh | 中文汇报与技术改写、英文实用/严格模式、术语一致、意义和不确定性保真 | 重写入口，恢复中文/英文/术语实例；无固定模板、封闭状态词或宣称官方合规 |
| herdr / orca | 外部 Agent 编排适配 | 仍删除：用户明确要求删除 Speculo 编排层，不属于误删的领域方法 |

维护者方法由 [speculo-author](../.agents/skills/speculo-author/SKILL.md) 路由到 Workflow、Work、Skill、Command 与能力保真重构五份指南。保留四类独立写作能力，取消 Canonical 生成链。
