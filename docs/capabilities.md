# 公开能力

5 个领域、38 个 Work、10 个 Command。源目录与业务 ID 分离；业务 ID 用于显式投影选择。

| 业务 ID | 职责 | 源入口 |
|---|---|---|
| learning/archive | 用户明确关闭后移动整个 Change 树到日期目录；不做知识综合或掌握判断。 | [learning-a-archive](../template/workflows/learning/learning-a-archive/SKILL.md) |
| learning/assess-and-plan | 以目标和证据为起点建立课程、背景、基线、来源和可变 Lesson 地图。 | [learning-a-assess-and-plan](../template/workflows/learning/learning-a-assess-and-plan/SKILL.md) |
| learning/consolidate | 将选定 Change 物理嵌入父 Change，生成带 claim 级 provenance 的可迭代主题综合。 | [learning-c-consolidate](../template/workflows/learning/learning-c-consolidate/SKILL.md) |
| learning/goal | 为选定编程项目编译一份可被外部 /goal 执行的完整 Goal-Plan；计划会话可跟随 A 写出课程地图并按库存切 ≤15 的 mine unit，但不写 Lesson、不进行教学探针提问、不自动串联 H/R/C。 | [learning-g-goal](../template/workflows/learning/learning-g-goal/SKILL.md) |
| learning/homework | 以单一 Markdown 文件生成题目、接收显式提交并追加逐题评审；不与 Lesson 混写。 | [learning-h-homework](../template/workflows/learning/learning-h-homework/SKILL.md) |
| learning/init-setup | 初始化 Learning v2 的教学偏好、空索引、位置登记和可验证状态。 | [learning-i-init-setup](../template/workflows/learning/learning-i-init-setup/SKILL.md) |
| learning/lesson | 一次输出 30–40 分钟、通俗但完整的 Lesson；不生成作业、不评分、不宣称掌握。 | [learning-l-lesson](../template/workflows/learning/learning-l-lesson/SKILL.md) |
| learning/question | tutor 默认约 5 题、作答后讲解；explore 主动发现盲区并深入到处理与验证。无 Change 可创建轻量主题；两种模式不混写，不自动串联 L/H/R。 | [learning-q-question](../template/workflows/learning/learning-q-question/SKILL.md) |
| learning/review | 用户主动指定后，用真实时间间隔验证回忆、机制和迁移，并更新 retention evidence。 | [learning-r-review](../template/workflows/learning/learning-r-review/SKILL.md) |
| media/brief | 收齐输入、提出三类 Hook、核验事实并形成共享母稿。 | [media-b-brief](../template/workflows/media/media-b-brief/SKILL.md) |
| media/deconstruct | 按 Hook、叙事、视觉、节奏拆解实际材料，不复制独特表达。 | [media-d-deconstruct](../template/workflows/media/media-d-deconstruct/SKILL.md) |
| media/hand-drawn | 从21套菜单选择并原样调用已审查配方，默认不生图。 | [media-h-hand-drawn](../template/workflows/media/media-h-hand-drawn/SKILL.md) |
| media/init-setup | 建立经确认的档案，只检测依赖，不自动安装。 | [media-i-init-setup](../template/workflows/media/media-i-init-setup/SKILL.md) |
| media/publish-draft | 绑定版本与人工确认，导出可重复验证的本地媒体包，不发布。 | [media-p-publish-draft](../template/workflows/media/media-p-publish-draft/SKILL.md) |
| media/retro | 人工导入数据，提出单变量实验，经确认沉淀五类模板。 | [media-r-retro](../template/workflows/media/media-r-retro/SKILL.md) |
| media/video | 按规格、音频、分镜、静帧、预览与审核顺序形成真实成片。 | [media-v-video](../template/workflows/media/media-v-video/SKILL.md) |
| ops/project-deploy | 固定一个项目及目标服务器，配置项目容器、依赖、升级与双边文档，不隐式取得整台服务器的维护权限。 | [ops-d-project-deploy](../template/workflows/ops/ops-d-project-deploy/SKILL.md) |
| ops/host-manage | 只维护一个明确服务器的系统基线、Docker 和主机级入口，不把系统配置误路由到项目。 | [ops-h-host-manage](../template/workflows/ops/ops-h-host-manage/SKILL.md) |
| ops/initialize | 仅准备发起任务的控制端，建立受限状态根与本机工具证据，不默认登记部署服务器。 | [ops-i-initialize](../template/workflows/ops/ops-i-initialize/SKILL.md) |
| ops/server-connect | 处理指定服务器的可信 SSH、真实登录主目录探测、用户确认持久化根及接入登记，不部署项目或隐式改写 sshd。 | [ops-s-server-connect](../template/workflows/ops/ops-s-server-connect/SKILL.md) |
| ops/inventory-view | 从现有资源和检查证据生成简单 MD、标准 JSON 与离线 HTML，双向查看服务器与项目，不连接或修改目标。 | [ops-v-inventory-view](../template/workflows/ops/ops-v-inventory-view/SKILL.md) |
| person/mao-zedong-cognitive-os | 以毛泽东方法论为底座的问题诊断、战略制定与行动规划咨询 | [person-m-mao-zedong-cognitive-os](../template/workflows/person/person-m-mao-zedong-cognitive-os/SKILL.md) |
| person/steelman-deliberation | 将尚未厘清的复杂问题经真实问题重述、正反双向钢人化与关键变量识别，在一次关键追问后推进为明确判断和可执行行动 | [person-s-steelman-deliberation](../template/workflows/person/person-s-steelman-deliberation/SKILL.md) |
| specdev/archive-and-consolidate | 校验本地完成、源 Issue reconcile 门和票级 publish_action 门，复用全局归档能力移动 completed change 并提升当前知识，或从代码访谈形成可归档知识 change。 | [specdev-a-archive-and-consolidate](../template/workflows/specdev/specdev-a-archive-and-consolidate/SKILL.md) |
| specdev/code-review | 按用户指定的 PR、单 commit、区间或基线冻结真实比较范围，执行隔离的标准轴与规范轴审查；有效空差异诚实返回，不实施修复或发布。 | [specdev-c-code-review](../template/workflows/specdev/specdev-c-code-review/SKILL.md) |
| specdev/diagnose-bugs | 调查故障并建立精确症状的红灯回路，以单变量实验确认根因；无法安全复现时仅收集事件证据，不将解释冒充根因，也不实施生产修复。 | [specdev-d-diagnose-bugs](../template/workflows/specdev/specdev-d-diagnose-bugs/SKILL.md) |
| specdev/grill-with-docs | 一个已界定 change 仍有产品、领域或架构决定待确认时进行可恢复访谈；跨 change 边界未清晰时先用 W。 | [specdev-g-grill-with-docs](../template/workflows/specdev/specdev-g-grill-with-docs/SKILL.md) |
| specdev/implement | 执行已授权的 Ready Ticket 或获批 Direct Spec，覆盖代码实现与文档维护，产生可回读验收证据；不从模糊需求或只读审查直接写入。 | [specdev-i-implement](../template/workflows/specdev/specdev-i-implement/SKILL.md) |
| specdev/init-setup | 初始化 SpecDev 的语言、配置、全局状态、本地 change 追踪、领域知识布局、验证命令和并发治理。 | [specdev-i-init-setup](../template/workflows/specdev/specdev-i-init-setup/SKILL.md) |
| specdev/learn-change | 在开发完成后围绕当前 SpecDev change 回答问题，并用面向零专业背景读者的 Markdown 与 ASCII 图解持续记录理解。 | [specdev-l-learn-change](../template/workflows/specdev/specdev-l-learn-change/SKILL.md) |
| specdev/goal-plan | 为单个已拆票 change 或多个 Ready change 规划、执行或恢复 Goal；只在用户要求交付编排或已有 map 需推进时使用，不代替需求探索和 Ticket 编写。 | [specdev-p-goal-plan](../template/workflows/specdev/specdev-p-goal-plan/SKILL.md) |
| specdev/prototype | 按需验证离线逻辑模型，或检测现有项目的 UI 事实，按产品任务推荐并逐步选择设计风格，生成持久化设计系统文档、多风格 HTML 对照和可运行 HTML/CSS/JS 原型。 | [specdev-p-prototype](../template/workflows/specdev/specdev-p-prototype/SKILL.md) |
| specdev/retro | 对指定开发活动、环境或协作流程的已观察摩擦做证据化复盘，形成根因、改进 owner 与可检验提案；代码讲解使用 L-learn-change，Speculo 产品反馈使用 retro 命令。 | [specdev-r-retro](../template/workflows/specdev/specdev-r-retro/SKILL.md) |
| specdev/review-architecture | 审查指定代码范围的结构与维护成本，或测量真实用户操作的性能并形成候选；只报告或深入用户选定的设计，不直接实施优化。 | [specdev-r-review-architecture](../template/workflows/specdev/specdev-r-review-architecture/SKILL.md) |
| specdev/spec | 综合已知事实、设计决定、诊断与代码现状，产出以外部行为和验收合同为权威的 Ready Spec。 | [specdev-s-spec](../template/workflows/specdev/specdev-s-spec/SKILL.md) |
| specdev/tickets | 将已澄清的 Spec 或等价获批计划拆为可验收的实施 Ticket，并绑定真实项目 Skill；不用于探索未知需求或执行代码。 | [specdev-t-tickets](../template/workflows/specdev/specdev-t-tickets/SKILL.md) |
| specdev/triage | 摄入与核验外部请求、投影本地完成事实、交付 PR，或按明确目标处理 CI、安全告警、npm/GitHub Release 预检、发布和恢复；清晰的本地需求直接进入对应 Work。 | [specdev-t-triage](../template/workflows/specdev/specdev-t-triage/SKILL.md) |
| specdev/wayfinder | 大需求的 change 边界或实施路线尚不可见时建立探索地图，并分别澄清各 change；已有清晰 Spec 时不触发。 | [specdev-w-wayfinder](../template/workflows/specdev/specdev-w-wayfinder/SKILL.md) |

## Commands

- [command/archive-and-consolidate](../template/commands/archive-and-consolidate/COMMAND.md)
- [command/docs-sync](../template/commands/docs-sync/COMMAND.md)
- [command/engineering-standards-builder](../template/commands/engineering-standards-builder/COMMAND.md)
- [command/git-history-squash](../template/commands/git-history-squash/COMMAND.md)
- [command/git-repository-audit](../template/commands/git-repository-audit/COMMAND.md)
- [command/handoff](../template/commands/handoff/COMMAND.md)
- [command/retro](../template/commands/retro/COMMAND.md)
- [command/source-code-zip](../template/commands/source-code-zip/COMMAND.md)
- [command/status](../template/commands/status/COMMAND.md)
- [command/upstream-fork-sync](../template/commands/upstream-fork-sync/COMMAND.md)
