# SpecDev 运行合同

只在用户明确激活当前 Work 后读取；当前入口已明确时不重入领域 Skill，也不先执行初始化。项目与必要资源明确即可直接使用，无需 Speculo CLI 或安装元数据。

## 启动顺序

1. 明确项目根、方法资源根与获批业务数据根。已有安装时验证真实 workspace 与 roots；没有安装时使用明确根参数，方法资源可以只读。相对参数基于项目根，cwd 只作线索；不静默切换项目。根冲突、越界链接或重叠安装事务仅阻塞依赖该根的写入。详见 <Path>{roots.workflows}/specdev/common/rules/path-reference-contract.md</Path>。
2. 读取当前请求和所选 Work；按 <Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path> 检索相关知识 ID/关键词，再回读少量原文与 provenance。没有相关知识不要求先初始化知识目录。
3. 有 change 时定位用户指定对象或唯一合法候选，读取 README 的唯一 Outcome、当前负责工件和接续点。只枚举 changes 直接子目录，排除 archive；多个候选真实消歧。L 学习按其保存合同使用指定/同轮续学对象，独立请求未指定时新建学习 change，不自动接入其他活动对象。只读代码/架构审查、知识审计、capture 和初始化不强造 change。
4. 按实际分支读取必要参考。创建、恢复、完成、取消或归档时读取 <Path>{roots.workflows}/specdev/common/rules/workflow-state-and-lifecycle.md</Path>；轻量/完整输入或事实冲突读取 <Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>；实际交接、并行、父子集成才加载 <Path>{roots.workflows}/specdev/common/rules/operating-governance.md</Path> 和 <Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path>。
5. 写前核对路径、原 owner、实际写入者、相关 pending transaction、lock 和 recovery evidence。失败/阻塞记录在原 README、计划、Evidence 或操作回执；真实交接只更新原负责位置。完成产物、适用验证并回读，返回证据和下一入口。

新普通流程不读写全局 status、change status 或 Work 调用镜像。发现旧活动协议、混合权威或转换 pending 标记时停止受影响写入，保留原件并交显式转换；README 存在不证明转换已完成。旧归档仅走独立历史只读定位。

## 工件与能力

小请求使用 README 中等价范围、AC 与验证；用户明确要求 Spec/Ticket/Goal 时交付指定工件。复杂需求可经 W → G → S → T → P → I 逐步形成合同，不要求全部 Work 串行必跑。Ticket frontmatter 拥有本票状态、依赖、写集与 Skill binding；有票的 Map/Goal 只管导航、依赖、Gate、集成和恢复，无票 Goal 由计划清单负责进度。整体结论只在 README，归档事实只在目录位置与回执。

真实使用的 Spec/Ticket/Map/Goal、DESIGN、调查、远程账本 schema 与验证继续有效。票据调度、Agent 编排与 change 工作区按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 独立确定：默认 auto 和复用 current；并发票数不等于实现者人数。已有 config 的明确限制按原义执行，不为默认值创建配置。GitHub labels 等只在对应分支读取，未知配置保留。

UI 候选缺省 3 个，配置范围 2–4；用户明确数量覆盖默认及上限。W 每会话最多完成一张调查票。专业分支保留：R performance 先测量，D evidence-triage 不以观察冒充根因，I documentation 在原授权范围维护当前工程事实。

## 写入边界

实现只写获批项目路径；Work 不写 CLI-owned back/install/managed/baselines，不要求创建空 namespace。ADR/context 的提升、纠错、替代和清理由 A 原网关处理，research/非标准 store 只有声明的 owner 才可写。DESIGN 首次 approved-intent 和后续 promotion 都由 A 专用网关发布；P 嵌入调用保持原 owner，不启动归档。详见 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path>。

提交、推送、合并/父分支更新、来源 branch/worktree 清理、发布、部署、远程写入、归档移动、永久知识改写和不可逆迁移仍由 owning 入口核对具体授权。同一目标/动作/范围批准复用；新增副作用、范围或漂移才补充确认。文本、Outcome 和 owner 字符串都不能创造授权。

只阻塞重叠写集及依赖分支，继续独立已授权工作。普通多文件修改没有整体原子保证；恢复先检查已落地结果，不能因报告缺失重复操作。同次任务已加载且未变化的规则可复用。

## 验证与路由

按当前分支运行 <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> 的适用 stage；传明确项目/方法/数据根，不用 CLI 包装器作为普通 Work 前置。prototype 传具体 UI-NNN/LOGIC-NNN；完成/取消按 <Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path> 核验真实证据，票全 done 不替代整体验收。归档后以实际目标运行 archived 验证。

场景出口见 <Path>{roots.workflows}/specdev/common/rules/workflow-routing.md</Path>。T 的 capture、publish、PR 和独立 TRI 各有原账本 owner；未请求远程动作不创建空账本或新完成门。completed/cancelled 不自动授权外部动作，已承诺而未结束的外部交付仍阻塞封存。开发复盘独立保存在 <Path>{roots.state}/specdev/retro/{retro}/RETRO.md</Path>（retro 为日期主题 ID），不创建/重开来源 change；升级与归档按 R 的独立工件合同。
