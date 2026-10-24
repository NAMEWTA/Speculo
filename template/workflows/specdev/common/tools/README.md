# SpecDev Tools

## 校验一个 change

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage <triage|diagnosis|grill|spec|tickets|goal-plan|implement|learn|delivery|pr-delivery|review|prototype|wayfinder|complete|archive-ready|archived> \
  --repo <project-root> \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

无安装直接 Work 显式传 `--repo <project-root> --method-root <method-package-root> --state-root <shared-state-root>`；state-root 是 SpecDev 根的上级。已有安装仍核验 workspace，显式根不能覆盖其身份。省略 stage 时只验证当前实际工件。

`--stage` 只要求该阶段已经拥有的工件；所有已经存在的工件仍会验证。无独立 Spec/计划的轻量任务读取 README 稳定 scope/acceptance/verification 章节。显式 `lightweight-goal-plan` 由原 Goal 的 Tasks 负责进度；完整 Goal 使用既有 schema，允许合法的 `draft / ready_for_execution: false`，不自动降级轻量。Tickets 阶段可尚无 Goal。完整 Goal 的就绪字段必须是布尔值并与状态对应。

存在 Implementation Map、Implementation Plan 或 goal-tickets-map 入口中的任一项即走父编排校验；缺少另一父工件会报错，不回退单 change，也不额外要求单 change Goal。父编排读取 sibling 成员，创建时要求每个成员已有 Ready Spec/Tickets，继续校验组合 Ticket DAG、唯一父归属、serialization、跨 Ticket 写路径、全局 workspace/实现配额和完成门。已有父 Map/Plan 尚未补建无状态入口时仍可验证。

解析出项目根后，把 Ticket Evidence 中实际 Workspace Execution Record 的 基线、当前分支、固定 commit 或工作副本快照与实际交付范围与真实 Git 仓库交叉验证。没有实际 Git 执行记录时不制造 worktree/领导权骨架；结构通过不等于取得并行排他或写入授权。

校验 workspace 捕获账本（文件必须已存在；缺失时不要为了校验去创建）：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --capture <Path>{roots.state}/specdev/capture.md</Path>
```

## 校验 SpecDev 工作流包

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --self-check
```

工件结构校验只依赖 Speculo 已要求的 Node.js 运行时；YAML 与当前设计 schema 所需代码随包分发，无需项目另装校验依赖。真实 Git 检查、Git review-scope 模式和包 self-check 中的隔离回归另需 Git；source-files 模式不依赖 Git。self-check 会在系统临时目录创建并清理测试仓库，不修改用户项目或 workflow 状态。返回码 `0` 表示没有阻塞性结构错误；warning 仍需人工判断。工具不替代项目测试、事实核验、设计审查或用户批准。

## 从 tickets-map 分析下一轮

```bash
node <Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path> --map <map-file> --repo <project-root>
```

接受普通 tickets-map、父 goal-tickets-map 入口或 Implementation Map。可选 --previous 读取上轮 JSON 输出作漂移检查；该输出应保存到调用方已有 Evidence，不建立第二套权威状态。输出 frontier、blocked、deferred、in_flight、invalidated 与逐票契约摘要。

单 change 的 Goal Ready 不要求所有未来票同时 Ready。合法 draft 票保留缺口与重审条件，只阻塞自身及依赖闭包；`ready/in_progress/review` 却没有 `ready=true` 是逐票错误。frontier 只包含自身 Ready、依赖成功完成、owner/资源/并发条件满足的票；上游 done 不自动修改消费者状态。全局执行门未满足时无可派单票，空 frontier 的 blocked/deferred 说明恢复条件。多 change 父创建的全员 Ready 输入门保持不变。

校验 API 返回同源的 `errors`（展示文本）与 `diagnostics`（稳定结构）。每项 diagnostic 携带 code、scope（global / change / ticket）、必要的 change/ticket 和实际 artifact；owner 在发现错误时确定。<Path>{roots.workflows}/specdev/common/tools/validation-diagnostics.mjs</Path> 负责保留子项归属与分派，controller 不再解析英文前缀或嵌入 JSON。未知 scope、缺失结构或无法定位 owner 的错误按全局阻塞处理，文案翻译不改变 frontier。

只读工具不调用 Skill、不执行实现、不检查真实授权/正式记忆网关，不获取锁或自动解锁；Lead 必须在 dispatch 前完成这些检查。结构错误返回非零；局部错误仍可能带独立 frontier，调用方必须检查节点和全局 diagnostics。结构检查成功的退出码 0 不代表任务完成，且业务门禁可能仍阻塞全部票。eligible_for_final_verification 只表示可进入最终验收，不是 Goal completed。

`<Path>{roots.workflows}/specdev/common/tools/plan-contract.mjs</Path>` 是两个工具共用的只读校验库：新 Ticket 的真实 Skill 名称/摘要、必需调用证据、Map 数量合同、父入口与 W 候选图。普通 --repo 仍支持原 Git 事实验证；存在未完成票的真实项目 Skill 绑定时必须提供项目根。Ticket/Map 必须满足当前 Plan 合同；已完成历史证据不要求当前 Skill 包仍与历史版本相同。

`--stage complete` 与移动前的 `--stage archive-ready` 对实现型终点校验独立审查：实际实现者与 reviewer 身份、两轴原报告、Lead 工具核验、固定范围及权威规格来源必须一致。轻量完成预检只核对 AC/owner，代码交付仍进入完整门；学习、复盘和取消使用各自终点。已归档材料按历史读取，不以当前代码重做旧审查。格式校验不能证明真实 Agent 调用。

## 专业分支与审查固定点

原 change 校验支持 `--engineering performance|documentation|incident`，要求对应原 owner 工件中的标记证据；不传时仍检查已经存在的标记。字段见 <Path>{roots.workflows}/specdev/common/rules/engineering-evidence.md</Path>。历史无标记工件不强制回填，所有路径只读。

`--review-scope --repo <project-root> --mode baseline|range|commit|pr` 是独立只读模式，不选择 change、不加载状态、不访问网络。baseline/pr 使用唯一 merge-base；range 比较两个端点；commit 只比较指定提交与其父，不用当前 HEAD。前三种端点模式传 `--base` 与 `--head`；commit 传 `--commit`，多父提交还须 `--parent`。PR 必须传刚读取的完整 base/head SHA。根提交没有现有 CR 所需的 committed fixed point，明确拒绝，不编造父提交。

输出包含固定 SHA、实际 diff argv、内容摘要、路径和 changes/no-diff；无差异退出 0，但不是审查 approved。无效引用、歧义 merge-base、缺参数、重复参数或外部工具失败返回非零。差异不执行外部 diff/textconv，受限输出不会泄漏全日志。

`--review-scope --repo <project-root> --mode source-files --file <relative-path>` 可重复 `--file`，仅冻结指定实际文件的原始内容摘要和字面路径；不创建 change、不初始化 workspace、不假造 commit/base。越界、链接、重复路径、未知参数和混入 Git 比较参数均拒绝。source snapshot 仍须由 C 执行规范与质量审查，不能当作自动批准。

包级 self-check 同时执行内置工程合同回归测试；测试用临时目录和真实 Git fixture，既验证合法输入，也从本顶层入口证明非法记录被拒绝。测试不调用远程、不接管状态、不认证真实模型遵从。

## 设计工件与归档

UI 原型阶段用 --stage prototype --prototype-id UI-NNN；逻辑原型可指定 LOGIC-NNN。多个包并存不能以旧 ready 替代本次对象。下游按 change DESIGN 的 prototype_ref 定位当前包，其余历史包保持原字节。

<Path>{roots.workflows}/specdev/common/tools/design-artifacts.mjs</Path> 提供 --project、--change、--handoff、--archived 只读校验，以及 --digest 和 --prototype-digest 摘要计算。规范摘要排除确认回执和工作流时间戳，运行资源必须位于当前包的 final/comparison 内。浏览器证据必须覆盖每个候选和最终入口的 390px/1440px 实际运行；结构测试不会认证截图来源或审美质量。

永久写入只通过 <Path>{roots.workflows}/specdev/common/tools/publish-design.mjs</Path> 及 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/design-knowledge-gateway.md</Path>：先形成具体 dry-run 计划，绑定明确批准与当前摘要，再 apply 并回读；失败按返回检查点恢复。

本地完成使用 `--stage complete`；移动前使用 `--stage archive-ready`，额外核验本次实际请求的外部交付。A 完成现役维护后最后无覆盖移动，再以 `--stage archived` 核验唯一目标与原回执；`moved` 结果明确尚未封存，原 A8 回执完成后用 `--stage archived --sealed` 验证。回执导航与完整移动清单依 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/archive-receipt-contract.md</Path>，不能创建第二份报告。

已完成/已归档包不自动重写。当前工具只接受现行 Markdown 归档与 UI schema v3，不读取旧 status 或升级旧 UI 包；schema、摘要和批准必须对应实际产物，不能仅修改版本或 ready 标记。

## 未提交交付的只读审查范围

`--review-scope --repo <project-root> --mode working-tree --base <baseline-sha> [--file <relative-path> ...]` 固定真实 Git 根的工作副本。无 file 参数覆盖全部相对基线的变化和非忽略新增；显式 file 包含删除路径，排除项返回供 Lead 核对。输出保留已暂存/未暂存状态、实际内容摘要、类型、模式、链接、基线和观察到的 HEAD，不写项目文件、commit 或 index。

新增文件必须按 working_snapshot 阅读，不能只看 tracked_diff_command。子模块、冲突 index、越界或目录链接保持未验证。停止 writer 后固定输入，结束与完成前重验；显式范围外新增报告不使代码摘要自引用，遗漏实现仍由 Lead 的完整范围审计阻塞。详见 <Path>{roots.workflows}/specdev/common/skills/code-review/references/working-tree-review.md</Path> 与 <Path>{roots.workflows}/specdev/common/skills/code-review/references/review-evidence.md</Path>。

## 票据调度与 change 工作区

Goal schema v8、父 Implementation Plan v3 使用 ticket_execution: auto|serial|parallel 和可选 max_parallel_tickets。ticket-control 输出 schema_version:2，返回 ticket_execution/max_parallel_tickets；取消由 current 推导 implementation_limit 的旧接口。人数限制仍由 Lead 按真实工具状态独立执行，不从票数或历史实现者名单推断。

实际执行的 README Execution Context v1 是唯一工作区事实，原 Ticket/Direct Spec 的 Workspace Execution Record v1 引用它。相关格式见 <Path>{roots.workflows}/specdev/common/schemas/execution-context.schema.json</Path>、<Path>{roots.workflows}/specdev/common/schemas/execution-record.schema.json</Path>；校验器只读核对 Git、固定审查输入、AC 与验证，不创建 worktree/Agent 或授予权限。无 Goal 的合法 Map 仍可分析，默认 auto；运行前 Lead 核对真实授权。未知版本和混合协议拒绝继续，原件不改写；不提供旧 source/candidate 执行协议或转换接口。

## 独立开发复盘

<Path>{roots.workflows}/specdev/common/tools/validate-retro.mjs</Path> 只读枚举/校验独立 RETRO、升级方案、批准、实际执行与归档完整性；使用 `--help` 查看 report/upgrade 和各 stage。数据根使用 WorkContext 的领域共同父根。协议见 <Path>{roots.workflows}/specdev/specdev-r-retro/references/records.md</Path>；工具不写 Skill、不执行验证命令、不认证授权或宿主行为。

## 派遣交接与可选会话定位

实际交接只使用共享 TASK v2 与 <Path>{roots.references}/coordination/scripts/validate-dispatch.mjs</Path>；原输入、返回与会话 locator 格式见 <Path>{roots.references}/coordination/session-files.md</Path>。

没有准确日志地址就不创建定位文件，缺失时正常通过；已有文件仅含非空绝对路径 path，须符合 <Path>{roots.references}/coordination/session-locator.schema.json</Path>。不扫描工具缓存、不读取外部历史，不认证 provider 身份、授权或完成。结构错误退出 1，参数错误退出 2。存量交接按原合同回收，归档用原完整性清单，不强制补新版字段。

## 交付与会话来源

Triage 的 `--stage triage` 核验 intake v3；Delivery 的 `--stage delivery` 核验独立交付记录与 publish v2，PR 仍使用 pr-delivery。独立 CI/发布记录使用 `--delivery-run <DEL-NNN.md>`，不创建 change。发布状态只有一个账本权威，归档同时核对未闭合动作；旧版本明确报错，原件保持不变。

会话来源只读工具 <Path>{roots.workflows}/specdev/specdev-r-retro/scripts/session-evidence.mjs</Path> 的定位、有限区间读取与截止点使用见 <Path>{roots.workflows}/specdev/specdev-r-retro/references/session-provenance.md</Path>。报告校验不自动扫描本机会话，真实日志仅按显式根和会话 ID 回读。
