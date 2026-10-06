# 30 个 Work 的实施与保真矩阵

基线：`1e698821a65cdd02a40e48f98e78e87ad498617b`。每行对应一个真实主入口；完整路径和摘要见 [work-matrix.json](work-matrix.json)。MOVE 是移出入口，不是删除能力；MERGE 表示语义统一维护，DELETE 仅适用于已由所列权威承接的重复说明。本次没有删除任何 Work、运行时目录、历史证据、schema 或执行器。

| Work | 操作 | 实际实施 | 保留合同 | 主入口字符数：前 → 后 |
|---|---|---|---|---|
| `specdev/archive-and-consolidate` | MERGE/MOVE | 重复完成清单删除；consolidate-from-code 生命周期移至既有 consolidation-interview；机械归档只由全局 Skill 维护。 | dry-run、确认、reconcile/publish 门、永久知识网关与历史只读 | 3206 → 2524 |
| `specdev/code-review` | MERGE/ADD | 统一激活读取；可选复用由新增 result-reuse 参考约束，完整输入、环境和原两轴证据不匹配即重审。 | 固定 SHA、两轴隔离、C/I 报告归属、当前验收与授权 | 2037 → 1705 |
| `specdev/diagnose-bugs` | MERGE/KEEP | 删除重复启动/完成/引用清单；F06 语义实验未启用，保留原红灯/假设/最小化门。 | 诊断不实施生产修复、区分性证据、可恢复 blocked | 3134 → 2437 |
| `specdev/grill-with-docs` | MERGE | 入口按当前 frontier 定位；公共启动不重复铺陈。 | 逐轮共识、真实用户高影响决定、change 内 LOG/CONTEXT/ADR | 1336 → 1381 |
| `specdev/implement` | MERGE/MOVE/ADD | 连同 implementation-procedure 删除重复预检与 finalization；Mock 按适用分支读；交付引用复用 Evidence。 | 真实 Skill 调用、TDD、Lead 独占状态/E2E、current 串行、required 候选集成 | 1537 → 1570 |
| `specdev/init-setup` | MOVE/MERGE | 首次配置和骨架步骤移入 first-setup；入口区分首次初始化、验证已有状态、CLI 迁移。 | 已知配置、原知识、roots、CLI-owned .gitignore、并发及数量偏好 | 5571 → 2413 |
| `specdev/learn-change` | MOVE/MERGE | 格式、编号算法和 ASCII 示例移入 lesson-format；入口保留事实读取与追加交付。 | 零专业背景、纯 Markdown/ASCII、原编号和旧文件、change-local、归档只读 | 4087 → 1693 |
| `specdev/goal-plan` | MERGE | 聚焦选定 map、可执行 frontier 和直接恢复证据，移除泛化重复读取表达。 | 五模式、父/子权威、旧 O 键、owner/授权/工作区策略 | 3348 → 3371 |
| `specdev/prototype` | MERGE | 删除重复启动/子文件列表，模板与 schema 指针放在使用步骤。 | 设计系统唯一权威、候选数量、用户选择、离线物化和逐字一致校验 | 3650 → 2986 |
| `specdev/review-architecture` | MOVE/ADD | report 与 selected-design 分开；选中候选访谈移入参考；修辞强度改为可观察代码压力。 | Markdown 格式、删除复杂性、ADR/领域约束；报告不自动建票或实施 | 5292 → 3725 |
| `specdev/spec` | MERGE | 入口收束为外部行为/验收接缝/Ready 的动作，格式与完整检查分别由模板/readiness 维护。 | AC/US/NFR/DEC/OOS、公共行为/数据/迁移/安全高影响阻塞 | 4288 → 2230 |
| `specdev/tickets` | MERGE | 强调覆盖缺口、真实 DAG 与票级 Skill 绑定，Map 不复制票状态。 | 用户数量、写集/共享资源、Ready 检查、规划不授权实现 | 2366 → 2432 |
| `specdev/triage` | MERGE/MOVE | 四模式改为条件路由；独有分类与风险动作移至既有 intake-protocol。 | 四类账本独立、来源冻结、本地权威、远程零未授权写、capture 无 Change | 9013 → 3056 |
| `specdev/wayfinder` | MERGE | 按当前调查、claim 与命中答案读取地图，不缓存全部票正文。 | 目的地约束、每会话一调查票、HITL、独立 Change 与共享答案指针 | 2420 → 2471 |
| `ops/project-deploy` | MOVE/ADD | 按分支读授权/持久化/布局/恢复；可选接受 SpecDev 事实但自行核对目标与执行授权。 | 固定构件、迁移单执行者、共享依赖、实际业务健康与双边回执 | 1986 → 2515 |
| `ops/host-manage` | MOVE/MERGE | 工具环境、Docker、隔离清理、入口治理合并至 host-profiles；接入/Node 引导归 S。 | 一台明确服务器、消费者影响、精确系统路径例外、旧环境与数据保留 | 2511 → 1687 |
| `ops/initialize` | MERGE | 聚焦 Controller 能力/状态/权限，详细凭据与初始化合同按实际步骤读取。 | 不默认登记 local Host，不制造工具版本/目标身份 | 1187 → 1198 |
| `ops/server-connect` | MERGE | server-onboarding 单点维护可信接入和固定 Node 引导，H 不再重复持有。 | hostkey/身份/认证、SHA256/ack 独立门、登记不等于接入或可部署 | 1187 → 1085 |
| `ops/inventory-view` | MOVE | 不加载执行授权、部署布局与秘密分支；共享 README 也按任务条件披露。 | 本地只读输入、fleet 独占产物、unknown/过期保真、视图失败不重跑业务 | 1474 → 1331 |
| `learning/archive` | MERGE | 共享启动和定位只由 activation-and-memory 维护。 | 整树冷归档、哈希/位置历史、只读原料、不等同掌握 | 1171 → 1041 |
| `learning/assess-and-plan` | MERGE | 合并重复启动，保留当前 artifact-layout 分支。 | OBJ/课程/来源对应、background 与 baseline 分开、原答不改写 | 1709 → 1579 |
| `learning/consolidate` | MERGE | 删除重复读取段落，引用现有搬迁/工件合同。 | 稳定 ID、父根锁、整树移动回滚、claim provenance、确认后发布 | 1930 → 1800 |
| `learning/goal` | MERGE/ADD | 移除重复长索引；明确允许必要范围澄清而不生成教学探针。 | 计划与外部执行器分开、≤15 课单元、每课最多10问、不假冒执行授权 | 5371 → 4422 |
| `learning/homework` | MERGE | 合并重复启动，保留当前 Homework 合同引用。 | 单文件提交/冻结原答/追加 Review、新 attempt、不替代 retention | 1471 → 1341 |
| `learning/init-setup` | MERGE/ADD | 首次空状态与已有状态验证分开，拒绝用空骨架补齐不明历史。 | 未知/v1 阻塞、已有 active/原答/掌握/知识与偏好保持 | 1445 → 1423 |
| `learning/lesson` | MERGE | 共享读取不重复，完整教学要求仍由 lesson-contract 与入口必要语义维护。 | 30–40 分钟、深度/边界/来源/文字替代、不评分、不自动出作业 | 1577 → 1447 |
| `learning/question` | ADD/MERGE | 按实际 n 生成并校验连续 Q/A；新增只读当前批次验证器，关闭前对 ready 原文逐字比对。 | 默认5题、用户指定数量、Response 提交、轻量 inquiry、不自动串联 | 2774 → 3190 |
| `learning/review` | MERGE/ADD | R 只写自身保持证据与 Change 投影，永久 context 由 C 的确认发布消费。 | 真实时间间隔、回忆/反例/迁移、原答与历史、不伪造掌握 | 1357 → 1369 |
| `person/mao-zedong-cognitive-os` | MERGE | 步骤/依赖/披露三套表合为一个有序阶段表，阶段细则仍按需。 | 特定方法论、模型/风格/数量、五阶段产物、引语索引回原文、旧状态 | 3766 → 2421 |
| `person/steelman-deliberation` | MOVE/MERGE | 完整状态 JSON 与候选发布操作移至 state-and-publication，入口保留阶段决策。 | 冻结 dossier、唯一关键问题、已答跳过、独立裁决、恢复与其他 Work 字段 | 7548 → 4264 |

## 主要迁移落点

| 原维护位置 | 唯一承接位置/原因 |
|---|---|
| 各 Work 重复 startup/read-scope 段 | 各 workflow 原有 activation-and-memory；主入口保留直接必读指针 |
| T-triage 四模式过程 | 既有 intake/reconcile/publish/capture-protocol；intake 独有分类/风险/路由迁入其协议 |
| SpecDev S 的重复格式/Ready 清单 | 原 spec-template、spec-readiness；主入口保留必要语义和执行动作 |
| SpecDev I-init 首次配置/骨架 | I-init-setup/references/first-setup.md；已有状态与迁移在入口分流 |
| SpecDev L 的编号/ASCII/格式示例 | L-learn-change/references/lesson-format.md；原数量/输出不变 |
| SpecDev R 选中方案访谈 | R-review-architecture/references/selected-design.md；仅用户选中且请求设计时加载 |
| SpecDev I 重复预检/候选集成 | 既有 execution-preflight 与 dev-worktree/finalize；Mock 分支不强制常驻 |
| OPS README 项目布局/路径规则 | ops/common/rules/deployment-layout.md，按 D 或 H 影响范围必读 |
| OPS README 状态/immutable 运行细则 | 既有 recovery.md 与原 schema；执行侧必读，不让 V 进入秘密分支 |
| OPS H 各平台/环境配方 | H-host-manage/references/host-profiles.md；接入与 Node 引导集中 server-onboarding |
| Person S 的状态 JSON/候选发布 | S-steelman-deliberation/references/state-and-publication.md，保留原全部字段和操作顺序 |
| Person M 三套阶段/依赖表 | 入口单个有序阶段表；细则、角色、语料原文未删 |

## 明确未作为冗余删除

Prototype Markdown/final、OPS 双边生成物、canonical、旧 CONTEXT/O 恢复键及 Skill 调用证据保留。生成的五份 canonical 和 Learning Work 索引由原工具刷新。引用图中的循环/孤立候选是审计线索，不是删除许可。没有因为文件相似或字符数目标删除安全、恢复、数量或用户偏好。
