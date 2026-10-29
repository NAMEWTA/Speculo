# 票据调度、Agent 编排与 change 工作区

I 开始实现、P 安排执行和 dev-worktree 创建/恢复时读取。三项决定分别记录，互不推导。工具选择和任务交接读取 <Path>{roots.references}/coordination/coordination-contract.md</Path>。

## 输入和选择

- 获批完整 Spec 可直接进入 I；`ready_for_tickets: true` 表示规格就绪，不强制拆票。README 替代独立 Spec 仍限原轻量边界；明确要求的 Spec/Ticket/Goal 必须交付。
- 需要独立调度、DAG 或逐票追踪时使用 T；跨任务 Gate、跨 change 或明确总控请求进入 P。已有活动责任不能通过改称 Direct Spec 绕过，先由原 owner 处置原记录。
- 票据调度 `ticket_execution: auto | serial | parallel`：默认 auto，由 Agent 按 DAG、写集、语义资源、用户/项目要求和实际能力决定。serial 完成当前票的实现、适用双轴审查和验证后再开始下一票；parallel 允许同时推进独立票，但不强制派遣或绕过前置门。
- `max_parallel_tickets` 仅在实际要求上限时记录，计量 in_progress/review 票据，不计 Agent。父计划、子计划及 change 约束取共同上限，serial 为一票。没有显式上限时不填固定数字，不创建 config。
- Agent 编排按用户、项目初始化选择和当前 Work/Skill 的要求决定。Ticket 按可独立验收的行为切片拆分；派遣通道、执行者分配和票据串并行分别决定。指定通道不隐含一票一个 Agent；同一个 Lead 或受派 Agent 可连续执行多票，一张票也可由多人协作。Lead 按上下文连续性、依赖、并行收益和恢复需要选择复用或新派，遵守明确的执行者安排与独立审查要求。复用执行者仍须逐票核对 Ready、授权、依赖并保留各票 Evidence 与验收，不合并票据状态或越过 Gate。`concurrent_implementation_limit` 和现有 config 的 `max_concurrent_implementations` 仅约束实际实现者人数，显式存在才生效；不能用票据数量代替人数或反向推导。宿主限制仍须遵守。Lead 从真实工具状态核对活动人数，历史 implementation_owners 名单不代表当前全部在写，静态校验不能认证运行期人数。
- 未指定工作区时复用 current，不询问默认选择。用户已选的 workspace/branch 持续有效。父计划引用成员选择，不重新安排其工作区。

## 工作区与写入

一个 change 使用一个选定工作区，所有 Ticket、Direct Spec、协作者、修复和验证都在这里完成。`workspace_policy: current` 可为 main、普通分支或已在使用的 worktree；`worktree` 表示本 change 明确选择的独立 checkout。需要新建时调用 <Path>{roots.workflows}/specdev/common/skills/dev-worktree/SKILL.md</Path>，默认 locator 为 `specdev-worktree/<change>`，branch 为 `speculo/<change>`。按实际用户选择复用已有工作区。

串并行、Agent 数量、重试、review 均不新增工作区。额外 worktree 或扩大分支范围必须另有具体授权，不从创建一个 change worktree 的要求继承。

同一工作区可由多个实现者写互不冲突的授权路径。共享路径、API、迁移序列、端口、数据库、生成输出须明确唯一 owner 或串行阶段；worktree 不提供锁或沙箱。Git index、commit、checkout、merge 和改变公共依赖的操作由 Lead 协调串行，任何执行者都不能暂存他人改动。审查和整体测试使用固定输入，冻结前协调相关 writer 停止写入；未知运行状态先查询，不以无报告/超时推断结束。

## 唯一记录与完成

实际执行开始时，Lead 在 change README 的 `Execution Context` 锚点保存一次工作区事实、基线、owner 和无计划时的调度选择。完整计划拥有票据策略，README 只保留该 change 的实际上下文；工作区只有 README 一个事实源。格式和恢复检查见 <Path>{roots.workflows}/specdev/common/skills/dev-worktree/references/create.md</Path>，current 同样使用该记录而不调用创建操作。纯只读不造执行记录；既有无票 current 证据可按原快照合同读取。

每票原 Evidence 保存自己的 `Workspace Execution Record`，引用 `<Path>{roots.state}/specdev/changes/{change}/README.md</Path>` 的 execution-context 锚点，只记录实际实现者、checkpoint、验证与失败次数；Direct Spec 使用原 evidence/direct-spec.md，不造 Ticket/Map/Goal。使用 <Path>{roots.workflows}/specdev/specdev-i-implement/assets/evidence-template.md</Path>。Lead 是正式状态/Evidence owner，implementation_owners 可有多人。

完成以真实改动、AC、风险适配双轴审查和适用验证为准。未授权提交时使用固定工作副本快照；不要求 empty commit、每票 commit、父分支 result 或额外 candidate checkout。明确承诺的提交、合并、发布等仍按原目标与授权执行；完成声明不得冒充这些动作已发生。整体完成仍按 <Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>。

验证尝试上限来自有效计划、change 上下文或项目约定，缺省 3，已有 config 的更严格上限继续生效。重复同一 blocker 无新证据或达到上限时，Lead 保留历史并形成实质变化后才能重试；仅换 Agent 不构成恢复。

## 恢复和版本边界

恢复重读 README、原计划、Ticket/Evidence、实际 writer、Git branch/base 和工作区；冲突只暂停受影响分支。取消和归档不删除工作区或未决事实，writer 停止仍需真实证据。

执行工具只接受当前 Execution Context / Workspace Execution Record v1 与 Goal v8、父 Plan v3；未知版本、旧 source/candidate 字段和混合协议直接拒绝。拒绝不改写原 Evidence、不转换或删除工作区。原 owner 仍须核对实际 writer、代码与未决动作，不能把无法读取的旧协议解释成已停止或已完成。

