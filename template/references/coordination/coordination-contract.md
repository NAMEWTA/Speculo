# 主 Agent 自主协调合同

所有 workflow、Command 与宿主共用本合同。Lead 是连续负责目标、权限、验收与恢复的主 Agent，不是一个必须另建的角色或常驻服务。主 Agent 或同一个受派 Agent 均可连续完成多个 Work/Ticket；工作切分、执行者分配、工作区数量、工具通道分别决定，Ticket 边界不要求新建 Agent 或会话。

## 何时读取

主 Agent 判断存在独立上下文收益、真实并行工作收益、不同工具能力或独立验证需要，或用户明确要求委派时读取。先考虑直接执行与并行普通工具，不能因 Ticket 数量、某个 Skill 或任务可并行就创建 Agent Team。普通任务不触发初始化、外部工具扫描或 session/Ticket/Goal/worktree 创建。plan 只形成安排，不派遣。

## 决策与责任

1. 明确目标、已授权范围、实际依赖、成功与停止条件。判断当前任务应直接完成、并行调用普通工具、委派一个执行者还是多个独立执行者；只有委派有具体收益或明确要求时才进入通道选择。不新增 Router Agent。
2. 从真实可用且已获允许的宿主原生协作、Shell CLI、Orca、Herdr 中选择，说明任务相关理由。需要持续依赖图、跨会话恢复、多个写入 owner、共享资源或跨任务 Gate 时才使用完整 Goal；短小只读并行不自动升级。
3. 按 <Path>{roots.references}/coordination/task-brief.md</Path> 指明输入、基线、写集、owner、验收和返回方式；按 <Path>{roots.references}/coordination/session-files.md</Path> 选择即时返回或持久交接。实际需要某通道时才懒检查指南、CLI、版本、登录、会话与能力。
4. 通过真实原生句柄接收结果，按 <Path>{roots.references}/coordination/result-and-recovery.md</Path> 核实实际产物与原验收；执行者报告不是通过证书。原 Ticket/Goal/Evidence/README 与领域 owner 仍是唯一业务权威。
5. 连续推进前置满足且已授权的后续工作；同范围修复不逐次问“继续”。用户要求 handoff 时才读取 <Path>{roots.references}/handoff/handoff-contract.md</Path>；完成一轮不自动转移 Lead。

## 通道与约束优先级

- 本次明确要求优先；其次是已批准阶段安排，再是项目 Work＋阶段规则、Work 规则与 defaults。required 选择必须遵守，不能以“自主”为由换路。请求或已批准安排未明确 selection: preferred 时按 required 处理，不继承低优先级 fallback；未写 preferred 却同时给 fallback 作为冲突停止。
- 保存偏好可来自 <Path>{roots.state}/coordination/project.json</Path>；没有文件照常执行，不补建配置。有效的软默认不是必须派遣的命令，主 Agent 可基于当次任务理由选择另一获准通道；不能覆盖本次用户要求、已批准安排或 required。
- 可选 `allowed_modes` 只限制项目可选通道，不授予权限。配置中的 tool/model/guide/interaction 是事实与偏好，不证明工具已安装、已登录或已获付费、远程写入、发送代码权限。
- `mode: host` 可表示主 Agent 正常执行或已决定的宿主原生委派；只有后者才检查真实 subagent 能力。当前宿主是 CLI，不意味着要二次启动同家 CLI。`mode: cli` 是直接调用所选实际 AI CLI，不要求 Herdr/Orca。
- 具体工具、模型和 `interaction: headless | interactive` 由要求、现有事实和当前接口决定。只有缺失决定影响目标或授权且不能从上下文确定时才询问。不同模式/工具之间不继承私有参数、指南或模型字段。
- 同级冲突、无效配置与未知 Work/阶段只阻塞受影响选择。项目 schema v2 由 <Path>{roots.references}/coordination/project-facts.schema.json</Path> 定义；旧配置保留原件，不能自动覆盖用户数据。

## 仅展开选中的方式

| 通道 | 何时与如何读取 |
|---|---|
| 宿主原生 | 确有委派收益且宿主真实提供工具时，读取其实际工具合同；不固定 team 拓扑 |
| CLI | 选中直接 Shell CLI 调用后读 <Path>{roots.references}/coordination/modes/cli.md</Path> |
| Orca | 需要其实际会话/受监督协调能力后读 <Path>{roots.references}/coordination/modes/orca.md</Path> |
| Herdr | 需要其实际终端/会话控制能力后读 <Path>{roots.references}/coordination/modes/herdr.md</Path> |

模式选择不隐含模型、人数、worktree、会话数或安装动作。每次只读取所需分支及当前工具帮助，不预先启动所有服务。Worker 不默认递归派单；确需跨级委派时，原 owner 必须明确能力、预算、权限、写集和最终责任。

## 不可用与恢复

preferred 选择仅能沿其允许的 fallback 回退，同时满足当次授权和项目限制；缺 fallback 不补造。初始化可保存 preferred 与 fallback: [host]，工具不可用时据实说明后由主 Agent 继续，不自动建立原生 team、不改保存偏好。required 不可用只阻塞相关阶段，不能静默换路。

不擅自安装二进制、登录、更换账户、启动/重启服务、增加权限或付费。不得通用附加绕过审批/沙箱的 CLI 参数。已派发而结果未知时，先查询原调用与实际副作用，确认 writer 已停写，才能安全接续；回退不是重复执行许可。

必要独立审核、路径安全、用户约束、整体 AC/E2E 与质量门不因回退降低；风险及审查执行者由当前 Work 的适用合同决定，缺必要独立资格只阻塞相关验收。

## 工作区与状态 owner

Worker 可直接写入明确分配的计划、票据、说明、代码等候选；正式状态、审批、Evidence、集成及领域事务由原 owner/gateway 核验后维护。分配工作不转移权限。

不相交写集且语义资源无冲突可在 current 工作区并行；共享路径同一时刻单 owner。Git index、提交、checkout/merge 和全局验证单独协调，不暂存别人改动。review 使用冻结输入并确认相关 writer 停写；输入变化只重验受影响证据。review/research/test-observation 默认只读业务文件，允许报告与获准测试产物。

worktree 只是工作副本，不是沙箱。Speculo 不建立 Run/Worker Registry、常驻调度器、队列、事件 journal 或第二套状态。已有计划记回原计划，无计划以当前请求与实际输入为依据。无持续恢复需要的主 Agent 自行执行和普通工具并行不生成交接目录。

## 返回与连续推进

即时只读返回以实际 call/task 对应的结构化结果核验；长时、异步、跨会话、并行写入、可恢复或正式交付使用冻结 TASK/REPORT。准确的会话日志路径可以写成 REPORT 的可选 `Session log` 行。交接材料不是业务完成状态。external-web 的传输包传完即删除，不进入交接目录；远程 CI 沿其原合同。

实际产物和可回读证据支持通过，idle、退出码、报告 completed 不等于业务完成。局部阻塞只暂停冲突及依赖闭包。同一 blocker 没有新证据或实质改变时停止反复派单；换 Agent、重开会话不绕过停止门。用户撤销权限立即停止新动作并按当前工具处理进行中任务。宿主结束后可从原工件恢复，不承诺无限后台运行。未授权的提交、发布、部署、清理与永久知识写入继续由原 owner 取得授权。
