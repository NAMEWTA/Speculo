# Speculo 全部 Work 优化升级：审查与实施计划

审查日期：2026-10-06  
状态：实施提案；未修改仓库、未运行仓库测试、未执行部署；本文不是执行或迁移授权。

## 1. 基线与覆盖范围

目标项目采用已连接仓库 NAMEWTA/Speculo 的 main：
`1e698821a65cdd02a40e48f98e78e87ad498617b`，2026-09-30，v1.0.18。
参考项目 mattpocock/skills 的 main：
`4588b32ecab9ecc9fc8cc6b6c5e7d675b6004b0d`，2026-10-05。

已读取四个 workflow 的 30 个主入口：SpecDev 14、OPS 5、Learning 9、Person 2；同时核对激活合同、关键状态/恢复/授权协议、Skill 调用契约及关键验证脚本。深层 references、所有执行器实现和所有测试未做逐文件穷尽审计。因此本文区分“已确认的文档/代码事实”与“待实测的行为风险”，不声称已完成运行时安全认证。本地未推送内容和其它项目内的安装副本不属于本次已验证基线。用户所称 DV 暂对应实际目录 specdev，不新增 dv 工作流。

## 2. 总体决策

保留持久化执行与恢复体系，精简模型需要读取的入口和重复说明。升级目标不是把 Work 全部改名为 SKILL.md，不是新增统一 Agent 运行时，也不是用远程 Issue 代替本地状态。

第一批变更保持：稳定 Work ID、状态根、现有 schema、已有授权边界、默认执行策略、历史工件字节和生成物权威关系。行为语义变更与文档重构分开提交、分开验收。

## 3. 上游参考如何吸收

| 上游内容 | 吸收方式 | 不照搬的部分 |
|---|---|---|
| writing-for-agents：触发指针、步骤/参考分层、单一事实源、通过实际运行识别无效指令 | 改写描述和条件引用；检查真实加载链；按行为回归决定删句 | 不把短文档等同于高质量；不把每一段都拆成新文件 |
| 1.3.0 implement-spec：任务图、ready frontier、集成分支 | 改善现有 T/P/I 的调度入口和上下文指针；检查现有实现与目标的差距 | 不替换已有调度器；不默认最大并发、reset、merge、清理 worktree |
| 1.3.0 retro：优先把机械问题转为确定性检查 | 增强已有 speculo-retro 分类及其提案格式 | 不新增同名复盘流程，不自动改 AGENTS 或永久知识 |
| 1.3.0 pr：最小变更示意、前后证据、合并风险 | 增强现有交付/PR 模板 | 不增加强制 PR Work，不从实现授权推断远程发布授权 |
| 移除 resolving-merge-conflicts | 删除重复的通用 Git 教程；冲突分支才加载项目协议 | 不删 Speculo 的 owner、基线、授权和候选集成检查 |
| CONTEXT 改为 GLOSSARY | 借鉴术语表的语义定位和发现能力 | 不为追随命名迁移 CONTEXT、永久知识或历史引用 |
| 调用与 YAML 修复、过期诊断跳转修复 | 增加发现、frontmatter、调用边、反向引用影响检查 | 不假设所有宿主都有同名 Skill 工具或相同隐式调用策略 |
| 10 月主分支文档精简和实验性功能 | 参考精简方法；实验功能单独评估 | 不将 chief-of-staff 等无关能力塞进 SpecDev/OPS |

外部指导采用 OpenAI 2026-09-11 的技能/提示词精简文章、2026-01-22 的 Skills Evals 指导，以及当前 Agent Skills 规范。X 已检索；没有用无法核实或不直接相关的帖子替代官方正文。“coco”未唯一确定，不将其擅自视为 Codex 或 Claude Code。

## 4. 已确认问题与风险

### F01：渐进加载检查验证了文字，但没有验证完整加载路径

文件：`scripts/validate-workflow-disclosure.mjs`。
当前主要检查 INDEX/入口是否出现激活、读取范围、memory 指针等文字，以及少数禁止全读的正则。它不能证明一次实际运行没有加载不相关分支，也不计算递归引用带来的成本。

改动：保留必要的结构检查；补充引用可达性、条件引用、孤立文件、循环引用和实际读取轨迹的检查。成本统计区分发现描述、激活必读和当前分支加载，统计去重后的内容，而不是简单相加文件长度。

### F02：默认场景命令成功不等于行为验证成功

文件：`scripts/evaluate-scenarios.mjs`、`package.json`。
无 trace 时返回 `fixture-ready` / `behavior: not-evaluated` / `score: null`，退出码仍为 0。提供 trace 与文件时可以检查顺序、禁止副作用和工件，但脚本明确不认证工具来源。

改动：区分夹具校验、离线工件门禁、真实 Agent 行为评估三类结果。发布门禁止把 fixture-ready 当行为通过。扩展现有 scorer 的输入采集，而不是另写一套评分系统。真实运行适配器应保存模型/宿主/版本/指令摘要、工具读取与副作用轨迹、退出码和产物摘要；凭据脱敏，证据来源不可由被测 Agent 单方面认证。

### F03：入口风格不统一，存在重复铺陈

W/G/T-tickets/P-goal/I-implement 已较接近路由入口；S、D、R、T-triage、I-init、L 等仍重复出现启动要求、输入枚举、流程、完成清单、子文件列表。

改动：按语义确定唯一维护点。入口保留触发、当前必要动作、权限/写入范围、完成与恢复条件；分支过程进入已有 reference。禁止只把全文搬到另一个必读文件以冒充优化。

### F04：T-triage 的四个模式在入口与独立协议双重展开

保留 intake/reconcile/publish/capture，入口改为模式表。不同模式的 source、triage、publish 和 capture 账本、授权、完成门仍独立，不合并状态权威。Capture 不创建 Change，不能因入口统一而误写 current_work。

### F05：OPS README 对轻量任务也暴露大量执行细节

V 本地资产视图只应消费允许展示的资源和证据投影，但共享激活文档同时包含 Docker、systemd、env、安装引导、数据布局等执行分支细节。

改动：激活文档保留层级选择、roots、状态/权限概览和关键停止规则；把已有详细规则按 S/H/D/V 路径引用。实际执行前仍必须读取适用的完整安全与恢复合同。V 不加载私密账本、不连接目标、不授予部署权限。

### F06：D 的部分门槛需要行为实验，而非直接作为冗余删除

现有规则要求无红灯回路时停止继续读代码构造根因理论；假设固定 3–5 个；最小化要求每个剩余元素都不可删除。

候选改动：允许只读收集与明确标注的未验证候选解释；根因确认仍必须有区分性证据。假设数量与最小化深度依症状、证据和资源预算确定。没有已验证根因时不得宣称确认，也不进入未授权生产修复。该项单独提交，失败则保留旧语义。

### F07：R 的报告交付与选中方案访谈需要更清晰的分支完成条件

现有 R 同时包含报告、选择一个候选进行访谈、转 Ticket；末尾完成清单包含选中候选的完整访谈。

改动：区分审查报告完成和已选择方案的设计完成。只请求 review 的任务不得被隐式升级为必须访谈或实施。把修辞性强度要求和强制英文词汇改为可观察的代码压力、收益、风险与证据；保留用户有意要求的报告格式和领域术语。

### F08：生成物、镜像和历史证据不是可直接删除的重复

Prototype 的设计系统 Markdown 是权威，final 文件是按工具物化并校验的一致副本；OPS 的双边记录是交付证据；canonical 内容有生成器。这些与双写事实源不同。

改动：标明 source-of-truth / generated / evidence / runtime 的角色，维护源文件并重生成派生文件，不手改两份，也不因相似度高直接删除。

### F09：Learning 参数表达和不同知识写入边界需要精确化

Q 允许用户指定题数，但步骤写 Q1…Q5 和“五题收成一课”；应改为 Q1…Qn、由本批实际数量驱动。G 的“不给学习者提问”应明确指不进行教学探针，而非禁止必要的范围澄清。
R 的 context topic view 更新，与 README 的 C 发布独占关系，应核对 topic-synthesis 和执行实现，明确投影更新入口，不让正文产生第二个知识写入者。此处属于待核对的所有权问题，不是已证实的运行时缺陷。

## 5. 不变量清单

| 不变量 | 迁移/回归要求 |
|---|---|
| workspace.json 是 roots 的来源 | 嵌套安装不新建错误的项目根 .speculo；路径逃逸被阻断 |
| 本地 Spec/Ticket/Map/Plan/Evidence 各有唯一权威 | Map 不成为第二票状态库；远程 Issue 不成为开发 tracker |
| CLI 管安装与迁移，Work 管领域工件 | 三方配置合并、targeted backup、opaque 工件字节保留；未知版本不猜测 |
| 正式知识经领域既有 owner/gateway | SpecDev A、Learning C/A 等语义分开；不统一成一个知识写入器 |
| Lead 与 workspace 所有权 | current 保持串行；required worktree 按既有策略；不抢锁、不接管他人事务 |
| 明确授权且有边界的连续执行 | 不增加逐命令确认；不从文档里的 approved 推断授权 |
| OPS 运行证据不可覆盖 | unknown/started-only 不重放；failed 需要恢复计划；docs-sync 不重跑业务 |
| 凭据与数据隔离 | secret_ref 默认；受限 env/配置镜像仍承认可能含秘密；无静默数据删除 |
| 身份与输入摘要绑定 | executor/input/credential/hostkey 漂移触发既有失效机制 |
| 生成物可验证 | Prototype 源码与物化文件一致；OPS bilateral receipt 有效；canonical 同源 |
| 用户偏好和领域数量 | 原型候选、W 调查限制、Learning 时长/题数/单元约束不被全局化或悄悄改变 |
| 历史兼容 | CONTEXT 路径、旧 O 恢复键、未完成票、原 Run/Release 证据与未知字段按既有合同保留 |

## 6. 30 个 Work 的逐项改动矩阵

路径根均为 `template/workflows/`。以下均为建议，不表示已实施。

| Work | 删除/移出入口 | 增强与保留 |
|---|---|---|
| specdev/I-init-setup | 重复 schema/目录/验证清单 | 分开首次初始化、已有状态验证、CLI 迁移；不伪造 Change |
| specdev/T-triage | 四个模式重复的协议和模板说明 | 模式路由表；本地权威、远程授权、各账本恢复保持独立 |
| specdev/W-wayfinder | 重复地图说明 | 条件指针；claim、独立 Change、一个调查票纪律、共享答案引用保持 |
| specdev/G-grill-with-docs | 重复 startup 与通用提问说明 | 保留 frontier、逐轮共识、change 内持久化；只问影响决定的问题 |
| specdev/D-diagnose-bugs | 重复完成清单；通用调试百科下沉 | 红灯和修复合同保留；未复现只读调查/假设数量作为独立行为试验 |
| specdev/R-review-architecture | 修辞强度、重复评分说明、机械术语要求 | report 与 selected-design 分支；代码压力、删除复杂性、证据、ADR 冲突 |
| specdev/P-prototype | 入口中的设计库细节、重复引用索引 | 按设计分支加载；保留设计系统权威、候选数量、偏好持久化、离线与一致性检查 |
| specdev/S-spec | 输入/步骤/DoD 重复；实现层细节 | 可观察 AC、边界失败、Ready 阻塞条件、验证接缝；模板/readiness 单一维护 |
| specdev/T-tickets | Map 与 Ticket 的复写信息 | 保留真实 Skill 绑定和 DAG；覆盖缺口、资源冲突、引用摘要更明确 |
| specdev/P-goal-plan | 重复 T/I 职责说明 | 保留 plan/run/resume/replan/verify 与 frontier；无权限升级、无全量读票 |
| specdev/I-implement | 总入口与 implementation-procedure 重复；分支外 TDD/mock 材料 | 按当前 workspace/票/风险加载；真实 Skill、双轴 review、Lead E2E 和不可变证据保持 |
| specdev/C-code-review | 重复标准全文和机械格式说明 | 两轴隔离；新增结果复用必须绑定完全相同的基线、head、规范、工具/环境相关证据 |
| specdev/A-archive-and-consolidate | 与全局归档 Skill 重复的机械规则 | 保留 wrapper、完成/远程门禁、毕业评估、dry-run/确认、supersedes |
| specdev/L-learn-change | 长格式示例、编号算法说明移至模板/现有工具适配 | 保留零背景、Markdown/ASCII、追加编号、change-local、已归档只读 |
| ops/I-initialize | 不相关服务器/部署细节 | 控制端能力与权限证据；不自动登记 local Host |
| ops/S-server-connect | 与 H 重复的引导说明 | 唯一 onboarding 参考；主机身份/hostkey、接入检查；登记不等于可用 |
| ops/H-host-manage | 所有工具、Docker、清理配方混载 | 按 profile 分支；消费者影响、精确系统路径例外、隔离/清理证据 |
| ops/D-project-deploy | 通用安装教程、与共享协议重复的授权说明 | 固定构件/目标、持久化映射、迁移单执行者、健康和双边交付；跨机不是全局事务 |
| ops/V-inventory-view | 一切不相关执行协议 | 本地最小读取；生成物独占；未测/过期/unknown 保真；视图失败不重跑业务 |
| learning/I-init-setup | 重复 startup | 首次空状态与既有状态校验的完成条件分开；保留原知识与偏好 |
| learning/A-assess-and-plan | 重复字段解释 | OBJ—Lesson—来源对应；baseline 原答不改写；有证据的可变课程地图 |
| learning/L-lesson | 与 lesson-contract 重复的展开 | 保留授课深度、边界、文字替代；完成不写 mastered、不自动出作业 |
| learning/Q-question | 写死五题的过程表达 | 用实际 n 生成 Q/A；保留 Response 提交与冻结、轻量 inquiry、已答不重问 |
| learning/G-goal | 计划入口中的执行菜谱细节 | 计划与外部执行器分离；范围澄清与教学发问区分；mine-unit 等领域数量保持 |
| learning/H-homework | 与 homework-contract 重复规则 | 单文件提交/评审；答案不可改写；attempt 追加；不替代 retention |
| learning/R-review | 重复复习政策 | 真实时间与回忆证据；核对 context 投影唯一写入口；无间隔不伪造通过 |
| learning/C-consolidate | 重复 relocation 过程描述 | 稳定 Change ID、父根锁、物理移动回滚、claim provenance、确认后发布 |
| learning/A-archive | 非当前任务的综合说明 | 冷归档与掌握判断分开；整树移动、哈希/位置历史、只读历史 |
| person/M-mao-zedong-cognitive-os | 步骤/依赖表/披露表三重重复 | 合并阶段路由表；保留特定方法论与产物；按引语索引回原文；旧状态兼容 |
| person/S-steelman-deliberation | 入口的大段状态 JSON 和候选文件操作细节 | 状态示例下沉 schema/模板；保留冻结 dossier、一个关键问题、已答跳过、独立裁决与恢复 |

## 7. 目标文档形态

维持现有目录和稳定 ID。改动“正文的职责”，而非为了统一而大规模搬目录：

- INDEX / AGENTS：发现与简短条件指针，不包含全套执行合同。
- workflow 激活合同：roots、领域权威、最小状态/授权约束、Work 路由。
- Work 主入口：触发/输入、当前必要动作、条件分支、完成与停止/恢复。
- references：一类完整分支的过程、定义、例外同处一处；避免碎片化和循环引用。
- templates/schema/tools：格式与机械校验；文档解释语义和不可由代码表达的取舍。
- runtime：原路径、原 owner、原恢复协议，不为缩短文档重建状态。

统一语义字段不等于强制每份正文填十几个标题。入口不新增长期运行状态副本。凡引用关系改变，需同步影响的生成器、源清单、兼容引用和测试。

示例：T-triage 的入口只保留四模式触发表、通用 roots/owner/零未授权写约束、各模式必读协议，以及不同完成/返回条件。它不会把四模式全部正文移到另一个仍然每次必读的大文件。

Skill 原生封装属于宿主适配层：复用现有 `skill-invocation.md`，真实调用或遵循 Skill 明确过程并记录证据；不假设任一平台都具备同名工具。现有 Work 的 `type: workflow-entry` 不应直接按 Agent Skills 的 SKILL.md 命名规则整体改写。

## 8. 建议新增/增强的能力

### E1：真实行为评估输入采集

扩展现有 eval 体系，增加宿主 trace 导入与标准化、可重复的隔离 fixture、版本/来源元信息。确定性门禁负责工件和副作用，语义评估只负责需求覆盖、可读性、停止是否合理等判断；不能用模型给自己的评分替代授权与执行证据。

### E2：文档引用影响分析

在现有 disclosure / links / source-parity 检查中扩展：条件指针是否明确；引用目标是否存在；被删规则是否仍有调用方；运行入口是否可达；改动是否影响生成的 canonical/index；重复说明是否有多个可写 owner。

### E3：小而可恢复的上下文交接

复用当前 checkpoint/Evidence/handoff。保存事实、决定、下一安全动作、未闭合副作用、来源 locator 与必要摘要；不持久化完整推理过程，不复制整套知识库。正常恢复读取最小证据；冲突、迁移与未闭合动作按既有协议扩读。

### E4：SpecDev → OPS 的显式交付引用

优先扩展已有 Evidence/部署 spec/双边回执中的引用，不新增全局状态库。交接至少应可定位 change/ticket、代码 revision、构件 digest、验收证据、目标/环境和部署约束。OPS 的目标与授权仍从其自身真实授权取得。

开发 done 不等于已部署；部署成功不代替开发合同验收；docs_pending/unknown 不能变成“完成”。OPS 回传 Run/Release/receipt 指针，不代写 SpecDev Ticket。

### E5：复盘优先减少未来重复指令

增强已有 speculo-retro 的提案分类：代码缺陷、机械检查缺口、文档指针问题、真正需要人判断的规则、环境/工具可发现性问题。机械问题优先提案到测试/lint/validator；高价值判断才写规范；不自动创建远程 Issue、修改全局提示词或永久知识。

## 9. 实施任务与依赖

所有路径写集仅为规划，执行前须核对 repo/workspace 与用户授权。共享规则与生成器由一个 Lead 负责，避免不同 agent 同时修改公共文件。

### U00：冻结基线、制作迁移与回归清单

依赖：无。
写集：当前规划 Change 的 review/inventory/evidence；回归 fixtures 的新增内容。
交付：30 Work 清单；直接/条件引用图；source/generated/runtime/evidence 分类；每项 KEEP/MOVE/MERGE/DELETE/ADD 原因；用户数量、工具偏好和兼容键；安装版本与 in-flight 记录清单。
验收：每项删改均有权威迁往何处或可删除的行为证据；没有遗漏 source-parity/canonical/index 的生成关系。未知本地差异记录为阻塞，不覆盖。

### U01：先补评估基线与发布门

依赖：U00。
写集：`scripts/evaluate-scenarios.mjs`、`test/fixtures/scenarios.json`、相应测试和隔离 trace 适配。
交付：夹具就绪/工件通过/真实行为通过的清晰结果；前后版本可比较的 trace；固定输入、多次运行、按宿主分组报告。
验收：无 trace 仍可做夹具检查，但不得作为行为发布通过；伪造声明不能替代实际工件；缺证据明确 not-evaluated；不触及生产凭据或服务器。

### U02：公共入口与引用治理

依赖：U00、U01。
写集：激活合同、现有 common/rules 的必要变动、`validate-workflow-disclosure.mjs`、链接/源一致性/生成器相关测试。
交付：最小激活协议；条件引用和权威维护点；改善后的验证器。
验收：保留必需的 roots/owner/授权/恢复边界；静态字面检查不强迫复制冗余段落；新文档与新 validator 同步通过；没有修改 runtime schema。

### U03：SpecDev 14 Work 文档重构

依赖：U02。
写集：SpecDev 主入口及其直接 refs/templates；同源生成输出通过生成器产生。
优先次序：T-triage → S/D/R/I-init/L → 其余入口；I 必须连同实际必读过程检查，不能仅缩短表层。
验收：所有 Work 分支、产物、完成门、用户数量、旧 O 键、CONTEXT、workspace 策略不变；外部 Issue 仍非 tracker。
禁止在本提交夹带 D 根因语义、R 审查范围、授权或状态迁移变更。

### U04：OPS 5 Work 文档重构

依赖：U02；与 U03 可在不重叠写集下并行。
写集：OPS README、I/S/H/D/V 入口和当前所需规则。
验收：V 不读敏感数据/不联网；S 首次信任不被 H/D task 授权代替；H/D 冻结任务不新增逐步确认；unknown 与 docs_pending 恢复保持；双边交付完整。
禁止在本提交改变 executor 行为、凭据策略、任务授权有效期或资源布局。

### U05：Learning 与 Person 11 Work 对齐

依赖：U02；共享文件仍单 owner。
写集：11 个主入口及必要的 refs/templates。
验收：授课/作业/复习/综合/冷归档仍分离；数量参数表达一致；原答和 claim provenance 保留；Person INDEX 仍由生成器生成且不引用不存在的 README；冻结 dossier 与用户答案可恢复。
教学方法、角色风格与数量政策不因全局文档精简改变。

### U06：针对性行为增强，逐项独立提交

依赖：相应 U03/U04/U05 加 U01 的实际回归基线。
候选：D 未复现时的只读调查；R report/selected-design；Q 动态题数；上下文/证据新鲜度；Dev→OPS 交接；retro 分类。
验收：每项都有最小复现、负例和可观察结果。既有字段能表示时不加 schema；确需字段/状态变化时登记显式 migrator、备份与兼容测试。不能把“可选技能”“上下文节省”作为跳过验收或授权的理由。

### U07：集成、迁移演练与恢复故障注入

依赖：U03/U04/U05，以及本轮纳入的 U06。
写集：集成 fixtures、测试、生成输出和 release 说明。
验收：原生根与嵌套根；已有 active change；旧票；配置用户修改；opaque 工件；锁冲突；跨任务独立分支；OPS started-only、终态 failed、文档故障、视图故障；新旧安装混用与 rollback。
所有 destructive/网络场景先在隔离环境模拟，真实目标另行明确授权。

### U08：发布、渐进启用与回退

依赖：U07。
先发布不改变 runtime schema 的文档批次，再发布验证过的行为变更。发布前盘点 in-flight OPS；执行器摘要变化会使旧批准失效，不能先换执行器再持旧批准续跑。沿旧协议处理未闭合运行，或根据实际证据形成新的获批恢复计划。
文档回退只回退受管理静态文件；不覆盖 state。已发生 schema 迁移不能只 git revert，需恢复相匹配版本与 targeted backup。保留原 Run/Release/receipt；unknown 不擦除。旧路径或键只有经过显式兼容窗口与迁移验证才退役。

依赖图：

```text
U00 -> U01 -> U02 -> U03 --+
                    |     |
                    +-> U04 +-> selected U06 -> U07 -> U08
                    |     |
                    +-> U05 --+
```

U03/U04/U05 只有写集不重叠时可并行；公共规则、manifest、生成器、版本与最终集成统一由 Lead 处理。

## 10. 验收矩阵

| 场景 | 必须观察到的结果 |
|---|---|
| 小型明确、已获准的修改 | 不强制宽泛 Grill/整库读取；仍守 Direct Spec 适用和验证边界 |
| 明确只要计划 | 不写项目实现、不提交、不部署 |
| 输入高影响不明确 | 只阻塞依赖该决定的分支；不替用户确认 |
| 读取路径缺失/Skill ID 错误/摘要漂移 | 不 ready 或暂停当前票；不伪造调用 |
| 用户指定 7 题/指定候选数量 | 按实际参数且保持领域允许边界；不回退写死默认数量 |
| 只要求架构报告 | 返回报告及证据，不强制继续访谈/实施 |
| 无 bug 复现 | 新试验分支可只读调查；不会把假设写成确认根因 |
| Context 中断后恢复 | 找到当前票/决定/证据与下一安全动作；已答问题不重问 |
| 其他任务持锁 | 不抢锁、不以年龄接管；独立已授权分支可继续 |
| nested workspace | 仅写已解析 roots，不新建错误状态根 |
| 刷新已有 config/不透明文件 | 三方冲突可见、受保护字节一致、未知版本阻塞 |
| 旧 O restore key/旧票 | 保留历史；执行前按原协议补契约，不重置历史状态 |
| 正式知识提升 | 仅既有 owner/gateway，证据与用户确认可回读 |
| OPS V | 只生成允许的本地投影；无 SSH/CDN/私密文件读取 |
| SSH 首次接入 | 真实 hostkey/认证条件满足；不自动信任 |
| 任务授权内 H/D | 正常步骤连续；范围/身份/输入漂移即阻塞 |
| SSH 中断、started-only | 保留 unknown，inspect-run；不自动重放、换 task_id 绕过 |
| 终态动作失败 | 新恢复计划；不覆盖旧回执 |
| 文档失败而业务已成功 | 只按既有文档恢复协议处理，不重跑数据库迁移 |
| 本地资产视图失败 | 保留业务成功和旧视图入口；单独报告视图失败 |
| 回滚旧镜像 | 不声称数据库已回滚；项目专用恢复验证 |
| 明文文档策略 | 默认 secret_ref；不假称全部状态无秘密；旧策略不静默迁移 |
| Prototype 物化 | Markdown 权威与 final 字节一致；候选、偏好、可访问性不降级 |
| Learning 作业和复习 | 原答不可变；无真实延迟不标记 retention_verified |
| Learning C/A | 原始子树、locations 和哈希可恢复；知识综合不同于冷归档 |
| Person 恢复 | 冻结 dossier 不迎合重写；已有答案跳过；保留其他 Work 字段 |
| 上游删除/重命名能力 | 反向引用、索引、YAML 发现、调用适配测试同时验证 |
| 无 trace 的评估命令 | 显示 not-evaluated，不作为行为发布通过 |

### 指标与通过规则

安全/持久化为硬门：全部选定安全回归通过、零越权副作用、零未声明原始工件改写、零 unknown 重放；任何失败阻止发布。
任务完成与路由正确性在固定用例、相同模型/宿主/工具条件下做多次比较，报告样本量和失败样本，不能凭一次运行给总体可靠性结论。
效率指标包括首个有效动作前的去重读取量、无关分支读取数、重复工具调用/确认次数和总上下文。先测 baseline；可将典型路径去重加载量下降 30% 设为首轮试验目标，但不是已测收益，也不是统一强制删减比例。安全性、完成质量或交付数量下降时拒绝该优化。

### 已存在的命令入口

以下为后续在已准备仓库环境中的验证命令，本轮未运行：

```bash
pnpm check
pnpm validate-source-parity
node scripts/generate-specdev-canonical.mjs --check
node scripts/validate-workflow-disclosure.mjs
node scripts/evaluate-scenarios.mjs test/fixtures/scenarios.json <trace.jsonl> <artifact-root>
```

最后一条的两个占位参数必须换成真实隔离运行采集物；不能用手编自评 trace 声称真实宿主行为已认证。`pnpm eval:scenarios` 默认仅做 fixture-ready 检查，结果需按脚本语义解释。各 Work 的 stage、OPS、Learning 与 Person 校验按对应工具当前真实参数调用，不把结构校验等同于业务正确。

## 11. 删除判定规则

允许删除：已迁至明确唯一权威的重复说明；无有效调用方且经动态发现/兼容检查确认不再使用的死引用；有实际对照证明不改变行为的空泛要求；普通环境查一次即可获取且无重要背景解释的重复缓存。

仅允许移出入口：恢复细则、异常处理、安全检查、冷门平台配方、长模板、格式例子。移动后必须保留可触发指针，并验证实际会加载。

默认不删除：审批/身份/写集/锁/秘密/数据保护；历史证据；生成与双边验证副本；用户明确的输出格式、数量和交互偏好；旧兼容路径与键；真实会改变验收和失败处理的规则。

## 12. 资料定位

以下路径可由固定 SHA 获取，用于执行阶段复核。

### Speculo 主要来源（目标 SHA 见第 1 节）

- 四个 workflow 的 README/INDEX 与本表列出的 30 个 `<Work>/<Work>.md` 主入口。
- `template/workflows/specdev/common/rules/activation-and-memory.md`
- `template/workflows/specdev/common/rules/workflow-state-and-lifecycle.md`
- `template/workflows/specdev/common/rules/skill-invocation.md`
- `template/workflows/specdev/I-implement/references/implementation-procedure.md`（关键执行部分）
- `template/workflows/ops/common/rules/workspace-and-authorization.md`
- `template/workflows/ops/common/rules/recovery.md`
- `template/skills/speculo-retro/SKILL.md`
- `package.json`
- `scripts/evaluate-scenarios.mjs`
- `scripts/validate-workflow-disclosure.mjs`
- `scripts/generate-specdev-canonical.mjs`（源映射部分）

### mattpocock/skills 主要来源（参考 SHA 见第 1 节）

- `README.md`
- `CHANGELOG.md`，重点 1.3.0、1.3.1 及调用/发现修复。
- `skills/productivity/writing-for-agents/SKILL.md`
- `skills/engineering/implement-spec/SKILL.md`
- main 最新提交记录。

### 外部规范

- OpenAI Developers：Rethinking skills and prompts for GPT-6 Astra，2026-09-11。
- OpenAI Developers：Testing Agent Skills Systematically with Evals，2026-01-22。
- Agent Skills：Specification，2026-10-06 读取的版本。

这些是设计参考，不取代项目自身的授权、运行时合同和用户要求。实施时记录实际使用的版本/摘要；上游后来变化不自动改写已冻结的 Ticket 或批准。
